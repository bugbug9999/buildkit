import { apiFetch, parseOrThrow } from './api';

export interface UserProfile {
  userId: string;
  weightKg: number | null;
  glp1Drug: string;
  glp1StartDate: string | null;
  subscriptionTier: 'free' | 'premium';
  premiumExpiredAt: string | null;
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await apiFetch('/health-api/api/user/profile');
  return parseOrThrow<UserProfile>(res, 'fetch user profile failed');
}

export async function patchUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const res = await apiFetch('/health-api/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return parseOrThrow<UserProfile>(res, 'patch user profile failed');
}
