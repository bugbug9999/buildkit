import type { PlatformAuth } from '../types';

interface LairInitData {
  userId?: string;
  token?: string;
  nickname?: string;
  theme?: string;
  platform?: string;
}

interface LairAuth {
  getInitData(): LairInitData | null;
  requestTokenRefresh(): Promise<{ token?: string }>;
}

interface LairClient {
  ready(): Promise<void>;
  auth: LairAuth;
}

let client: LairClient | null = null;

async function getLairClient(): Promise<LairClient> {
  if (client) return client;
  const { LairMiniAppClient } = await import('@bug4city/miniapp-sdk');
  client = new LairMiniAppClient() as unknown as LairClient;
  return client;
}

export class MiniappAuth implements PlatformAuth {
  async initialize(): Promise<void> {
    try {
      const c = await getLairClient();
      await c.ready();
    } catch (err) {
      console.error('Failed to initialize Lair mini app client.', err);
    }
  }

  getSession(): { userId: string | null; token: string | null; nickname: string | null } | null {
    if (!client) return null;
    const data = client.auth.getInitData();
    if (!data) return null;
    return {
      userId: data.userId ?? null,
      token: data.token ?? null,
      nickname: data.nickname ?? null,
    };
  }

  async refreshToken(): Promise<string | null> {
    try {
      const c = await getLairClient();
      const result = await c.auth.requestTokenRefresh();
      const token = result.token ?? null;
      if (token) {
        localStorage.setItem('lair-health:token', JSON.stringify(token));
      }
      return token;
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.clear();
    window.location.reload();
  }
}
