import { apiFetch, parseOrThrow } from './api';

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface HeatmapData {
  days: HeatmapDay[];
  totalWeeks: number;
}

export interface WeeklyReport {
  weekStart: string;
  totalLogs: number;
  avgCalories: number;
  avgProtein: number;
  streak: number;
}

export interface ShareCard {
  id: string;
  shareCardUrl: string | null;
  status: 'pending' | 'done' | 'failed';
}

export interface PremiumCheckoutResult {
  tier: string;
  premiumExpiredAt: string | null;
  quotaLimit: number;
}

export interface PremiumCheckoutParams {
  impUid: string;
  amount: number;
  merchantUid: string;
  planDays: number;
}

function buildHeatmapQuery(weeks: number): string {
  return new URLSearchParams({ weeks: String(weeks) }).toString();
}

export async function fetchHeatmap(weeks: number): Promise<HeatmapData> {
  const res = await apiFetch(`/health-api/api/report/heatmap?${buildHeatmapQuery(weeks)}`);
  return parseOrThrow<HeatmapData>(res, 'fetch heatmap failed');
}

export async function fetchWeeklyReport(): Promise<WeeklyReport> {
  const res = await apiFetch('/health-api/api/report/weekly');
  return parseOrThrow<WeeklyReport>(res, 'fetch weekly report failed');
}

export async function generateShareCard(weekStart?: string): Promise<ShareCard> {
  const body = weekStart ? { weekStart } : {};
  const res = await apiFetch('/health-api/api/report/share-card', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseOrThrow<ShareCard>(res, 'generate share card failed');
}

export async function checkoutPremium(
  params: PremiumCheckoutParams,
): Promise<PremiumCheckoutResult> {
  const res = await apiFetch('/health-api/api/payment/checkout', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return parseOrThrow<PremiumCheckoutResult>(res, 'premium checkout failed');
}

export async function fetchLatestShareCard(): Promise<ShareCard | null> {
  const res = await apiFetch('/health-api/api/report/share-card');
  if (res.status === 404) {
    return null;
  }
  return parseOrThrow<ShareCard>(res, 'fetch latest share card failed');
}

export async function fetchLatestCheckout(): Promise<PremiumCheckoutResult | null> {
  const res = await apiFetch('/health-api/api/payment/checkout');
  if (res.status === 404) {
    return null;
  }
  return parseOrThrow<PremiumCheckoutResult>(res, 'fetch latest checkout failed');
}
