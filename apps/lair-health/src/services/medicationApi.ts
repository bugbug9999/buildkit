import { apiFetch, parseOrThrow } from './api';

export { NetworkError } from './api';

const BASE = '/health-api/api';

export interface MedicationScheduleData {
  id: string;
  medicationId: string;
  dayOfWeek: number | null;
  timeSlot: 'MORNING' | 'LUNCH' | 'EVENING' | 'BEDTIME';
  timeDetail: string;
  condition: 'FASTING' | 'BEFORE_MEAL' | 'AFTER_MEAL' | 'ANY';
  isActive: boolean;
  createdAt: string;
}

export interface DosageHistoryData {
  id: string;
  medicationId: string;
  dosage: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface MedicationData {
  id: string;
  userId: string;
  name: string;
  form: 'ORAL' | 'INJECTION' | 'OTHER';
  colorIndex: number;
  memo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schedules: MedicationScheduleData[];
  dosageHistory: DosageHistoryData[];
}

export interface MedicationLogData {
  id: string;
  scheduleId: string;
  userId: string;
  scheduledDate: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED';
  checkedAt: string | null;
  dosageAtTime: string;
  createdAt: string;
  updatedAt: string;
  schedule?: {
    id: string;
    medicationId: string;
    medication?: { id: string };
  };
}

export interface ScheduleInput {
  dayOfWeek?: number | null;
  timeSlot: 'MORNING' | 'LUNCH' | 'EVENING' | 'BEDTIME';
  timeDetail: string;
  condition?: 'FASTING' | 'BEFORE_MEAL' | 'AFTER_MEAL' | 'ANY';
  dosage?: string;
}

export interface CreateMedicationInput {
  name: string;
  form?: 'ORAL' | 'INJECTION' | 'OTHER';
  colorIndex?: number;
  memo?: string;
  schedules: ScheduleInput[];
}

export interface UpdateMedicationInput {
  name?: string;
  form?: 'ORAL' | 'INJECTION' | 'OTHER';
  colorIndex?: number;
  memo?: string;
  schedules?: ScheduleInput[];
}

export interface MedicationSummary {
  total: number;
  taken: number;
  missed: number;
  skipped: number;
  rate: number;
  from: string;
  to: string;
}

export const fetchMedications = async (): Promise<MedicationData[]> => {
  const res = await apiFetch(`${BASE}/medications`);
  return parseOrThrow<MedicationData[]>(res, 'fetch medications failed');
};

export const createMedication = async (input: CreateMedicationInput): Promise<MedicationData> => {
  const res = await apiFetch(`${BASE}/medications`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseOrThrow<MedicationData>(res, 'create medication failed');
};

export const updateMedication = async (id: string, input: UpdateMedicationInput): Promise<MedicationData> => {
  const res = await apiFetch(`${BASE}/medications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return parseOrThrow<MedicationData>(res, 'update medication failed');
};

export const deleteMedication = async (id: string): Promise<void> => {
  const res = await apiFetch(`${BASE}/medications/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error(`delete medication failed (${res.status})`);
  }
};

export const fetchMedicationLogs = async (params: {
  from: string;
  to: string;
}): Promise<MedicationLogData[]> => {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
  }).toString();
  const res = await apiFetch(`${BASE}/medication-logs?${query}`);
  return parseOrThrow<MedicationLogData[]>(res, 'fetch medication logs failed');
};

export const upsertMedicationLog = async (payload: {
  scheduleId: string;
  scheduledDate: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED';
  dosageAtTime?: string;
}): Promise<MedicationLogData> => {
  const res = await apiFetch(`${BASE}/medication-logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseOrThrow<MedicationLogData>(res, 'upsert medication log failed');
};
