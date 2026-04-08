import { getAccessToken } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface FoodItem {
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSize?: string;
  manufacturer?: string;
  externalId?: string;
}

export async function searchFood(query: string): Promise<FoodItem[]> {
  const token = await getAccessToken();
  const res = await fetch(API_BASE_URL + '/api/food/search?q=' + encodeURIComponent(query), {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}
