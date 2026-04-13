import type { PlatformAuth } from '../types';

const BASE = (import.meta as { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL ?? 'https://dev-api.lair.fi';

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem('lair-health:token');
    return raw ? (JSON.parse(raw) as string) : null;
  } catch {
    return null;
  }
}

interface RefreshResponse {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export class CapacitorAuth implements PlatformAuth {
  async initialize(): Promise<void> {
    /* noop — token already in localStorage */
  }

  getSession(): { userId: string | null; token: string | null; nickname: string | null } {
    const token = getStoredToken();
    const userId = localStorage.getItem('lair-health:user-id');
    const nickname = localStorage.getItem('lair-health:nickname');

    return { userId, token, nickname };
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('lair-health:refresh-token');

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${BASE}/health-api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as RefreshResponse;
      localStorage.setItem('lair-health:token', JSON.stringify(body.data.accessToken));
      localStorage.setItem('lair-health:refresh-token', body.data.refreshToken);
      return body.data.accessToken;
    } catch {
      return null;
    }
  }

  logout(): void {
    const token = getStoredToken();
    const refreshToken = localStorage.getItem('lair-health:refresh-token');

    if (token) {
      void fetch(`${BASE}/health-api/auth/logout`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshToken ?? undefined }),
      });
    }

    localStorage.clear();
    window.location.reload();
  }
}
