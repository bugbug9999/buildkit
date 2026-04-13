import { apiFetch, parseOrThrow } from './api';

export interface MealLogData {
  id: string;
  userId: string;
  loggedAt: string;
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  imageUrl?: string;
  isManuallyEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMealLogInput {
  loggedAt: string;
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  imageUrl?: string;
}

export interface UpdateMealLogInput {
  foodName?: string;
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  isManuallyEdited?: boolean;
}

export interface AnalyzeResult {
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
  quotaRemaining: number;
}

export async function fetchMealLogs(date: string): Promise<MealLogData[]> {
  const res = await apiFetch(`/health-api/api/meal/logs?date=${date}`);
  return parseOrThrow<MealLogData[]>(res, 'fetch meal logs failed');
}

export async function createMealLog(input: CreateMealLogInput): Promise<MealLogData> {
  const res = await apiFetch('/health-api/api/meal/logs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseOrThrow<MealLogData>(res, 'create meal log failed');
}

export async function updateMealLog(id: string, input: UpdateMealLogInput): Promise<MealLogData> {
  const res = await apiFetch(`/health-api/api/meal/logs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return parseOrThrow<MealLogData>(res, 'update meal log failed');
}

export async function deleteMealLog(id: string): Promise<void> {
  const res = await apiFetch(`/health-api/api/meal/logs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('delete meal log failed');
}

export async function getAnalyzeUploadUrl(extension: string): Promise<{ uploadUrl: string; fileUrl: string }> {
  const res = await apiFetch(`/health-api/api/meal/analyze-upload-url?extension=${extension}`);
  return parseOrThrow<{ uploadUrl: string; fileUrl: string }>(res, 'get upload url failed');
}

export async function analyzeMealImage(imageUrl: string): Promise<AnalyzeResult> {
  const res = await apiFetch('/health-api/api/meal/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageUrl }),
  });
  return parseOrThrow<AnalyzeResult>(res, 'analyze meal failed');
}
