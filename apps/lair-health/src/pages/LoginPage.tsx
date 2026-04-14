import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://dev-api.lair.fi';

const pageStyle: CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
  backgroundColor: '#F8FAFC',
  fontFamily: '"Noto Sans KR", sans-serif',
  color: '#0F172A',
  boxSizing: 'border-box',
};

const containerStyle: CSSProperties = {
  width: '100%',
  maxWidth: 380,
  display: 'grid',
  gap: 16,
};

const buttonBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  minHeight: 52,
  border: 'none',
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};

interface SocialLoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email?: string };
  };
}

type Provider = 'kakao' | 'apple' | 'google';

export default function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const setToken = useUIStore((state) => state.setToken);
  const completeOnboarding = useUIStore((state) => state.completeOnboarding);
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSocialLogin(provider: Provider): Promise<void> {
    setLoadingProvider(provider);
    setError(null);

    try {
      // TODO: 실제 OAuth flow 구현 시 accessToken을 OAuth redirect에서 획득
      // 현재는 dev mock 토큰 사용 (백엔드 NODE_ENV=development일 때 동작)
      const response = await fetch(`${BASE}/health-api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          accessToken: `mock-${provider}-token`,
          externalIdHint: `${provider}-user-1`,
          emailHint: `user@${provider}.test`,
        }),
      });

      if (!response.ok) {
        throw new Error('로그인에 실패했습니다.');
      }

      const body = (await response.json()) as SocialLoginResponse;
      localStorage.setItem('lair-health:token', JSON.stringify(body.data.accessToken));
      localStorage.setItem('lair-health:refresh-token', body.data.refreshToken);
      localStorage.setItem('lair-health:user-id', body.data.user.id);

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: '#10B981',
              color: '#fff',
              fontSize: 28,
              fontWeight: 900,
              marginBottom: 16,
            }}
          >
            LH
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Lair Health</h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: '#64748B', lineHeight: 1.6 }}>
            GLP-1 사용자를 위한 건강관리
          </p>
        </div>

        {error ? (
          <p style={{ margin: 0, padding: '12px 16px', borderRadius: 12, backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: 14 }}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loadingProvider !== null}
          style={{ ...buttonBase, backgroundColor: '#FEE500', color: '#000' }}
          onClick={() => { void handleSocialLogin('kakao'); }}
        >
          {loadingProvider === 'kakao' ? '로그인 중...' : '카카오로 시작하기'}
        </button>

        <button
          type="button"
          disabled={loadingProvider !== null}
          style={{ ...buttonBase, backgroundColor: '#000', color: '#fff' }}
          onClick={() => { void handleSocialLogin('apple'); }}
        >
          {loadingProvider === 'apple' ? '로그인 중...' : 'Apple로 시작하기'}
        </button>

        <button
          type="button"
          disabled={loadingProvider !== null}
          style={{ ...buttonBase, backgroundColor: '#fff', color: '#333', border: '1px solid #E2E8F0' }}
          onClick={() => { void handleSocialLogin('google'); }}
        >
          {loadingProvider === 'google' ? '로그인 중...' : 'Google로 시작하기'}
        </button>

        {import.meta.env.DEV || import.meta.env.VITE_PLATFORM === 'capacitor' ? (
          <button
            type="button"
            style={{ ...buttonBase, backgroundColor: '#E2E8F0', color: '#475569', fontSize: 13, marginTop: 8 }}
            onClick={() => {
              setToken('mock-dev-token');
              localStorage.setItem('lair-health:refresh-token', 'mock-refresh-token');
              localStorage.setItem('lair-health:user-id', 'dev-user-1');
              completeOnboarding({
                glp1Drug: 'other', glp1StartDate: '', weightKg: 70, heightCm: 170,
                age: 30, sex: 'male', goalCalories: 2000, goalCarbs: 250, goalProtein: 120, goalFat: 65,
              });
              navigate('/');
            }}
          >
            🛠️ 개발자 모드 로그인
          </button>
        ) : null}

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
          레어 미니앱에서 접속 중이신가요?<br />
          미니앱을 이용해 주세요.
        </p>
      </div>
    </main>
  );
}
