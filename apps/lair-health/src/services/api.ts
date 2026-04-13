import { lairClient } from '../lib/lairClient';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://dev-api.lair.fi';

export class NetworkError extends Error {
  constructor(message = '네트워크 연결을 확인해 주세요.') {
    super(message);
    this.name = 'NetworkError';
  }
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('lair-health:token');
    return raw ? (JSON.parse(raw) as string) : null;
  } catch {
    return null;
  }
}

async function refreshToken(): Promise<string | null> {
  try {
    const result = await lairClient.auth.requestTokenRefresh();
    const token = (result as { token?: string }).token ?? null;
    if (token) {
      localStorage.setItem('lair-health:token', JSON.stringify(token));
    }
    return token;
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        res = await fetch(`${BASE}${path}`, { ...options, headers });
      } catch {
        throw new NetworkError();
      }
    }
  }

  return res;
}

export async function parseOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    let msg = label;
    try {
      const body = await res.json();
      msg = (body as { message?: string }).message ?? label;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const body = await res.json();
  return (body as { data: T }).data;
}
