import { create } from 'zustand';
import { get as storageGet, set as storageSet } from '../lib/storage';

export interface OnboardingData {
  glp1Drug: string;
  glp1StartDate: string;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
}

interface UIState {
  token: string | null;
  selectedDate: string;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  goalCalories: number;
  goalCarbs: number;
  goalProtein: number;
  goalFat: number;
  onboardingDone: boolean;
  glp1Drug: string;
  glp1StartDate: string;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  setToken: (token: string | null) => void;
  setSelectedDate: (date: string) => void;
  setLoading: (v: boolean) => void;
  setOffline: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setTheme: (t: 'light' | 'dark') => void;
  setGoals: (goals: { calories?: number; carbs?: number; protein?: number; fat?: number }) => void;
  completeOnboarding: (data: OnboardingData) => void;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useUIStore = create<UIState>((set, get) => ({
  token: storageGet<string>('token'),
  selectedDate: todayKey(),
  isLoading: false,
  isOffline: false,
  error: null,
  theme: storageGet<'light' | 'dark'>('theme') ?? 'light',
  goalCalories: storageGet<number>('goal-calories') ?? 2000,
  goalCarbs: storageGet<number>('goal-carbs') ?? 250,
  goalProtein: storageGet<number>('goal-protein') ?? 120,
  goalFat: storageGet<number>('goal-fat') ?? 65,
  onboardingDone: storageGet<boolean>('onboarding-done') ?? false,
  glp1Drug: storageGet<string>('glp1-drug') ?? 'other',
  glp1StartDate: storageGet<string>('glp1-start-date') ?? '',
  weightKg: storageGet<number>('weight-kg') ?? 0,
  heightCm: storageGet<number>('height-cm') ?? 0,
  age: storageGet<number>('age') ?? 0,
  sex: (storageGet<string>('sex') as 'male' | 'female') ?? 'female',

  setToken: (token) => {
    set({ token });
    storageSet('token', token);
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  setLoading: (v) => set({ isLoading: v }),

  setOffline: (v) => set({ isOffline: v }),

  setError: (msg) => set({ error: msg }),

  setTheme: (t) => {
    set({ theme: t });
    storageSet('theme', t);
  },

  setGoals: ({ calories, carbs, protein, fat }) => {
    set((s) => {
      const next = {
        goalCalories: calories ?? s.goalCalories,
        goalCarbs: carbs ?? s.goalCarbs,
        goalProtein: protein ?? s.goalProtein,
        goalFat: fat ?? s.goalFat,
      };
      if (calories !== undefined) storageSet('goal-calories', next.goalCalories);
      if (carbs !== undefined) storageSet('goal-carbs', next.goalCarbs);
      if (protein !== undefined) storageSet('goal-protein', next.goalProtein);
      if (fat !== undefined) storageSet('goal-fat', next.goalFat);
      return next;
    });
  },

  completeOnboarding: (data) => {
    storageSet('onboarding-done', true);
    storageSet('glp1-drug', data.glp1Drug);
    storageSet('glp1-start-date', data.glp1StartDate);
    storageSet('weight-kg', data.weightKg);
    storageSet('height-cm', data.heightCm);
    storageSet('age', data.age);
    storageSet('sex', data.sex);
    storageSet('goal-calories', data.goalCalories);
    storageSet('goal-protein', data.goalProtein);
    storageSet('goal-carbs', data.goalCarbs);
    storageSet('goal-fat', data.goalFat);

    get().setGoals({
      calories: data.goalCalories,
      carbs: data.goalCarbs,
      protein: data.goalProtein,
      fat: data.goalFat,
    });

    set({
      onboardingDone: true,
      glp1Drug: data.glp1Drug,
      glp1StartDate: data.glp1StartDate,
      weightKg: data.weightKg,
      heightCm: data.heightCm,
      age: data.age,
      sex: data.sex,
      goalCalories: data.goalCalories,
      goalProtein: data.goalProtein,
      goalCarbs: data.goalCarbs,
      goalFat: data.goalFat,
    });
  },
}));
