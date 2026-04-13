import { create } from 'zustand';
import {
  fetchMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  fetchMedicationLogs,
  upsertMedicationLog,
} from '../services/medicationApi';
import type {
  MedicationData,
  MedicationLogData,
  CreateMedicationInput,
  UpdateMedicationInput,
} from '../services/medicationApi';

interface MedicationState {
  medications: MedicationData[];
  logs: MedicationLogData[];
  loading: boolean;
  error: string | null;
  loadMedications: () => Promise<void>;
  loadLogs: (from: string, to: string) => Promise<void>;
  addMedication: (input: CreateMedicationInput) => Promise<MedicationData>;
  updateMedication: (id: string, input: UpdateMedicationInput) => Promise<MedicationData>;
  removeMedication: (id: string) => Promise<void>;
  upsertLog: (input: { scheduleId: string; scheduledDate: string; status: 'TAKEN' | 'MISSED' }) => Promise<void>;
}

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  logs: [],
  loading: false,
  error: null,

  loadMedications: async () => {
    set({ loading: true, error: null });
    try {
      const medications = await fetchMedications();
      set({ medications, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  loadLogs: async (from, to) => {
    try {
      const logs = await fetchMedicationLogs({ from, to });
      set({ logs });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  addMedication: async (input) => {
    const created = await createMedication(input);
    set((s) => ({ medications: [...s.medications, created] }));
    return created;
  },

  updateMedication: async (id, input) => {
    const updated = await updateMedication(id, input);
    set((s) => ({ medications: s.medications.map((m) => (m.id === id ? updated : m)) }));
    return updated;
  },

  removeMedication: async (id) => {
    await deleteMedication(id);
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }));
  },

  upsertLog: async (input) => {
    const log = await upsertMedicationLog(input);
    set((s) => {
      const exists = s.logs.findIndex(
        (l) => l.scheduleId === input.scheduleId && l.scheduledDate.startsWith(input.scheduledDate)
      );
      if (exists >= 0) {
        const next = [...s.logs];
        next[exists] = log;
        return { logs: next };
      }
      return { logs: [...s.logs, log] };
    });
  },
}));
