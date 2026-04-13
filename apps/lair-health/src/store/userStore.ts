import { create } from 'zustand';
import { set as storageSet } from '../lib/storage';
import { fetchUserProfile, patchUserProfile } from '../services/userApi';
import type { UserProfile } from '../services/userApi';
import { useUIStore } from './uiStore';

export interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
  patchProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}

function syncProfileToUI(profile: UserProfile): void {
  const weightKg = profile.weightKg ?? 0;
  const glp1StartDate = profile.glp1StartDate ?? '';

  useUIStore.getState().setGoals({
    calories: profile.goalCalories,
    protein: profile.goalProtein,
    carbs: profile.goalCarbs,
    fat: profile.goalFat,
  });

  storageSet('weight-kg', weightKg);
  storageSet('glp1-drug', profile.glp1Drug);
  storageSet('glp1-start-date', glp1StartDate);

  useUIStore.setState({
    weightKg,
    glp1Drug: profile.glp1Drug,
    glp1StartDate,
  });
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await fetchUserProfile();
      syncProfileToUI(profile);
      set({ profile, isLoading: false });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  patchProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await patchUserProfile(data);
      syncProfileToUI(profile);
      set({ profile, isLoading: false });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  logout: () => {
    set({ profile: null, isLoading: false, error: null });
    localStorage.clear();
    window.location.reload();
  },
}));
