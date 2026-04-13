import { useUIStore } from '../store/uiStore';

export function OfflineBanner() {
  const isOffline = useUIStore((s) => s.isOffline);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#EF4444',
        color: '#FFFFFF',
        textAlign: 'center',
        padding: '12px 16px',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 9999,
        opacity: isOffline ? 1 : 0,
        pointerEvents: isOffline ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      오프라인 상태 — 인터넷 연결을 확인해 주세요
    </div>
  );
}
