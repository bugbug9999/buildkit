코드베이스를 충분히 파악했습니다. 상세 구현 설계서를 작성합니다.

---

# Lair Health — 5탭 구조 구현 설계서

## 사전 분석 메모 (코드베이스 기반)

- `apiFetch` = `fetchWithAuth` 별칭, `src/services/api.ts`에서 export
- `parseOrThrow<T>` 응답 구조: `{ data: T }` 래핑 가정
- `uiStore`에 `glp1Drug`, `glp1StartDate`, `weightKg` 이미 존재 → `userStore`는 이 필드들을 **uiStore에서 읽어** 초기화, PATCH 시 양쪽 동기화
- `storage` 유틸: `import { get, set } from '../lib/storage'` (src/lib/storage.ts)
- `BottomNav`의 아이콘 fontSize: 20px, label fontSize: 10px, minHeight: 56px 유지
- `MealLogData`에 `updateMealLog` API 존재 → LogPage 수정 모달에서 활용
- `mealStore.removeLog` 이미 존재, `editMealLog`는 **신규 추가 필요**

---

## 파일 1: `src/services/reportApi.ts` (신규)

### Imports
```ts
import { apiFetch, parseOrThrow } from './api';
```

### 타입 정의
```ts
export interface HeatmapDay {
  date: string;          // 'YYYY-MM-DD'
  count: number;         // 해당 날 로그 수 (0이면 빈 셀)
  caloriesKcal: number;
}

export interface HeatmapData {
  days: HeatmapDay[];    // 최대 weeks*7개 항목
  weeks: number;         // 요청한 주수
}

export interface WeeklyReport {
  weekStart: string;     // 'YYYY-MM-DD'
  weekEnd: string;
  totalLogs: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  streak: number;        // 연속 기록 일수
}

export interface ShareCard {
  shareCardUrl: string;  // 서버 생성 이미지 URL
  generatedAt: string;
}

export interface PremiumCheckout {
  checkoutUrl: string;   // 결제 페이지 URL (리다이렉트용)
  planId: string;
}
```

### 함수 시그니처 및 엔드포인트
```ts
// GET /health-api/api/report/heatmap?weeks=12
export async function fetchHeatmap(weeks: number): Promise<HeatmapData>

// GET /health-api/api/report/weekly
export async function fetchWeeklyReport(): Promise<WeeklyReport>

// POST /health-api/api/report/share-card  (body: {})
export async function generateShareCard(): Promise<ShareCard>

// POST /health-api/api/payment/checkout  (body: { planId: string })
export async function checkoutPremium(planId: string): Promise<PremiumCheckout>
```

### 구현 패턴 (fetchHeatmap 예시)
```ts
export async function fetchHeatmap(weeks: number): Promise<HeatmapData> {
  const res = await apiFetch(`/health-api/api/report/heatmap?weeks=${weeks}`);
  return parseOrThrow<HeatmapData>(res, 'fetch heatmap failed');
}
```

---

## 파일 2: `src/services/userApi.ts` (신규)

### Imports
```ts
import { apiFetch, parseOrThrow } from './api';
```

### 타입 정의
```ts
export interface UserProfile {
  userId: string;
  nickname: string;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  glp1Drug: string;
  glp1StartDate: string;
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
  subscriptionTier: 'free' | 'premium';
  notificationPrefs: NotificationPrefs;
  sharePrefs: SharePrefs;
}

export interface NotificationPrefs {
  mealReminderEnabled: boolean;
  hydrationReminderEnabled: boolean;
  reminderTime: string;   // 'HH:mm' 형식
}

export interface SharePrefs {
  showStreak: boolean;
  showProteinGoal: boolean;
  showDrugLabel: boolean;
}

export type PatchProfileInput = Partial<Omit<UserProfile, 'userId' | 'nickname' | 'subscriptionTier'>>;
```

### 함수 시그니처 및 엔드포인트
```ts
// GET /health-api/api/user/profile
export async function fetchUserProfile(): Promise<UserProfile>

// PATCH /health-api/api/user/profile  (body: PatchProfileInput)
export async function patchUserProfile(input: PatchProfileInput): Promise<UserProfile>
```

---

## 파일 3: `src/store/reportStore.ts` (신규)

### Imports
```ts
import { create } from 'zustand';
import {
  fetchHeatmap, fetchWeeklyReport, generateShareCard, checkoutPremium
} from '../services/reportApi';
import type { HeatmapData, WeeklyReport, ShareCard, PremiumCheckout } from '../services/reportApi';
```

### State 필드
```ts
interface ReportState {
  // 데이터
  heatmapData: HeatmapData | null;
  weeklyReport: WeeklyReport | null;
  latestShareCard: ShareCard | null;
  latestCheckout: PremiumCheckout | null;

  // 로딩 플래그 (각각 독립적으로 관리)
  isLoadingHeatmap: boolean;
  isLoadingWeekly: boolean;
  isGeneratingShareCard: boolean;
  isCheckingOutPremium: boolean;

  // 에러
  error: string | null;

  // 액션
  fetchHeatmap: (weeks: number) => Promise<void>;
  fetchWeekly: () => Promise<void>;
  generateShareCard: () => Promise<void>;
  checkoutPremium: (planId: string) => Promise<void>;
  clearError: () => void;
}
```

### 구현 패턴
각 액션은 독립 로딩 플래그를 set(true) → try/catch → set(false) 패턴:
```ts
fetchHeatmap: async (weeks) => {
  set({ isLoadingHeatmap: true, error: null });
  try {
    const data = await fetchHeatmap(weeks);
    set({ heatmapData: data, isLoadingHeatmap: false });
  } catch (e) {
    set({ error: (e as Error).message, isLoadingHeatmap: false });
  }
},
```

---

## 파일 4: `src/store/userStore.ts` (신규)

### Imports
```ts
import { create } from 'zustand';
import { get as storageGet, set as storageSet } from '../lib/storage';
import { fetchUserProfile, patchUserProfile } from '../services/userApi';
import type { UserProfile, PatchProfileInput, NotificationPrefs, SharePrefs } from '../services/userApi';
import { useUIStore } from './uiStore';  // 동기화용
```

### State 필드
```ts
interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  loadProfile: () => Promise<void>;
  patchProfile: (input: PatchProfileInput) => Promise<void>;
  logout: () => void;

  // localStorage 직접 접근 (알림/공유 설정은 로컬 우선)
  notificationPrefs: NotificationPrefs;
  sharePrefs: SharePrefs;
  setNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void;
  setSharePrefs: (prefs: Partial<SharePrefs>) => void;
}
```

### 초기값 전략
```ts
// profile.subscriptionTier 초기값: localStorage 'subscription-tier' 없으면 'free'
// notificationPrefs: localStorage 'notification-prefs' JSON 파싱, 없으면 default
// sharePrefs: localStorage 'share-prefs' JSON 파싱, 없으면 default

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  mealReminderEnabled: false,
  hydrationReminderEnabled: false,
  reminderTime: '12:00',
};

const DEFAULT_SHARE_PREFS: SharePrefs = {
  showStreak: true,
  showProteinGoal: true,
  showDrugLabel: false,
};
```

### patchProfile 동기화 로직
```ts
patchProfile: async (input) => {
  const updated = await patchUserProfile(input);
  set({ profile: updated });
  // uiStore와 동기화 (weight, goals, glp1 필드가 겹침)
  const uiStore = useUIStore.getState();
  if (input.weightKg !== undefined) uiStore.completeOnboarding({ ...uiStore, weightKg: input.weightKg });
  if (input.glp1Drug !== undefined || input.glp1StartDate !== undefined) {
    // uiStore setters 직접 호출 (setGoals 패턴 참조)
  }
},
```

> **주의**: `useUIStore.getState()` 직접 호출은 store 외부에서 안전. React 훅 규칙 비적용.

### logout 로직
```ts
logout: () => {
  storageSet('token', null);
  storageSet('onboarding-done', false);
  set({ profile: null });
  // window.location.href = '/onboarding' (라우터 밖이므로 직접 이동)
  window.location.href = '/onboarding';
},
```

---

## 파일 5: `src/pages/LogPage.tsx` (신규)

### Imports
```ts
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMealStore } from '../store/mealStore';
import { BottomNav } from '../components/BottomNav';
import { updateMealLog } from '../services/mealApi';
import type { MealLogData, UpdateMealLogInput } from '../services/mealApi';
```

### 컴포넌트 시그니처
```ts
export function LogPage(): ReactElement
```

### 필요한 mealStore 확장
`mealStore.ts`에 `editLog` 액션 추가 필요:
```ts
// mealStore.ts에 추가할 State 필드:
editLog: (id: string, input: UpdateMealLogInput) => Promise<void>;

// 구현:
editLog: async (id, input) => {
  const updated = await updateMealLog(id, input);
  set((s) => {
    const logs = s.todayLogs.map((l) => (l.id === id ? updated : l));
    return { todayLogs: logs, todaySummary: computeSummary(logs) };
  });
},
```

### 렌더링 로직
```
[레이아웃]
main (minHeight: 100dvh, background: #F8FAFC, paddingBottom: 88px)
  └── div (maxWidth: 430, margin: 0 auto, padding: 0 16px)
        ├── header: "식사 기록" + 날짜 선택기 (input[type=date], max=today)
        ├── [로딩] → Spinner
        ├── [비어있음] → "기록된 식사가 없습니다" + /meal/add 링크
        ├── [리스트] → 날짜별 MealLogItem 카드 목록
        │     └── 각 항목: 음식명, kcal/단백질/탄수화물/지방, 편집 버튼, 삭제 버튼
        └── FAB: Link to="/meal/add" (+아이콘, 고정 버튼)
BottomNav (fixed bottom)

[편집 모달 - EditMealModal]
  - 인라인 상태: editingLog: MealLogData | null
  - 모달 오버레이 (position: fixed, inset: 0, zIndex: 200, background: rgba(0,0,0,0.4))
  - form: foodName(text), caloriesKcal(number), proteinG(number), carbsG(number), fatG(number)
  - 저장: editLog(id, input) → setEditingLog(null)
  - 취소: setEditingLog(null)

[삭제 confirm]
  - 기존 ConfirmModal 컴포넌트 활용 (src/components/ConfirmModal.tsx)
  - onConfirm: removeLog(id)
```

### 날짜 선택 로직
```ts
// selectedDate는 mealStore에서 관리 (이미 존재)
const { todayLogs, selectedDate, setSelectedDate, loadTodayLogs, removeLog, editLog } = useMealStore();

useEffect(() => {
  void loadTodayLogs();
}, [selectedDate]);
```

---

## 파일 6: `src/pages/ReportPage.tsx` (신규)

### Imports
```ts
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useReportStore } from '../store/reportStore';
import { useUserStore } from '../store/userStore';
import { BottomNav } from '../components/BottomNav';
import { Spinner } from '../components/Spinner';
```

### 컴포넌트 시그니처
```ts
export function ReportPage(): ReactElement

// 서브 컴포넌트 (같은 파일 내 정의)
function HeatmapGrid({ days, weeks }: { days: HeatmapDay[]; weeks: number }): ReactElement
function WeeklyReportCard({ report }: { report: WeeklyReport }): ReactElement
function ShareCardView({ shareCard, isGenerating, onGenerate }: ShareCardViewProps): ReactElement
function PlanSelectionCard({ currentTier, onCheckout }: PlanSelectionCardProps): ReactElement
```

### HeatmapGrid 렌더링 로직
```
weeks × 7 = 84칸 그리드 (CSS grid: gridTemplateColumns: repeat(weeks, 1fr))
각 셀: width/height 비율 1:1, border-radius: 2px
색상 매핑:
  count === 0 → #E5E7EB (회색)
  count === 1 → #86EFAC (연초록)
  count === 2 → #34D399 (중초록)
  count >= 3  → #10B981 (진초록)

날짜 없는 빈 셀(미래 날짜): opacity 0.3
```

#### 그리드 구성 계산
```ts
// days 배열을 7×weeks 행렬로 변환
// 첫 번째 날의 요일(0=일,1=월...) offset 계산
// offset만큼 앞에 빈 셀 추가
// React: Array(weeks * 7).fill(null).map((_, i) => ...)
```

### WeeklyReportCard 구조
```
카드 (background: #fff, borderRadius: 20, padding: 20, border: 1px solid #E2E8F0)
  ├── 주간 범위 텍스트 (weekStart ~ weekEnd)
  ├── streak 배지 (🔥 N일 연속)
  ├── 통계 그리드 2×2:
  │     [총 기록 N회]  [평균 칼로리 Nkcal]
  │     [평균 단백질 Ng] [평균 탄수화물 Ng]
  └── (추후 확장 위한 여백)
```

### ShareCardView Props/로직
```ts
interface ShareCardViewProps {
  shareCard: ShareCard | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

// 렌더링:
// - shareCard 없음 + !isGenerating → "공유 카드 생성" 버튼
// - isGenerating → Spinner
// - shareCard 있음 → <img src={shareCardUrl} /> + "공유하기" 버튼
//   "공유하기": navigator.share({ url: shareCardUrl }) or window.open(shareCardUrl, '_blank')
//   Web Share API 미지원 시 fallback: navigator.clipboard.writeText(shareCardUrl)
```

### PlanSelectionCard Props/로직
```ts
const PLAN_OPTIONS = [
  { id: 'premium_monthly', label: '프리미엄 월간', price: '₩9,900/월' },
  { id: 'premium_yearly',  label: '프리미엄 연간', price: '₩79,900/년 (33% 절약)' },
];

interface PlanSelectionCardProps {
  currentTier: 'free' | 'premium';
  onCheckout: (planId: string) => void;
}

// currentTier === 'premium' → "현재 프리미엄 구독 중" 배지만 표시
// 'free' → 플랜 선택 라디오 버튼 + "업그레이드" 버튼
// onCheckout 호출 후: checkoutUrl → window.location.href = checkoutUrl (리다이렉트)
```

### ReportPage useEffect
```ts
useEffect(() => {
  void fetchHeatmap(12);
  void fetchWeekly();
}, []);
// loadProfile은 userStore에서 별도 호출 (ProfilePage 또는 앱 초기화 시)
```

---

## 파일 7: `src/pages/ProfilePage.tsx` (신규)

### Imports
```ts
import { useState, useEffect } from 'react';
import type { ReactElement, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
import { fetchMealLogs } from '../services/mealApi';
import { BottomNav } from '../components/BottomNav';
```

### DRUG_OPTIONS 상수
```ts
const DRUG_OPTIONS: { value: string; label: string }[] = [
  { value: 'wegovy',   label: '위고비 (세마글루타이드)' },
  { value: 'mounjaro', label: '마운자로 (티르제파타이드)' },
  { value: 'saxenda',  label: '삭센다 (리라글루타이드)' },
  { value: 'other',    label: '기타' },
];
```

### 컴포넌트 구조 (섹션별)
```
main
  └── div (maxWidth: 430)
        ├── header: "프로필"
        │
        ├── [섹션 1] 신체 정보
        │     ├── 체중 입력 (number input, 단위 kg)
        │     └── 목표 칼로리/단백질/탄수화물/지방 (GoalInput 재사용 → SettingsPage에서 import)
        │
        ├── [섹션 2] GLP-1 약물 설정
        │     ├── select: DRUG_OPTIONS
        │     └── input[type=date]: glp1StartDate
        │
        ├── [섹션 3] 알림 설정
        │     ├── toggle: mealReminderEnabled
        │     ├── toggle: hydrationReminderEnabled
        │     └── input[type=time]: reminderTime (mealReminderEnabled 시에만 표시)
        │
        ├── [섹션 4] 공유 카드 설정
        │     ├── toggle: showStreak
        │     ├── toggle: showProteinGoal
        │     └── toggle: showDrugLabel
        │
        ├── [섹션 5] 데이터 관리
        │     ├── CSV 내보내기 버튼
        │     └── 로그아웃 버튼 (빨간 텍스트)
        │
        └── 의료 면책 섹션 (SettingsPage와 동일)

BottomNav
```

### CSV 내보내기 로직
```ts
const handleExportCSV = async () => {
  const today = new Date().toISOString().slice(0, 10);
  // 전체 기간 데이터 필요 시 API에 날짜 범위 파라미터 추가 고려
  // 현재 mealApi는 단일 date만 지원 → 오늘 데이터만 내보내기 or
  // 루프로 최근 30일 fetch (별도 요청 30회) → 단순하게 오늘만으로 시작
  const logs = await fetchMealLogs(today);
  
  const header = 'date,foodName,caloriesKcal,proteinG,carbsG,fatG,loggedAt\n';
  const rows = logs.map(l =>
    `${today},"${l.foodName}",${l.caloriesKcal},${l.proteinG},${l.carbsG},${l.fatG},${l.loggedAt}`
  ).join('\n');
  
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lair-health-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

> `'\uFEFF'` = BOM 처리 (한글 깨짐 방지)

### 알림 toggle UI 패턴
```ts
// 토글 버튼 (checkbox 대신 커스텀 토글 — 44px 터치 타겟)
function ToggleSwitch({ value, onChange, label }: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}): ReactElement {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      style={{
        width: 51, height: 31, borderRadius: 15.5,
        background: value ? '#10B981' : '#E5E7EB',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', minHeight: 44,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: value ? 23 : 3,
        width: 25, height: 25, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}
```

### 저장 전략
- 체중/약물/목표: `patchProfile()` 호출 (debounce 500ms 또는 blur/change 시)
- 알림/공유 설정: `setNotificationPrefs()` / `setSharePrefs()` (localStorage 즉시 저장)
- 저장 성공 토스트: 간단한 인라인 상태 `savedFeedback: boolean` (2초 후 false)

---

## 파일 8: `src/components/BottomNav.tsx` (수정)

### 변경 사항
3탭 → 5탭. `/settings` 탭은 `/profile`로 대체됨.

### 새 NavItem 배열
```ts
const NAV_ITEMS = [
  { to: '/',          end: true,  icon: '🏠', labelKey: 'nav.home'       },
  { to: '/log',       end: false, icon: '📋', labelKey: 'nav.log'        },
  { to: '/medication',end: false, icon: '💊', labelKey: 'nav.medication' },
  { to: '/report',    end: false, icon: '📊', labelKey: 'nav.report'     },
  { to: '/profile',   end: false, icon: '👤', labelKey: 'nav.profile'    },
];
```

### 스타일 조정 (5탭 대응)
```ts
// 아이콘 fontSize: 20→18px (탭 5개로 좁아짐)
// label fontSize: 10px 유지
// minHeight: 56px 유지
// padding: '8px 0 10px' (상하 약간 줄임)
// 각 탭 최소 44px 터치 타겟 유지
```

### 추가할 i18n 키 (ko.json)
```json
"nav.log": "기록",
"nav.report": "리포트",
"nav.profile": "프로필"
```

> 기존 `nav.settings` 키는 SettingsPage가 Profile에 통합되므로 유지하되 사용 안 함.

---

## 파일 9: `src/App.tsx` (수정)

### 추가 lazy import
```ts
const LogPage       = lazy(() => import('./pages/LogPage'));
const ReportPage    = lazy(() => import('./pages/ReportPage'));
const ProfilePage   = lazy(() => import('./pages/ProfilePage'));
```

### 추가 Route (AppShell 내)
```tsx
<Route path="/log"     element={<LogPage />} />
<Route path="/report"  element={<ReportPage />} />
<Route path="/profile" element={<ProfilePage />} />
```

> 기존 `/settings` Route 유지 (ProfilePage로 리다이렉트 고려: `<Route path="/settings" element={<Navigate to="/profile" replace />} />`)

---

## ko.json 추가 키 목록

```json
"nav.log": "기록",
"nav.report": "리포트",
"nav.profile": "프로필",

"log.title": "식사 기록",
"log.empty": "이 날 식사 기록이 없습니다.",
"log.editTitle": "식사 수정",
"log.deleteConfirm": "이 식사 기록을 삭제할까요?",

"report.title": "주간 리포트",
"report.heatmap.title": "식사 히트맵",
"report.heatmap.empty": "히트맵 데이터를 불러오는 중...",
"report.weekly.streak": "{{count}}일 연속 기록 중",
"report.weekly.totalLogs": "총 기록",
"report.weekly.avgCalories": "평균 칼로리",
"report.weekly.avgProtein": "평균 단백질",
"report.weekly.avgCarbs": "평균 탄수화물",
"report.shareCard.title": "공유 카드",
"report.shareCard.generate": "공유 카드 생성",
"report.shareCard.share": "공유하기",
"report.plan.title": "프리미엄 플랜",
"report.plan.current": "현재 프리미엄 구독 중",
"report.plan.upgrade": "업그레이드",

"profile.title": "프로필",
"profile.body.title": "신체 정보",
"profile.weight": "체중",
"profile.drug.title": "GLP-1 약물",
"profile.drug.startDate": "투약 시작일",
"profile.notification.title": "알림 설정",
"profile.notification.meal": "식사 알림",
"profile.notification.hydration": "수분 섭취 알림",
"profile.notification.time": "알림 시간",
"profile.share.title": "공유 카드 설정",
"profile.share.streak": "연속 기록 표시",
"profile.share.protein": "단백질 목표 표시",
"profile.share.drug": "약물명 표시",
"profile.data.title": "데이터",
"profile.export.csv": "CSV 내보내기",
"profile.logout": "로그아웃",
"profile.saved": "저장되었습니다"
```

---

## mealStore.ts 수정 사항

`editLog` 액션 추가:

```ts
// MealState 인터페이스에 추가:
editLog: (id: string, input: UpdateMealLogInput) => Promise<void>;

// import에 추가:
import { updateMealLog } from '../services/mealApi';
import type { UpdateMealLogInput } from '../services/mealApi';

// 구현부에 추가:
editLog: async (id, input) => {
  const updated = await updateMealLog(id, input);
  set((s) => {
    const logs = s.todayLogs.map((l) => (l.id === id ? updated : l));
    return { todayLogs: logs, todaySummary: computeSummary(logs) };
  });
},
```

---

## 의존성 체크 (package.json 확인 불필요한 것들)

- `zustand`: 이미 사용 중 ✅
- `react-router-dom`: 이미 사용 중 ✅
- `react-i18next`: 이미 사용 중 ✅
- Web Share API: 브라우저 네이티브, 별도 패키지 불필요 ✅
- CSV Blob 다운로드: 브라우저 네이티브 ✅

---

## 빌드 검증 체크리스트

```bash
npm run build   # TypeScript strict + Vite build

# 체크 포인트:
# 1. reportStore/userStore의 import 경로 일치
# 2. mealStore에 editLog 추가 후 LogPage에서 구조분해 할당 가능
# 3. BottomNav의 nav.log, nav.report, nav.profile 번역키 ko.json에 존재
# 4. lazy import 경로 대소문자 일치 (macOS 케이스 민감)
# 5. UserProfile.subscriptionTier 타입이 PlanSelectionCard props와 일치
```

---

## 구현 순서 권장

1. `ko.json` 키 추가 (빌드 에러 방지)
2. `mealStore.ts` editLog 추가
3. `src/services/reportApi.ts` + `userApi.ts`
4. `src/store/reportStore.ts` + `userStore.ts`
5. `src/pages/LogPage.tsx`
6. `src/pages/ReportPage.tsx`
7. `src/pages/ProfilePage.tsx`
8. `src/components/BottomNav.tsx` (3→5탭)
9. `src/App.tsx` (라우트 추가)
10. `npm run build` 검증
