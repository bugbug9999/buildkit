import { detectPlatform } from './detect';
import type { PlatformAuth, PlatformType } from './types';

export type { PlatformAuth, PlatformType };
export { detectPlatform };

let _auth: PlatformAuth | null = null;
let _platform: PlatformType | null = null;

export function getPlatformType(): PlatformType {
  _platform ??= detectPlatform();
  return _platform;
}

export async function getPlatformAuth(): Promise<PlatformAuth> {
  if (_auth) return _auth;
  const platform = getPlatformType();
  if (platform === 'miniapp') {
    const { MiniappAuth } = await import('./miniapp/auth');
    _auth = new MiniappAuth();
  } else {
    const { CapacitorAuth } = await import('./capacitor/auth');
    _auth = new CapacitorAuth();
  }
  return _auth;
}
