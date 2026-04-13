import { create } from 'zustand';
import {
  fetchMealLogs,
  createMealLog,
  deleteMealLog,
} from '../services/mealApi';
import type { MealLogData, CreateMealLogInput } from '../services/mealApi';

interface MealState {
  todayLogs: MealLogData[];
  loading: boolean;
  error: string | null;
  selectedDate: string;
  loadTodayLogs: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  addLog: (input: CreateMealLogInput) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useMealStore = create<MealState>((set, get) => ({
  todayLogs: [],
  loading: false,
  error: null,
  selectedDate: todayKey(),

  loadTodayLogs: async () => {
    set({ loading: true, error: null });
    try {
      const logs = await fetchMealLogs(get().selectedDate);
      set({ todayLogs: logs, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  addLog: async (input) => {
    const log = await createMealLog(input);
    set((s) => ({ todayLogs: [...s.todayLogs, log] }));
  },

  removeLog: async (id) => {
    await deleteMealLog(id);
    set((s) => ({ todayLogs: s.todayLogs.filter((l) => l.id !== id) }));
  },
}));
