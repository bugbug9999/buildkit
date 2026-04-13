import { lairClient, isInHostApp } from '../lib/lairClient';
import { useUIStore } from '../store/uiStore';

export function useSession() {
  const storeToken = useUIStore((s) => s.token);
  const initData = lairClient.auth.getInitData();
  return {
    userId: (initData as { userId?: string } | null)?.userId ?? null,
    token: initData?.token ?? storeToken,
    nickname: initData?.nickname ?? null,
    isInHostApp: isInHostApp(),
    platform: initData?.platform ?? null,
  };
}
