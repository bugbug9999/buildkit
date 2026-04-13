코드를 모두 읽었습니다. 실제 코드 기반으로 상세 설계를 작성합니다.

---

# Lair-Health Capacitor 크로스플랫폼 전환 설계서

## 0. 현황 요약 (코드 기반)

| 파일 | SDK 의존 지점 | 위험도 |
|------|--------------|--------|
| `src/lib/lair-client.ts` | `createLairClient()`, `lair.ready()`, `lair.auth.*`, `lair.navigation.*`, `lair.events.*` | 핵심 |
| `src/hooks/useSession.ts` | `lair.auth.getInitData()` (동기, useState 초기화에서 호출), `lair.events.on('authTokenUpdate')` | 높음 |
| `src/services/api.ts` | `lairClient.auth.getInitData()` (getToken + 401 리프레시), `requireLogin()` | 높음 |
| `src/main.tsx` | `lair.ready()` — Capacitor에서 hang 유발 | 즉시 격리 필요 |

실제 백엔드 auth 엔드포인트: `/health-api/auth/lair-login` (lairMemberId + nickname으로 JWT 발급)

---

## 1. 디렉토리 구조

```
src/
├── platform/
│   ├── index.ts              ← 진입점: detectPlatform() + getPlatformAuth()
│   ├── types.ts              ← PlatformAuth 인터페이스, Session 타입
│   ├── miniapp/
│   │   ├── index.ts          ← MiniappAuth 구현 (기존 lair-client.ts 흡수)
│   │   └── lair-client.ts    ← 기존 src/lib/lair-client.ts 이동
│   ├── capacitor/
│   │   └── index.ts          ← CapacitorAuth 구현 (dynamic import)
│   └── web/
│       └── index.ts          ← WebAuth 구현 (dev/fallback)
├── lib/
│   ├── lair-client.ts        ← DELETED (miniapp/lair-client.ts로 이동)
│   └── storage.ts            ← 유지
├── hooks/
│   └── useSession.ts         ← platformAuth.getSession() 사용으로 교체
├── services/
│   └── api.ts                ← platformAuth.refreshToken() 사용으로 교체
└── main.tsx                  ← platformAuth.initialize() 사용으로 교체
```

---

## 2. `src/platform/types.ts`

```typescript
export type PlatformType = 'miniapp' | 'capacitor' | 'web';

export interface Session {
  isLoggedIn: boolean;
  userId: string | null;
  token: string | null;
  nickname: string | null;
}

export interface PlatformAuth {
  /** 앱 시작 시 1회 호출. miniapp: lair.ready(), capacitor/web: no-op */
  initialize(): Promise<void>;

  /** 저장된 세션 복원. 없으면 null 반환 */
  getSession(): Promise<Session | null>;

  /**
   * 소셜 로그인 시작. miniapp: 불필요(SDK가 자동), capacitor: OAuth redirect
   * @param provider 'kakao' | 'apple' | 'google'
   */
  login(provider: 'kakao' | 'apple' | 'google'): Promise<Session>;

  /** 401 발생 시 토큰 갱신. 실패 시 null 반환 */
  refreshToken(): Promise<string | null>;

  /** 로그아웃. 토큰 삭제 + 필요 시 서버 호출 */
  logout(): Promise<void>;

  /** 플랫폼 종료 처리 (미니앱: closeMiniApp, 앱: 홈으로) */
  close(): void;

  /** authTokenUpdate 등 플랫폼 이벤트 구독 */
  onAuthUpdate(cb: (session: Session) => void): () => void;
}
```

---

## 3. `src/platform/index.ts` — 플랫폼 감지 + 팩토리

```typescript
import type { PlatformAuth, PlatformType } from './types';

export function detectPlatform(): PlatformType {
  // Capacitor 네이티브 앱
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  ) {
    return 'capacitor';
  }
  // Lair 미니앱 (ReactNativeWebView 브릿지 존재)
  if (typeof window !== 'undefined' && 'ReactNativeWebView' in window) {
    return 'miniapp';
  }
  // dev 환경 또는 순수 웹
  return 'web';
}

let _auth: PlatformAuth | null = null;

export async function getPlatformAuth(): Promise<PlatformAuth> {
  if (_auth) return _auth;

  const platform = detectPlatform();

  switch (platform) {
    case 'miniapp': {
      // @bug4city/miniapp-sdk는 미니앱 빌드에서만 번들됨
      const { MiniappAuth } = await import('./miniapp/index');
      _auth = new MiniappAuth();
      break;
    }
    case 'capacitor': {
      // Capacitor 코드는 capacitor 빌드에서만 번들됨
      const { CapacitorAuth } = await import('./capacitor/index');
      _auth = new CapacitorAuth();
      break;
    }
    default: {
      const { WebAuth } = await import('./web/index');
      _auth = new WebAuth();
    }
  }

  return _auth;
}

// 동기 접근용 (initialize() 이후에만 사용)
export function getPlatformAuthSync(): PlatformAuth {
  if (!_auth) throw new Error('[platform] getPlatformAuth()가 먼저 호출되어야 합니다');
  return _auth;
}
```

---

## 4. `src/platform/miniapp/lair-client.ts` — 기존 코드 이동

기존 `src/lib/lair-client.ts`를 **그대로** 이 경로로 이동. import 경로만 수정.

---

## 5. `src/platform/miniapp/index.ts` — MiniappAuth

```typescript
import type { PlatformAuth, Session } from '../types';
import { lair, initLair, closeMiniApp, requireLogin } from './lair-client';
import { get as storageGet, set as storageSet } from '../../lib/storage';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class MiniappAuth implements PlatformAuth {
  async initialize(): Promise<void> {
    await initLair(); // 기존 ensureLairReady() 로직
  }

  async getSession(): Promise<Session | null> {
    const initData = lair.auth.getInitData();
    const memberId = (initData as { memberId?: number } | null)?.memberId;

    if (memberId) {
      localStorage.setItem('lair-member-id', String(memberId));
      localStorage.setItem('lair-nickname', initData?.nickname ?? '');
    }

    const storedToken = storageGet<string>('token');
    if (storedToken) {
      return {
        isLoggedIn: true,
        userId: memberId ? String(memberId) : localStorage.getItem('lair-member-id'),
        token: storedToken,
        nickname: initData?.nickname ?? localStorage.getItem('lair-nickname'),
      };
    }

    // 토큰 없으면 lair-login으로 자동 발급
    if (memberId) {
      const token = await this._lairLogin(memberId, initData?.nickname ?? '');
      if (token) {
        storageSet('token', token);
        return {
          isLoggedIn: true,
          userId: String(memberId),
          token,
          nickname: initData?.nickname ?? null,
        };
      }
    }

    return null;
  }

  // 미니앱은 소셜 로그인 불필요 — SDK가 처리
  async login(): Promise<Session> {
    await requireLogin();
    const session = await this.getSession();
    if (!session) throw new Error('미니앱 로그인 실패');
    return session;
  }

  async refreshToken(): Promise<string | null> {
    const storedMemberId = localStorage.getItem('lair-member-id');
    const storedNickname = localStorage.getItem('lair-nickname') ?? '';
    const initData = lair.auth.getInitData();
    const memberId = storedMemberId
      ? Number(storedMemberId)
      : (initData as { memberId?: number } | null)?.memberId ?? null;
    const nickname = storedMemberId ? storedNickname : (initData?.nickname ?? '');

    if (!memberId) return null;
    const token = await this._lairLogin(memberId, nickname);
    if (token) storageSet('token', token);
    return token;
  }

  async logout(): Promise<void> {
    storageSet('token', null);
    localStorage.removeItem('lair-member-id');
    localStorage.removeItem('lair-nickname');
  }

  close(): void {
    closeMiniApp();
  }

  onAuthUpdate(cb: (session: Session) => void): () => void {
    return lair.events.on('authTokenUpdate', () => {
      void this.getSession().then((s) => s && cb(s));
    });
  }

  private async _lairLogin(memberId: number, nickname: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/health-api/auth/lair-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lairMemberId: memberId, nickname }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      return data.token ?? null;
    } catch {
      return null;
    }
  }
}
```

---

## 6. `src/platform/capacitor/index.ts` — CapacitorAuth

```typescript
import type { PlatformAuth, Session } from '../types';
import { get as storageGet, set as storageSet } from '../../lib/storage';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// Capacitor 패키지는 dynamic import로만 접근 → 미니앱 번들에 포함 안 됨
async function getBrowser() {
  const { Browser } = await import('@capacitor/browser');
  return Browser;
}

export class CapacitorAuth implements PlatformAuth {
  async initialize(): Promise<void> {
    // Capacitor에서는 lair.ready() 호출하지 않음 — hang 방지
  }

  async getSession(): Promise<Session | null> {
    const token = storageGet<string>('token');
    const userId = localStorage.getItem('cap-user-id');
    const nickname = localStorage.getItem('cap-nickname');
    if (!token) return null;
    return { isLoggedIn: true, userId, token, nickname };
  }

  async login(provider: 'kakao' | 'apple' | 'google'): Promise<Session> {
    const Browser = await getBrowser();

    // 백엔드가 OAuth redirect 완료 후 deep link로 토큰 전달
    // capacitor://localhost/auth/callback?token=...
    return new Promise((resolve, reject) => {
      const handleUrl = async (event: { url: string }) => {
        if (!event.url.includes('/auth/callback')) return;
        const url = new URL(event.url);
        const token = url.searchParams.get('token');
        const userId = url.searchParams.get('userId');
        const nickname = url.searchParams.get('nickname') ?? '';

        if (!token) { reject(new Error('토큰 없음')); return; }

        storageSet('token', token);
        localStorage.setItem('cap-user-id', userId ?? '');
        localStorage.setItem('cap-nickname', nickname);
        await Browser.close();
        resolve({ isLoggedIn: true, userId, token, nickname });
      };

      // Capacitor App 플러그인으로 deep link 수신
      import('@capacitor/app').then(({ App }) => {
        const listener = App.addListener('appUrlOpen', handleUrl);
        // 타임아웃 처리
        setTimeout(() => { void listener.then(l => l.remove()); reject(new Error('로그인 타임아웃')); }, 300_000);
      }).catch(reject);

      void Browser.open({
        url: `${API_BASE}/health-api/auth/social?provider=${provider}&redirect=capacitor://localhost/auth/callback`,
      });
    });
  }

  async refreshToken(): Promise<string | null> {
    const token = storageGet<string>('token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/health-api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      if (data.token) storageSet('token', data.token);
      return data.token ?? null;
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    const token = storageGet<string>('token');
    if (token) {
      try {
        await fetch(`${API_BASE}/health-api/auth/logout`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* 실패해도 로컬 삭제 진행 */ }
    }
    storageSet('token', null);
    localStorage.removeItem('cap-user-id');
    localStorage.removeItem('cap-nickname');
  }

  close(): void {
    // 앱 홈 화면으로 이동 (또는 이전 화면)
    window.history.back();
  }

  onAuthUpdate(_cb: (session: Session) => void): () => void {
    // Capacitor는 플랫폼 이벤트 없음 — no-op
    return () => {};
  }
}
```

---

## 7. `src/platform/web/index.ts` — WebAuth (dev/fallback)

```typescript
import type { PlatformAuth, Session } from '../types';
import { get as storageGet, set as storageSet } from '../../lib/storage';

const MOCK_TOKEN = 'mock-dev-token';

export class WebAuth implements PlatformAuth {
  async initialize(): Promise<void> {}

  async getSession(): Promise<Session | null> {
    const token = storageGet<string>('token') ?? MOCK_TOKEN;
    storageSet('token', token);
    return { isLoggedIn: true, userId: 'dev-user', token, nickname: 'Dev User' };
  }

  async login(): Promise<Session> {
    return this.getSession().then(s => s!);
  }

  async refreshToken(): Promise<string | null> {
    return storageGet<string>('token');
  }

  async logout(): Promise<void> {
    storageSet('token', null);
  }

  close(): void {}

  onAuthUpdate(_cb: (session: Session) => void): () => void {
    return () => {};
  }
}
```

---

## 8. 기존 4개 파일 수정 계획

### 8-1. `src/main.tsx`

**변경 전:**
```typescript
import { lair } from './lib/lair-client';
// ...
function ensureLairReady(): Promise<void> {
  readyCall ??= Promise.resolve(lair.ready())
  // ...
}
function Bootstrap() {
  useEffect(() => {
    void ensureLairReady();
  }, []);
```

**변경 후:**
```typescript
// lair-client import 완전 제거
import { getPlatformAuth } from './platform';
// ...
function Bootstrap() {
  useEffect(() => {
    void getPlatformAuth().then(auth => auth.initialize());
  }, []);
```

> `lair` import 제거, `getPlatformAuth()` 동적 호출로 교체. Capacitor 빌드에서 miniapp 코드 tree-shake 됨.

---

### 8-2. `src/hooks/useSession.ts`

**핵심 변경**: `useState` 초기화에서 동기 `lair.auth.getInitData()` 제거 → 비동기 `getPlatformAuth().getSession()` 패턴으로 전환

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getPlatformAuth } from '../platform';
import type { Session } from '../platform/types';
import { useUIStore } from '../store/uiStore';

const EMPTY: Session = { isLoggedIn: false, userId: null, token: null, nickname: null };

export function useSession(): Session {
  const storeToken = useUIStore((s) => s.token);
  const setToken = useUIStore((s) => s.setToken);

  // 동기 초기화 제거: lair.auth.getInitData() → 비동기 getSession()
  const [session, setSession] = useState<Session>(() => {
    if (storeToken) {
      return { isLoggedIn: true, userId: null, token: storeToken, nickname: null };
    }
    return EMPTY;
  });

  const refreshSession = useCallback(async () => {
    const auth = await getPlatformAuth();
    const s = await auth.getSession();
    if (!s) return;
    setToken(s.token ?? '');
    setSession(s);
  }, [setToken]);

  useEffect(() => {
    void refreshSession();

    let cleanup: (() => void) | undefined;
    void getPlatformAuth().then(auth => {
      cleanup = auth.onAuthUpdate((s) => {
        setToken(s.token ?? '');
        setSession(s);
      });
    });
    return () => cleanup?.();
  }, [refreshSession]);

  return session;
}
```

---

### 8-3. `src/services/api.ts`

**핵심 변경**: `lairClient.auth.getInitData()` 제거, `platformAuth.refreshToken()` 사용

```typescript
import { getPlatformAuthSync } from '../platform';
import { get as storageGet, set as storageSet } from '../lib/storage';

// lairClient import 완전 제거

function getToken(): string | null {
  return storageGet<string>('token'); // lairClient fallback 제거
}

export async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401) {
    // 기존 복잡한 lair-login 재시도 로직 → platformAuth.refreshToken()으로 단순화
    const auth = getPlatformAuthSync();
    const newToken = await auth.refreshToken();

    if (newToken) {
      storageSet('token', newToken);
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      } catch {
        throw new NetworkError();
      }
    } else {
      auth.close(); // 미니앱: closeMiniApp, 앱: /login으로 이동
      throw new ApiError(401, '인증이 만료되었습니다. 다시 로그인해 주세요.');
    }
  }

  return res;
}
```

> `getPlatformAuthSync()`는 `initialize()` 이후에만 호출되므로 안전. `requireLogin()` 직접 호출 제거.

---

### 8-4. `src/lib/lair-client.ts`

**삭제**. 내용을 `src/platform/miniapp/lair-client.ts`로 이동 후 원본 삭제.

기존 `src/lib/lair-client.ts`를 import하는 다른 파일이 있을 경우 `src/platform/miniapp/lair-client.ts`로 경로 수정. (현재 api.ts, useSession.ts, main.tsx만 의존 — 모두 교체됨)

---

## 9. LoginPage (Capacitor 전용)

### `src/pages/LoginPage.tsx`

```typescript
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlatformAuth } from '../platform';
import { useUIStore } from '../store/uiStore';

export default function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const setToken = useUIStore(s => s.setToken);

  const handleLogin = async (provider: 'kakao' | 'apple' | 'google') => {
    const auth = await getPlatformAuth();
    const session = await auth.login(provider);
    setToken(session.token ?? '');
    navigate('/', { replace: true });
  };

  return (
    <div style={{ /* 전체 화면 중앙 정렬 */ }}>
      <h1>레어헬스</h1>
      <button onClick={() => void handleLogin('kakao')}>카카오로 시작하기</button>
      <button onClick={() => void handleLogin('apple')}>Apple로 시작하기</button>
      <button onClick={() => void handleLogin('google')}>Google로 시작하기</button>
    </div>
  );
}
```

### `src/App.tsx` 라우팅 수정

```typescript
import { detectPlatform } from './platform';

// AppShell 상단에 추가
function AppShell(): ReactElement {
  const { token } = useUIStore(s => ({ token: s.token }));
  const platform = detectPlatform();

  // Capacitor: 토큰 없으면 /login으로
  if (platform === 'capacitor' && !token && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // ... 기존 onboarding 체크 유지
}

// Routes에 추가 (미니앱에서는 도달 불가)
<Route path="/login" element={<LoginPage />} />
```

---

## 10. Capacitor 설정

### `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bug4city.lairhealth',
  appName: 'Lair Health',
  webDir: 'dist',
  server: {
    // 개발 시 hot reload
    url: process.env.CAP_DEV_URL,
    cleartext: false,
  },
  plugins: {
    Browser: {
      // OAuth 완료 후 deep link 스킴
    },
  },
};

export default config;
```

### `vite.config.ts` 수정

```typescript
const platform = process.env.VITE_PLATFORM ?? 'miniapp';

export default defineConfig({
  // Capacitor는 상대경로, 미니앱은 절대경로
  base: platform === 'capacitor' ? './' : '/lair-health/',
  // ...
  define: {
    'globalThis.__LAIR_NETWORK__': JSON.stringify('mainnet'),
    // 번들에 플랫폼 굽기 → 불필요한 코드 tree-shake
    'import.meta.env.VITE_PLATFORM': JSON.stringify(platform),
  },
  build: {
    rollupOptions: {
      // 미니앱 빌드 시 @capacitor/* externalize
      ...(platform === 'miniapp' && {
        external: (id: string) => id.startsWith('@capacitor/'),
      }),
    },
  },
});
```

### `package.json` scripts 추가

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:miniapp": "VITE_PLATFORM=miniapp npm run build",
    "build:capacitor": "VITE_PLATFORM=capacitor npm run build",
    "cap:ios": "npm run build:capacitor && cap sync ios && cap open ios",
    "cap:android": "npm run build:capacitor && cap sync android && cap open android",
    "cap:dev": "CAP_DEV_URL=http://$(ipconfig getifaddr en0):5175 npm run cap:ios"
  }
}
```

---

## 11. 백엔드 CORS + OAuth 추가 사항

| 필요 변경 | 내용 |
|----------|------|
| CORS | `capacitor://localhost` origin 허용 추가 |
| `POST /health-api/auth/social` | provider + redirect_uri 받아 OAuth URL 반환 또는 redirect |
| `GET /health-api/auth/callback` | OAuth code → JWT 발급, deep link로 redirect |
| `POST /health-api/auth/refresh` | 기존 JWT로 새 JWT 발급 |
| `DELETE /health-api/auth/logout` | 토큰 무효화 |

---

## 12. 마이그레이션 순서

```
1. src/platform/types.ts 생성
2. src/platform/miniapp/lair-client.ts (기존 lair-client.ts 이동)
3. src/platform/miniapp/index.ts (MiniappAuth)
4. src/platform/web/index.ts (WebAuth)
5. src/platform/index.ts (팩토리)
6. src/main.tsx 수정 (lair.ready() → initialize())
7. src/hooks/useSession.ts 수정
8. src/services/api.ts 수정 (가장 복잡한 401 로직 단순화)
9. src/lib/lair-client.ts 삭제
10. npm install @capacitor/core @capacitor/cli @capacitor/browser @capacitor/app
11. capacitor.config.ts + vite.config.ts 수정
12. src/pages/LoginPage.tsx + App.tsx 라우팅
13. src/platform/capacitor/index.ts (CapacitorAuth)
14. npx cap add ios && npx cap add android
```

---

## 13. 핵심 트레이드오프 요약

| 결정 | 이유 |
|------|------|
| `detectPlatform()`을 동기로 | 라우팅 결정이 렌더 전에 필요하기 때문 |
| `getPlatformAuth()`를 동기+비동기 둘 다 | main에서 init 보장 후 api.ts에서 동기 접근 |
| miniapp-sdk를 dynamic import로만 격리 | workspace:* 패키지가 capacitor 빌드 환경에 없을 때 번들 오류 방지 |
| `useSession`의 동기 초기화 제거 | Capacitor에서 `getInitData()` 호출 자체가 undefined를 반환하므로 무의미 |
| 401 재시도 로직을 `platformAuth.refreshToken()` 위임 | api.ts가 플랫폼 구체 사항을 모르게 해서 결합도 제거 |
