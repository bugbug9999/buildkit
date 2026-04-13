export type PlatformType = 'miniapp' | 'capacitor' | 'web';

export interface PlatformAuth {
  initialize(): Promise<void>;
  getSession(): { userId: string | null; token: string | null; nickname: string | null } | null;
  refreshToken(): Promise<string | null>;
  logout(): void;
}
