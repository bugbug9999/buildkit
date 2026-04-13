# 레어헬스 (lair-health) — Phase 1 & 2 Implementation Design

> Codex implements from this document directly. Every section is complete and self-contained.
> Target path: `/Users/bugbookee/Desktop/ai/lair/lair-app-v2/apps/lair-health/`
> Backend: GLP-Care Fastify API (same as mobile, proxied via `/health-api`)

---

## 1. Folder Structure

```
apps/lair-health/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── vite.config.ts
└── src/
    ├── main.tsx                    # App bootstrap, LairMiniAppClient init, vConsole
    ├── App.tsx                     # BrowserRouter + lazy routes
    ├── i18n/
    │   ├── index.ts                # i18next init (ko default)
    │   └── ko.json                 # All Korean UI strings
    ├── theme/
    │   ├── tokens.ts               # Color, typography, spacing, radius constants
    │   └── global.css              # CSS reset + Noto Sans KR + CSS custom props
    ├── lib/
    │   ├── storage.ts              # LocalStorage wrapper, key prefix: lair-health:
    │   └── lair-client.ts          # LairMiniAppClient singleton
    ├── services/
    │   ├── api.ts                  # Fetch wrapper: auth header, 401 retry via bridge
    │   ├── medicationApi.ts        # Medication CRUD + logs, ported from mobile
    │   └── mealApi.ts              # Meal logs CRUD + food search + dashboard
    ├── store/
    │   ├── uiStore.ts              # Global UI state: theme, offline, toasts
    │   ├── sessionStore.ts         # Auth token, userId, nickname from bridge init
    │   ├── medicationStore.ts      # Medications list + today logs
    │   └── mealStore.ts            # Today summary + meal logs
    ├── hooks/
    │   ├── useSession.ts           # Read sessionStore, expose userId/token/nickname
    │   ├── useMedications.ts       # Wrap medicationStore actions
    │   └── useMeals.ts             # Wrap mealStore actions
    ├── pages/
    │   ├── MealDashboard/
    │   │   └── index.tsx           # Home: calorie gauge, macro bars, meal type cards
    │   ├── Medication/
    │   │   └── index.tsx           # Medication list + today checklist + calendar
    │   ├── MedicationAdd/
    │   │   └── index.tsx           # Add new medication form
    │   ├── MedicationEdit/
    │   │   └── index.tsx           # Edit existing medication (param: :id)
    │   └── Settings/
    │       └── index.tsx           # User settings (profile, notifications)
    └── components/
        ├── OfflineBanner.tsx        # Shows when navigator.onLine === false
        └── ErrorBoundary.tsx        # React class error boundary
```

---

## 2. package.json

```json
{
  "name": "@bug4city/lair-health",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@bug4city/api-client": "workspace:*",
    "@bug4city/bridge": "workspace:*",
    "@bug4city/miniapp-sdk": "workspace:*",
    "@bug4city/shared": "workspace:*",
    "i18next": "^25.1.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-i18next": "^15.4.0",
    "react-router-dom": "^7.6.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.48.0",
    "vconsole": "^3.15.1",
    "vite": "^7.3.1"
  }
}
```

---

## 3. Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/miniapp/lair-health/',
  plugins: [react()],
  define: {
    'globalThis.__LAIR_NETWORK__': JSON.stringify('mainnet'),
  },
  server: {
    host: true,
    port: parseInt(process.env.PORT ?? '5175'),
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'https://dev-api.lair.fi',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
      '/health-api': {
        target: process.env.VITE_HEALTH_API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/health-api/, ''),
        secure: false,
      },
    },
  },
})
```

**Note:** GLP-Care backend proxied at `/health-api` → `http://localhost:3001`. In production, set `VITE_HEALTH_API_URL` to the deployed backend URL. All `medicationApi.ts` and `mealApi.ts` calls use `/health-api/api/...` as the base.

---

## 4. TypeScript Config

### tsconfig.json
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### tsconfig.app.json
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"],
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/*.spec.ts",
    "src/**/*.spec.tsx"
  ]
}
```

### tsconfig.node.json
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

## 5. ESLint Config

```javascript
// eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
```

---

## 6. index.html

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <title>레어헬스</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 7. src/main.tsx

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/global.css';
import './i18n';
import { lairClient } from './lib/lair-client';
import { useSessionStore } from './store/sessionStore';
import App from './App';

// ── vConsole (dev or debug=1) ────────────────────────────────────────────────
const searchParams = new URLSearchParams(window.location.search);
const isInWebView = !!(window as unknown as Record<string, unknown>).ReactNativeWebView;
const shouldEnableVConsole =
  import.meta.env.DEV ||
  searchParams.get('debug_console') === '1' ||
  (isInWebView && window.location.hostname === 'dev-game.lair.fi');

if (shouldEnableVConsole) {
  import('vconsole').then(({ default: VConsole }) => {
    new VConsole({ theme: 'dark' });
  });
}

// ── Bridge init: inject token from LairMiniAppClient ──────────────────────────
lairClient.ready();

const initData = lairClient.auth.getInitData();
if (initData) {
  useSessionStore.setState({
    token: initData.token ?? null,
    userId: initData.userId ?? null,
    nickname: initData.nickname ?? null,
    isInHostApp: true,
    isReady: true,
  });
} else if (import.meta.env.DEV && !isInWebView) {
  // Browser dev bypass — fake session so pages render
  useSessionStore.setState({
    token: 'dev-preview-token',
    userId: 'dev-user-id',
    nickname: 'DevUser',
    isInHostApp: false,
    isReady: true,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

## 8. App.tsx

```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';

const MealDashboardPage = lazy(() => import('./pages/MealDashboard').then((m) => ({ default: m.MealDashboardPage })));
const MedicationPage     = lazy(() => import('./pages/Medication').then((m) => ({ default: m.MedicationPage })));
const MedicationAddPage  = lazy(() => import('./pages/MedicationAdd').then((m) => ({ default: m.MedicationAddPage })));
const MedicationEditPage = lazy(() => import('./pages/MedicationEdit').then((m) => ({ default: m.MedicationEditPage })));
const SettingsPage       = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #10B981', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function App() {
  // Strip trailing slash from BASE_URL for basename
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <OfflineBanner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<MealDashboardPage />} />
            <Route path="/medication" element={<MedicationPage />} />
            <Route path="/medication/add" element={<MedicationAddPage />} />
            <Route path="/medication/:id/edit" element={<MedicationEditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

---

## 9. Zustand Store Designs

### store/sessionStore.ts

```typescript
import { create } from 'zustand';

interface SessionState {
  token: string | null;
  userId: string | null;
  nickname: string | null;
  isInHostApp: boolean;
  isReady: boolean;
  // Actions
  setToken: (token: string | null) => void;
  setSession: (data: { token: string | null; userId: string | null; nickname: string | null }) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  userId: null,
  nickname: null,
  isInHostApp: false,
  isReady: false,

  setToken: (token) => set({ token }),
  setSession: ({ token, userId, nickname }) => set({ token, userId, nickname }),
  reset: () => set({ token: null, userId: null, nickname: null, isReady: false }),
}));
```

### store/medicationStore.ts

```typescript
import { create } from 'zustand';
import type { MedicationData, MedicationLogData, MedicationSummary } from '../services/medicationApi';

interface MedicationState {
  // State
  medications: MedicationData[];
  todayLogs: MedicationLogData[];
  summary: MedicationSummary | null;
  isLoadingMedications: boolean;
  isLoadingLogs: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  setMedications: (list: MedicationData[]) => void;
  setTodayLogs: (logs: MedicationLogData[]) => void;
  setSummary: (summary: MedicationSummary) => void;
  setLoadingMedications: (v: boolean) => void;
  setLoadingLogs: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setError: (msg: string | null) => void;
  upsertMedication: (med: MedicationData) => void;     // insert or replace by id
  removeMedication: (id: string) => void;
  upsertLog: (log: MedicationLogData) => void;         // insert or replace by id
  reset: () => void;
}

export const useMedicationStore = create<MedicationState>((set) => ({
  medications: [],
  todayLogs: [],
  summary: null,
  isLoadingMedications: false,
  isLoadingLogs: false,
  isSaving: false,
  error: null,

  setMedications: (list) => set({ medications: list }),
  setTodayLogs: (logs) => set({ todayLogs: logs }),
  setSummary: (summary) => set({ summary }),
  setLoadingMedications: (v) => set({ isLoadingMedications: v }),
  setLoadingLogs: (v) => set({ isLoadingLogs: v }),
  setSaving: (v) => set({ isSaving: v }),
  setError: (msg) => set({ error: msg }),

  upsertMedication: (med) =>
    set((s) => ({
      medications: s.medications.some((m) => m.id === med.id)
        ? s.medications.map((m) => (m.id === med.id ? med : m))
        : [med, ...s.medications],
    })),

  removeMedication: (id) =>
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) })),

  upsertLog: (log) =>
    set((s) => ({
      todayLogs: s.todayLogs.some((l) => l.id === log.id)
        ? s.todayLogs.map((l) => (l.id === log.id ? log : l))
        : [log, ...s.todayLogs],
    })),

  reset: () =>
    set({ medications: [], todayLogs: [], summary: null, error: null }),
}));
```

### store/mealStore.ts

```typescript
import { create } from 'zustand';
import type { DashboardToday, MealLog } from '../services/mealApi';

interface MealState {
  // State
  todaySummary: DashboardToday | null;
  todayLogs: MealLog[];
  selectedDate: string;            // ISO date string YYYY-MM-DD
  isLoadingDashboard: boolean;
  isSavingMeal: boolean;
  error: string | null;

  // Actions
  setTodaySummary: (summary: DashboardToday) => void;
  setTodayLogs: (logs: MealLog[]) => void;
  setSelectedDate: (date: string) => void;
  setLoadingDashboard: (v: boolean) => void;
  setSavingMeal: (v: boolean) => void;
  setError: (msg: string | null) => void;
  addLog: (log: MealLog) => void;
  removeLog: (id: string) => void;
  reset: () => void;
}

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

export const useMealStore = create<MealState>((set) => ({
  todaySummary: null,
  todayLogs: [],
  selectedDate: toDateKey(new Date()),
  isLoadingDashboard: false,
  isSavingMeal: false,
  error: null,

  setTodaySummary: (summary) => set({ todaySummary: summary }),
  setTodayLogs: (logs) => set({ todayLogs: logs }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLoadingDashboard: (v) => set({ isLoadingDashboard: v }),
  setSavingMeal: (v) => set({ isSavingMeal: v }),
  setError: (msg) => set({ error: msg }),
  addLog: (log) => set((s) => ({ todayLogs: [log, ...s.todayLogs] })),
  removeLog: (id) => set((s) => ({ todayLogs: s.todayLogs.filter((l) => l.id !== id) })),
  reset: () => set({ todaySummary: null, todayLogs: [], error: null }),
}));
```

### store/uiStore.ts

```typescript
import { create } from 'zustand';

type Toast = { id: string; message: string; type: 'success' | 'error' | 'info' };

interface UIState {
  // State
  theme: 'light' | 'dark';
  isOffline: boolean;
  toasts: Toast[];

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setOffline: (v: boolean) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  isOffline: false,
  toasts: [],

  setTheme: (theme) => set({ theme }),
  setOffline: (v) => set({ isOffline: v }),

  addToast: (message, type = 'info') =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), message, type }],
    })),

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

---

## 10. services/api.ts

```typescript
// services/api.ts
// Fetch wrapper with Bearer auth from sessionStore.
// On 401: requests a token refresh via LairMiniAppClient bridge, retries once.
// Exports: apiFetch, parseOrThrow, NetworkError

import { useSessionStore } from '../store/sessionStore';
import { lairClient } from '../lib/lair-client';

export class NetworkError extends Error {
  constructor(message = '네트워크 연결을 확인해 주세요.') {
    super(message);
    this.name = 'NetworkError';
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function attemptTokenRefresh(): Promise<string | null> {
  try {
    const result = await lairClient.auth.requestTokenRefresh();
    if (result.token) {
      useSessionStore.getState().setToken(result.token);
      return result.token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useSessionStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new NetworkError(err instanceof Error ? err.message : 'Network error');
  }

  if (res.status !== 401) return res;

  // ── 401: try token refresh via bridge ──────────────────────────────────────
  if (isRefreshing) {
    return new Promise<Response>((resolve) => {
      refreshSubscribers.push(async (newToken) => {
        headers['Authorization'] = `Bearer ${newToken}`;
        resolve(fetch(url, { ...options, headers }));
      });
    });
  }

  isRefreshing = true;
  const newToken = await attemptTokenRefresh();
  isRefreshing = false;

  if (newToken) {
    onRefreshed(newToken);
    headers['Authorization'] = `Bearer ${newToken}`;
    return fetch(url, { ...options, headers });
  }

  return res; // Return original 401 — caller decides what to do
}

export async function parseOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    let msg = `${label} (${res.status})`;
    try {
      const body = await res.json() as { message?: string };
      msg = body.message ?? msg;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(msg);
  }
  const body = await res.json() as { data: T };
  return body.data;
}
```

---

## 11. services/medicationApi.ts

```typescript
// services/medicationApi.ts
// Ported from mobile/src/lib/medicationApi.ts.
// Replaces medFetch + auth token store with apiFetch from api.ts.
// All endpoints: /health-api/api/... (proxied by Vite to GLP-Care backend).

import { apiFetch, parseOrThrow, NetworkError } from './api';

export { NetworkError };

const BASE = '/health-api/api';

// ── Types (identical to mobile) ───────────────────────────────────────────────

export interface MedicationScheduleData {
  id: string;
  medicationId: string;
  dayOfWeek: number | null;
  timeSlot: 'MORNING' | 'LUNCH' | 'EVENING' | 'BEDTIME';
  timeDetail: string; // HH:MM
  condition: 'FASTING' | 'BEFORE_MEAL' | 'AFTER_MEAL' | 'ANY';
  isActive: boolean;
  createdAt: string;
}

export interface DosageHistoryData {
  id: string;
  medicationId: string;
  dosage: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface MedicationData {
  id: string;
  userId: string;
  name: string;
  form: 'ORAL' | 'INJECTION' | 'OTHER';
  colorIndex: number;
  memo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schedules: MedicationScheduleData[];
  dosageHistory: DosageHistoryData[];
}

export interface MedicationLogData {
  id: string;
  scheduleId: string;
  userId: string;
  scheduledDate: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED';
  checkedAt: string | null;
  dosageAtTime: string;
  createdAt: string;
  updatedAt: string;
  schedule?: {
    id: string;
    medicationId: string;
    medication?: { id: string };
  };
}

export interface ScheduleInput {
  dayOfWeek?: number | null;
  timeSlot: 'MORNING' | 'LUNCH' | 'EVENING' | 'BEDTIME';
  timeDetail: string;
  condition?: 'FASTING' | 'BEFORE_MEAL' | 'AFTER_MEAL' | 'ANY';
  dosage?: string;
}

export interface CreateMedicationInput {
  name: string;
  form?: 'ORAL' | 'INJECTION' | 'OTHER';
  colorIndex?: number;
  memo?: string;
  schedules: ScheduleInput[];
}

export interface UpdateMedicationInput {
  name?: string;
  form?: 'ORAL' | 'INJECTION' | 'OTHER';
  colorIndex?: number;
  memo?: string;
  schedules?: ScheduleInput[];
}

export interface MedicationSummary {
  total: number;
  taken: number;
  missed: number;
  skipped: number;
  rate: number;
  from: string;
  to: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchMedications(): Promise<MedicationData[]> {
  const res = await apiFetch(`${BASE}/medications`);
  return parseOrThrow<MedicationData[]>(res, 'fetch medications failed');
}

export async function createMedication(input: CreateMedicationInput): Promise<MedicationData> {
  const res = await apiFetch(`${BASE}/medications`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseOrThrow<MedicationData>(res, 'create medication failed');
}

export async function updateMedication(id: string, input: UpdateMedicationInput): Promise<MedicationData> {
  const res = await apiFetch(`${BASE}/medications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return parseOrThrow<MedicationData>(res, 'update medication failed');
}

export async function deleteMedication(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/medications/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('delete medication failed');
}

export async function fetchMedicationLogs(params: { from: string; to: string }): Promise<MedicationLogData[]> {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`${BASE}/medication-logs?${query}`);
  return parseOrThrow<MedicationLogData[]>(res, 'fetch medication logs failed');
}

export async function upsertMedicationLog(payload: {
  scheduleId: string;
  scheduledDate: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED';
  dosageAtTime?: string;
}): Promise<MedicationLogData> {
  const res = await apiFetch(`${BASE}/medication-logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseOrThrow<MedicationLogData>(res, 'upsert medication log failed');
}

export async function fetchMedicationSummary(params: { from: string; to: string }): Promise<MedicationSummary> {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`${BASE}/medications/summary?${query}`);
  return parseOrThrow<MedicationSummary>(res, 'fetch medication summary failed');
}
```

---

## 12. services/mealApi.ts

```typescript
// services/mealApi.ts
// Ported from mobile/src/lib/api.ts (meal-related functions only).
// Base: /health-api/api (proxied to GLP-Care backend port 3001).

import { apiFetch, parseOrThrow } from './api';

const BASE = '/health-api/api';
type MealImageExtension = 'jpg' | 'jpeg' | 'png' | 'webp';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalCaloriesKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  proteinAchievementRate: number;
  mealCount: number;
  isTracked: boolean;
}

export interface MealLogBrief {
  id: string;
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealType: string;
  loggedAt: string;
}

export interface DashboardMeals {
  breakfast: MealLogBrief[];
  lunch: MealLogBrief[];
  dinner: MealLogBrief[];
  snack: MealLogBrief[];
}

export interface DashboardToday {
  date: string;
  summary: DashboardSummary;
  proteinGoalG: number;
  glp1Day: number;
  streakDays: number;
  longestStreakDays: number;
  meals?: DashboardMeals;
}

export interface MealLog {
  id: string;
  userId: string;
  loggedAt: string;
  imageKey: string | null;
  aiAnalysisId: string | null;
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isManuallyEdited: boolean;
  dateStr: string;
  mealType?: string;
  sourceType?: string;
  servingCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MealLogsResponse {
  date: string;
  logs: MealLog[];
}

export interface FoodSearchItem {
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: 'mfds' | 'fallback' | 'recent';
}

export interface FoodSearchResponse {
  query: string;
  items: FoodSearchItem[];
}

export interface RecentFoodsResponse {
  items: FoodSearchItem[];
}

export interface AnalyzeUploadUrlResponse {
  objectKey: string;
  uploadUrl: string;
  expiresInSec: number;
  stripExif: boolean;
}

export interface MealAnalysisResult {
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
  quotaRemaining: number;
}

export interface CreateMealLogInput {
  loggedAt?: string;
  imageKey?: string;
  aiAnalysisId?: string;
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealType?: string;
  sourceType?: string;
  servingCount?: number;
  isManuallyEdited?: boolean;
}

export interface UpdateMealLogInput {
  loggedAt?: string;
  imageKey?: string | null;
  aiAnalysisId?: string | null;
  foodName?: string;
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  isManuallyEdited?: boolean;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchDashboardToday(): Promise<DashboardToday> {
  const res = await apiFetch(`${BASE}/dashboard/today`);
  return parseOrThrow<DashboardToday>(res, 'dashboard fetch failed');
}

export async function fetchMealLogs(date: string): Promise<MealLogsResponse> {
  const query = new URLSearchParams({ date }).toString();
  const res = await apiFetch(`${BASE}/meal/logs?${query}`);
  return parseOrThrow<MealLogsResponse>(res, 'fetch meal logs failed');
}

export async function createMealLog(payload: CreateMealLogInput): Promise<MealLog> {
  const res = await apiFetch(`${BASE}/meal/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseOrThrow<MealLog>(res, 'create meal log failed');
}

export async function updateMealLog(id: string, payload: UpdateMealLogInput): Promise<MealLog> {
  const res = await apiFetch(`${BASE}/meal/logs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return parseOrThrow<MealLog>(res, 'update meal log failed');
}

export async function deleteMealLog(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/meal/logs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`delete meal log failed: ${res.status}`);
}

export async function searchMealFoods(query: string, limit = 10): Promise<FoodSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) }).toString();
  const res = await apiFetch(`${BASE}/meal/foods/search?${params}`);
  return parseOrThrow<FoodSearchResponse>(res, 'food search failed');
}

export async function fetchRecentMealFoods(limit = 8): Promise<RecentFoodsResponse> {
  const params = new URLSearchParams({ limit: String(limit) }).toString();
  const res = await apiFetch(`${BASE}/meal/foods/recent?${params}`);
  return parseOrThrow<RecentFoodsResponse>(res, 'recent foods fetch failed');
}

export async function getAnalyzeUploadUrl(extension: MealImageExtension): Promise<AnalyzeUploadUrlResponse> {
  const query = new URLSearchParams({ extension }).toString();
  const res = await apiFetch(`${BASE}/meal/analyze-upload-url?${query}`);
  return parseOrThrow<AnalyzeUploadUrlResponse>(res, 'upload url fetch failed');
}

export async function runMealAnalyze(payload: { imageUrl?: string; imageKey?: string }): Promise<MealAnalysisResult> {
  const res = await apiFetch(`${BASE}/meal/analyze`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseOrThrow<MealAnalysisResult>(res, 'meal analyze failed');
}
```

---

## 13. theme/tokens.ts

```typescript
// theme/tokens.ts
export const colors = {
  // Brand
  PRIMARY:      '#10B981', // Emerald 500 — main action color
  PRIMARY_DARK: '#059669', // Emerald 600 — pressed state
  PRIMARY_LIGHT:'#D1FAE5', // Emerald 100 — light tint / background badge

  // Surface
  BG:           '#F8FAFC', // Slate 50 — page background
  CARD:         '#FFFFFF', // Card surface
  BORDER:       '#E2E8F0', // Slate 200

  // Text
  TEXT:         '#0F172A', // Slate 900 — primary text
  SUBTEXT:      '#64748B', // Slate 500 — secondary text
  PLACEHOLDER:  '#94A3B8', // Slate 400

  // Semantic
  ERROR:        '#EF4444', // Red 500
  WARNING:      '#F59E0B', // Amber 500
  SUCCESS:      '#10B981', // Same as PRIMARY
  INFO:         '#3B82F6', // Blue 500

  // Macro colors (calorie breakdown)
  CARB:         '#F59E0B', // Amber — carbohydrate
  PROTEIN:      '#10B981', // Emerald — protein
  FAT:          '#EF4444', // Red — fat

  // Medication pill colors (match mobile colorIndex 0-7)
  MED_COLORS: [
    '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
    '#F59E0B', '#EF4444', '#06B6D4', '#84CC16',
  ],
} as const;

export const typography = {
  // Font sizes (px → rem via CSS)
  XS:   '0.75rem',   // 12px
  SM:   '0.875rem',  // 14px
  BASE: '1rem',      // 16px
  LG:   '1.125rem',  // 18px
  XL:   '1.25rem',   // 20px
  XXL:  '1.5rem',    // 24px
  XXXL: '2rem',      // 32px

  // Font weights
  REGULAR: 400,
  MEDIUM:  500,
  SEMIBOLD:600,
  BOLD:    700,

  // Line heights
  TIGHT:  1.25,
  NORMAL: 1.5,
  LOOSE:  1.75,
} as const;

export const spacing = {
  XS:  '0.25rem',  // 4px
  SM:  '0.5rem',   // 8px
  MD:  '1rem',     // 16px
  LG:  '1.5rem',   // 24px
  XL:  '2rem',     // 32px
  XXL: '3rem',     // 48px
} as const;

export const radius = {
  SM:   '0.5rem',   // 8px
  MD:   '0.75rem',  // 12px
  LG:   '1rem',     // 16px
  XL:   '1.5rem',   // 24px
  FULL: '9999px',
} as const;
```

---

## 14. theme/global.css

```css
/* theme/global.css */
/* Noto Sans KR via preconnect in index.html */

/* ── CSS custom properties from tokens ─────────────────────────────────── */
:root {
  /* Colors */
  --color-primary:       #10B981;
  --color-primary-dark:  #059669;
  --color-primary-light: #D1FAE5;
  --color-bg:            #F8FAFC;
  --color-card:          #FFFFFF;
  --color-border:        #E2E8F0;
  --color-text:          #0F172A;
  --color-subtext:       #64748B;
  --color-placeholder:   #94A3B8;
  --color-error:         #EF4444;
  --color-warning:       #F59E0B;

  /* Typography */
  --font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Spacing */
  --sp-xs: 0.25rem;
  --sp-sm: 0.5rem;
  --sp-md: 1rem;
  --sp-lg: 1.5rem;
  --sp-xl: 2rem;

  /* Radius */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
}

/* ── Reset ─────────────────────────────────────────────────────────────── */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html {
  touch-action: manipulation;
  font-size: 16px;
}

body {
  font-family: var(--font-family);
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

button,
input,
select,
textarea {
  font-family: inherit;
  font-size: inherit;
}

button {
  cursor: pointer;
  border: none;
  background: none;
}

a {
  color: inherit;
  text-decoration: none;
}

img,
svg {
  display: block;
  max-width: 100%;
}

#root {
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Spinner animation (used in App.tsx PageLoader) ────────────────────── */
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 15. lib/storage.ts

```typescript
// lib/storage.ts
// LocalStorage wrapper with key prefix and JSON serialization.
// Falls back silently if localStorage is unavailable (SSR / private mode).

const PREFIX = 'lair-health:';

function key(k: string) {
  return `${PREFIX}${k}`;
}

export const storage = {
  get<T>(k: string): T | null {
    try {
      const raw = localStorage.getItem(key(k));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set<T>(k: string, value: T): void {
    try {
      localStorage.setItem(key(k), JSON.stringify(value));
    } catch {
      // Quota exceeded or private mode — fail silently
    }
  },

  remove(k: string): void {
    try {
      localStorage.removeItem(key(k));
    } catch {
      // ignore
    }
  },

  clear(): void {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};
```

---

## 16. lib/lair-client.ts

```typescript
// lib/lair-client.ts
// Singleton LairMiniAppClient. Safe to import anywhere — returns a no-op
// client when not running inside the Lair host app (browser dev mode).

import { LairMiniAppClient } from '@bug4city/miniapp-sdk';

// Single instance shared across the app
export const lairClient = new LairMiniAppClient({
  timeoutMs: 10_000,
});
```

---

## 17. hooks/useSession.ts

```typescript
// hooks/useSession.ts
// Reads session state from sessionStore.
// isInHostApp: true when running inside Lair RN WebView.

import { useSessionStore } from '../store/sessionStore';

export interface Session {
  userId: string | null;
  token: string | null;
  nickname: string | null;
  isInHostApp: boolean;
  isReady: boolean;
}

export function useSession(): Session {
  return useSessionStore((s) => ({
    userId:      s.userId,
    token:       s.token,
    nickname:    s.nickname,
    isInHostApp: s.isInHostApp,
    isReady:     s.isReady,
  }));
}
```

---

## 18. hooks/useMedications.ts

```typescript
// hooks/useMedications.ts
// Wraps medicationStore with async load/toggle actions.

import { useCallback } from 'react';
import { useMedicationStore } from '../store/medicationStore';
import {
  fetchMedications,
  fetchMedicationLogs,
  upsertMedicationLog,
} from '../services/medicationApi';
import type { MedicationData, MedicationLogData } from '../services/medicationApi';

export function useMedications() {
  const store = useMedicationStore();

  const reload = useCallback(async () => {
    store.setLoadingMedications(true);
    store.setError(null);
    try {
      const list = await fetchMedications();
      store.setMedications(list);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '약 목록 불러오기 실패');
    } finally {
      store.setLoadingMedications(false);
    }
  }, [store]);

  const reloadLogs = useCallback(async (from: string, to: string) => {
    store.setLoadingLogs(true);
    store.setError(null);
    try {
      const logs = await fetchMedicationLogs({ from, to });
      store.setTodayLogs(logs);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '복약 기록 불러오기 실패');
    } finally {
      store.setLoadingLogs(false);
    }
  }, [store]);

  const toggleCheck = useCallback(
    async (scheduleId: string, scheduledDate: string, currentStatus: MedicationLogData['status']) => {
      const nextStatus: MedicationLogData['status'] =
        currentStatus === 'TAKEN' ? 'SKIPPED' : 'TAKEN';
      store.setSaving(true);
      try {
        const updated = await upsertMedicationLog({ scheduleId, scheduledDate, status: nextStatus });
        store.upsertLog(updated);
      } catch (err) {
        store.setError(err instanceof Error ? err.message : '복약 체크 실패');
      } finally {
        store.setSaving(false);
      }
    },
    [store],
  );

  return {
    medications:   store.medications as MedicationData[],
    todayLogs:     store.todayLogs as MedicationLogData[],
    loading:       store.isLoadingMedications || store.isLoadingLogs,
    saving:        store.isSaving,
    error:         store.error,
    reload,
    reloadLogs,
    toggleCheck,
  };
}
```

---

## 19. hooks/useMeals.ts

```typescript
// hooks/useMeals.ts
// Wraps mealStore with async load/create/delete actions.

import { useCallback } from 'react';
import { useMealStore } from '../store/mealStore';
import {
  fetchDashboardToday,
  fetchMealLogs,
  createMealLog,
  deleteMealLog,
} from '../services/mealApi';
import type { CreateMealLogInput, MealLog } from '../services/mealApi';

export function useMeals() {
  const store = useMealStore();

  const loadDashboard = useCallback(async () => {
    store.setLoadingDashboard(true);
    store.setError(null);
    try {
      const summary = await fetchDashboardToday();
      store.setTodaySummary(summary);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '대시보드 불러오기 실패');
    } finally {
      store.setLoadingDashboard(false);
    }
  }, [store]);

  const loadLogs = useCallback(
    async (date?: string) => {
      store.setLoadingDashboard(true);
      store.setError(null);
      try {
        const targetDate = date ?? store.selectedDate;
        const res = await fetchMealLogs(targetDate);
        store.setTodayLogs(res.logs);
      } catch (err) {
        store.setError(err instanceof Error ? err.message : '식사 기록 불러오기 실패');
      } finally {
        store.setLoadingDashboard(false);
      }
    },
    [store],
  );

  const createLog = useCallback(
    async (input: CreateMealLogInput): Promise<MealLog> => {
      store.setSavingMeal(true);
      store.setError(null);
      try {
        const created = await createMealLog(input);
        store.addLog(created);
        await loadDashboard();
        return created;
      } catch (err) {
        store.setError(err instanceof Error ? err.message : '식사 저장 실패');
        throw err;
      } finally {
        store.setSavingMeal(false);
      }
    },
    [store, loadDashboard],
  );

  const deleteLog = useCallback(
    async (id: string) => {
      store.setSavingMeal(true);
      store.setError(null);
      try {
        await deleteMealLog(id);
        store.removeLog(id);
        await loadDashboard();
      } catch (err) {
        store.setError(err instanceof Error ? err.message : '식사 삭제 실패');
        throw err;
      } finally {
        store.setSavingMeal(false);
      }
    },
    [store, loadDashboard],
  );

  return {
    todaySummary:  store.todaySummary,
    todayLogs:     store.todayLogs,
    selectedDate:  store.selectedDate,
    loading:       store.isLoadingDashboard,
    saving:        store.isSavingMeal,
    error:         store.error,
    loadDashboard,
    loadLogs,
    createLog,
    deleteLog,
    setSelectedDate: store.setSelectedDate,
  };
}
```

---

## 20. i18n Setup

### i18n/index.ts

```typescript
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './ko.json';

void i18n
  .use(initReactI18next)
  .init({
    lng: 'ko',
    fallbackLng: 'ko',
    resources: {
      ko: { translation: ko },
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
```

### i18n/ko.json

```json
{
  "app": {
    "name": "레어헬스",
    "loading": "불러오는 중...",
    "error": "오류가 발생했습니다",
    "retry": "다시 시도",
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "edit": "수정",
    "add": "추가",
    "confirm": "확인",
    "close": "닫기",
    "offline": "인터넷 연결을 확인해 주세요"
  },
  "nav": {
    "meal": "식단",
    "medication": "약 관리",
    "settings": "설정"
  },
  "meal": {
    "title": "오늘의 식단",
    "calories": "칼로리",
    "kcal": "kcal",
    "protein": "단백질",
    "carbs": "탄수화물",
    "fat": "지방",
    "gram": "g",
    "goal": "목표",
    "streak": "연속",
    "streakDays": "{{count}}일 연속",
    "glp1Day": "GLP-1 {{count}}일차",
    "breakfast": "아침",
    "lunch": "점심",
    "dinner": "저녁",
    "snack": "간식",
    "noLogs": "기록된 식사가 없습니다",
    "addMeal": "식사 추가",
    "foodName": "음식 이름",
    "searchFood": "음식 검색",
    "recentFoods": "최근 음식",
    "mealType": "식사 종류",
    "servingCount": "제공량",
    "loggedAt": "기록 시각",
    "deleteConfirm": "이 식사 기록을 삭제하시겠습니까?",
    "analyzeImage": "사진으로 분석"
  },
  "medication": {
    "title": "약 관리",
    "todayChecklist": "오늘의 복약",
    "myMedications": "내 약 목록",
    "add": "약 추가",
    "noMedications": "등록된 약이 없습니다",
    "noLogsToday": "오늘 복약 일정이 없습니다",
    "name": "약 이름",
    "form": "약 형태",
    "form_ORAL": "경구",
    "form_INJECTION": "주사",
    "form_OTHER": "기타",
    "memo": "메모",
    "schedule": "복약 일정",
    "timeSlot": "복약 시간대",
    "timeSlot_MORNING": "아침",
    "timeSlot_LUNCH": "점심",
    "timeSlot_EVENING": "저녁",
    "timeSlot_BEDTIME": "취침 전",
    "condition": "복용 조건",
    "condition_FASTING": "공복",
    "condition_BEFORE_MEAL": "식전",
    "condition_AFTER_MEAL": "식후",
    "condition_ANY": "무관",
    "time": "시각",
    "dosage": "복용량",
    "status_TAKEN": "복용",
    "status_MISSED": "미복용",
    "status_SKIPPED": "건너뜀",
    "markTaken": "복용 완료로 표시",
    "markSkipped": "건너뜀으로 표시",
    "deleteConfirm": "이 약을 삭제하시겠습니까?",
    "adherenceRate": "복약 순응률",
    "summary": "복약 요약",
    "taken": "복용",
    "missed": "미복용",
    "skipped": "건너뜀",
    "addSchedule": "일정 추가",
    "editMedication": "약 수정",
    "color": "색상"
  },
  "settings": {
    "title": "설정",
    "profile": "프로필",
    "nickname": "닉네임",
    "notifications": "알림 설정",
    "version": "버전",
    "logout": "로그아웃"
  },
  "error": {
    "boundary": "앱에서 오류가 발생했습니다.",
    "boundaryDetail": "페이지를 새로고침해 주세요.",
    "network": "네트워크 연결을 확인해 주세요.",
    "unauthorized": "세션이 만료되었습니다. 다시 로그인해 주세요."
  }
}
```

---

## 21. components/OfflineBanner.tsx

```typescript
// components/OfflineBanner.tsx
// Shows a sticky banner when the browser reports offline status.
// Subscribes to online/offline events; uses useUIStore to sync global state.

import { useEffect, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useTranslation } from 'react-i18next';

export function OfflineBanner() {
  const { t } = useTranslation();
  const setOffline = useUIStore((s) => s.setOffline);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      setOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
      setOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '10px 16px',
        background: '#EF4444',
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: '0.875rem',
        fontWeight: 500,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      }}
    >
      {t('app.offline')}
    </div>
  );
}
```

---

## 22. components/ErrorBoundary.tsx

```typescript
// components/ErrorBoundary.tsx
// Standard React class error boundary.
// Catches errors in any child component tree and shows a fallback UI.

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            padding: '2rem',
            textAlign: 'center',
            background: '#F8FAFC',
            color: '#0F172A',
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            앱에서 오류가 발생했습니다
          </h2>
          <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {this.state.error?.message ?? '알 수 없는 오류입니다'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 2rem',
              background: '#10B981',
              color: '#FFFFFF',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Implementation Notes for Codex

1. **Workspace install**: Run `pnpm install` from the monorepo root after creating `apps/lair-health/`. The workspace protocol `"workspace:*"` entries will auto-link.

2. **miniapp-sdk import**: `@bug4city/miniapp-sdk` is at `packages/miniapp-sdk/`. Verify it is listed in the root `pnpm-workspace.yaml` packages glob (it should already be, as it follows the same pattern as other packages).

3. **BridgeInitData.userId**: The `BridgeInitData` type from `@bug4city/bridge` may or may not include `userId`. If it does not, derive `userId` from the JWT `token` via `atob` decode or leave it `null` — do not add it to the bridge type.

4. **Page scaffolds**: Create minimal placeholder `export function XxxPage()` components in each page file so the app compiles in Phase 1. Full UI implementation is Phase 3.

5. **No i18next backend plugin**: All strings are bundled in `ko.json`. Do not add `i18next-http-backend`.

6. **Port conflict check**: `apps/web` is on 5173, `apps/lair-health` is on 5175. If 5175 is taken, Vite will increment because `strictPort: false`.

7. **CSS-in-JS vs CSS**: This app uses inline `style={}` props (same pattern as `apps/web`). Do NOT add any CSS module or Tailwind dependency.
