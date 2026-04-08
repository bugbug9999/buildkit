import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "./auth";
import type { Glp1OnboardingInput, UserProfile } from "../types/user";
import type {
  AnalyzeUploadUrlResponse,
  CreateMealLogInput,
  DashboardToday,
  FoodSearchResponse,
  MealAnalysisResult,
  MealLog,
  MealLogsResponse,
  RecentFoodsResponse,
  UpdateMealLogInput
} from "../types/meal";
import type {
  HeatmapResponse,
  ShareCardResponse,
  SubscriptionCheckoutInput,
  SubscriptionCheckoutResponse,
  WeeklyReport
} from "../types/report";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export interface SocialAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

type Provider = "apple" | "google" | "kakao";
type MealImageExtension = "jpg" | "jpeg" | "png" | "webp";

interface MealAnalyzeInput {
  imageUrl?: string;
  imageKey?: string;
}

export interface InjectionInput {
  drug: string;
  dose: number;
  site: string;
  date: string;
  memo?: string;
}

export interface InjectionLog extends InjectionInput {
  id: string;
  createdAt: string;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshToken(): Promise<string | null> {
  try {
    const currentRefreshToken = await getRefreshToken();
    if (!currentRefreshToken) return null;

    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken })
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    await saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (err) {
    await clearTokens();
    return null;
  }
}

async function wrappedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getAccessToken();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`
  };

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
      } else {
        return res;
      }
    }

    return new Promise((resolve) => {
      subscribeTokenRefresh(async (token: string) => {
        const retryHeaders = {
          ...options.headers,
          Authorization: `Bearer ${token}`
        };
        resolve(fetch(url, { ...options, headers: retryHeaders }));
      });
    });
  }

  return res;
}

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("access token missing");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    ...(extra ?? {})
  };
}

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${fallbackMessage}: ${res.status} ${body}`);
  }

  return (await res.json()) as T;
}

export async function socialLogin(provider: Provider, token: string): Promise<SocialAuthResponse> {
  const body = provider === "kakao" ? { provider, accessToken: token } : { provider, idToken: token };

  const res = await fetch(`${API_BASE_URL}/auth/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return parseJsonOrThrow<SocialAuthResponse>(res, "social login failed");
}

export async function fetchProfile(): Promise<UserProfile> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/user/profile`);
  return parseJsonOrThrow<UserProfile>(res, "profile fetch failed");
}

export async function updateOnboardingProfile(payload: Glp1OnboardingInput): Promise<UserProfile> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/user/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow<UserProfile>(res, "profile update failed");
}

export async function updateProfile(payload: Partial<Glp1OnboardingInput> & { glp1Drug?: UserProfile["glp1Drug"] }): Promise<UserProfile> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/user/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow<UserProfile>(res, "profile update failed");
}

export async function fetchDashboardToday(): Promise<DashboardToday> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/dashboard/today`);
  return parseJsonOrThrow<DashboardToday>(res, "dashboard fetch failed");
}

export async function getAnalyzeUploadUrl(extension: MealImageExtension): Promise<AnalyzeUploadUrlResponse> {
  const query = new URLSearchParams({ extension }).toString();
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/analyze-upload-url?${query}`);
  return parseJsonOrThrow<AnalyzeUploadUrlResponse>(res, "upload url fetch failed");
}

export async function uploadImageToPresignedUrl(imageUri: string, uploadUrl: string): Promise<void> {
  const imageRes = await fetch(imageUri);
  if (!imageRes.ok) {
    throw new Error(`image read failed: ${imageRes.status}`);
  }

  const blob = await imageRes.blob();
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": blob.type || "application/octet-stream"
    },
    body: blob
  });

  if (!uploadRes.ok) {
    throw new Error(`presigned upload failed: ${uploadRes.status}`);
  }
}

export async function runMealAnalyze(payload: MealAnalyzeInput): Promise<MealAnalysisResult> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow<MealAnalysisResult>(res, "meal analyze failed");
}

export async function createMealLog(payload: CreateMealLogInput): Promise<MealLog> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow<MealLog>(res, "create meal log failed");
}

export async function fetchMealLogs(date: string): Promise<MealLogsResponse> {
  const query = new URLSearchParams({ date }).toString();
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/logs?${query}`);

  return parseJsonOrThrow<MealLogsResponse>(res, "fetch meal logs failed");
}

export async function searchMealFoods(query: string, limit = 10): Promise<FoodSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) }).toString();
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/foods/search?${params}`);
  return parseJsonOrThrow<FoodSearchResponse>(res, "food search failed");
}

export async function fetchRecentMealFoods(limit = 8): Promise<RecentFoodsResponse> {
  const params = new URLSearchParams({ limit: String(limit) }).toString();
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/foods/recent?${params}`);
  return parseJsonOrThrow<RecentFoodsResponse>(res, "recent foods fetch failed");
}

export async function updateMealLog(id: string, payload: UpdateMealLogInput): Promise<MealLog> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/logs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow<MealLog>(res, "update meal log failed");
}

export async function deleteMealLog(id: string): Promise<void> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/meal/logs/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`delete meal log failed: ${res.status} ${body}`);
  }
}

export async function fetchReportHeatmap(weeks = 12): Promise<HeatmapResponse> {
  const query = new URLSearchParams({ weeks: String(weeks) }).toString();
  const res = await wrappedFetch(`${API_BASE_URL}/api/report/heatmap?${query}`);
  return parseJsonOrThrow<HeatmapResponse>(res, "heatmap fetch failed");
}

export async function fetchWeeklyReport(weekStart?: string): Promise<WeeklyReport> {
  const query = new URLSearchParams(weekStart ? { weekStart } : {}).toString();
  const endpoint = query ? `${API_BASE_URL}/api/report/weekly?${query}` : `${API_BASE_URL}/api/report/weekly`;
  const res = await wrappedFetch(endpoint);
  return parseJsonOrThrow<WeeklyReport>(res, "weekly report fetch failed");
}

export async function requestShareCard(weekStart?: string): Promise<ShareCardResponse> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/report/share-card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weekStart ? { weekStart } : {})
  });
  return parseJsonOrThrow<ShareCardResponse>(res, "share card request failed");
}

export async function checkoutPremiumSubscription(
  payload: SubscriptionCheckoutInput
): Promise<SubscriptionCheckoutResponse> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/subscription/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJsonOrThrow<SubscriptionCheckoutResponse>(res, "subscription checkout failed");
}

export async function fetchInjections(): Promise<InjectionLog[]> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/injections`);
  return parseJsonOrThrow<InjectionLog[]>(res, "fetch injections failed");
}

export async function createInjection(payload: InjectionInput): Promise<InjectionLog> {
  const res = await wrappedFetch(`${API_BASE_URL}/api/injection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJsonOrThrow<InjectionLog>(res, "create injection failed");
}
