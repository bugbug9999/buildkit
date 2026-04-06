const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/backend-api';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: { page: number; limit: number; total: number };
  error?: { code: string; message: string };
};

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || 'API 요청에 실패했습니다.');
  }

  return payload;
}

export async function apiGet<T>(path: string) {
  return request<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

export { API_BASE_URL };
