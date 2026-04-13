import { LairMiniAppClient } from '@bug4city/miniapp-sdk';

export const lairClient = new LairMiniAppClient();

export function isInHostApp(): boolean {
  return !!(window as unknown as Record<string, unknown>).ReactNativeWebView;
}
