import { getPlatformType } from '../platform';
import { useUIStore } from '../store/uiStore';

function readStorageValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function useSession() {
  const token = useUIStore((s) => s.token);
  const platform = getPlatformType();

  return {
    token,
    userId: readStorageValue('lair-health:user-id'),
    nickname: readStorageValue('lair-health:nickname'),
    isInHostApp: getPlatformType() !== 'web',
    platform,
  };
}
