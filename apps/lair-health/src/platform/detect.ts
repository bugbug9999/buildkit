import type { PlatformType } from './types';

export function detectPlatform(): PlatformType {
  if (typeof window === 'undefined') {
    return 'web';
  }

  const platformWindow = window as unknown as Record<string, unknown>;

  if (
    platformWindow.Capacitor &&
    typeof (platformWindow.Capacitor as { isNativePlatform?: () => boolean }).isNativePlatform ===
      'function' &&
    (platformWindow.Capacitor as { isNativePlatform: () => boolean }).isNativePlatform()
  ) {
    return 'capacitor';
  }

  if (platformWindow.ReactNativeWebView) {
    return 'miniapp';
  }

  return 'web';
}
