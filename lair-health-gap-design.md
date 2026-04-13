이제 전체 그림이 잡혔다. 설계서를 작성하겠다.

---

## 주의: 현황 차이 2가지

1. **MealAddPage 없음** — 현재 `/log` → `LogPage.tsx`. `Mode = 'search' | 'manual' | 'detail'`도 없음. **새 파일 `MealAddPage.tsx` 생성 + App.tsx에 라우트 추가** 필요.
2. **h1 텍스트** — 현재 MealDashboardPage의 h1은 `식단 대시보드`. `칼로리 케어`로 변경 포함.

---

## 기능 1: `MealDashboardPage.tsx` 수정

### 변경 요약
- `useUIStore` → `glp1StartDate` 읽기
- `useReportStore` → `weeklyReport?.streak` 읽기
- h1 텍스트 `식단 대시보드` → `칼로리 케어` (요구사항 기준)
- chip row를 h1 바로 아래, `<nav>` 위에 삽입
- 조건: `glp1StartDate && streak` 둘 다 있을 때만 렌더

### 코드 스니펫

**추가 import:**
```typescript
import { useUIStore } from '../store/uiStore';
import { useReportStore } from '../store/reportStore';
```

**컴포넌트 상단 (로직):**
```typescript
export function MealDashboardPage() {
  const glp1StartDate = useUIStore((s) => s.glp1StartDate);
  const weeklyReport = useReportStore((s) => s.weeklyReport);

  const glp1Day = glp1StartDate
    ? Math.floor((Date.now() - new Date(glp1StartDate).getTime()) / 86_400_000) + 1
    : null;
  const streak = weeklyReport?.streak ?? null;

  const showChips = glp1Day !== null && streak !== null;
  // ...
```

**h1 변경 + chip row 삽입 위치** (`<h1>` 다음, `<nav>` 직전):
```tsx
<h1 style={{ margin: '8px 0 0', fontSize: '1.9rem', lineHeight: 1.2 }}>칼로리 케어</h1>

{showChips && (
  <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 12px', borderRadius: '999px',
      backgroundColor: 'rgba(20, 184, 166, 0.18)',
      color: '#0d9488', fontSize: '0.8125rem', fontWeight: 700,
    }}>
      GLP-1 Day {glp1Day}
    </span>
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 12px', borderRadius: '999px',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      color: '#b45309', fontSize: '0.8125rem', fontWeight: 700,
    }}>
      🔥 {streak}일 연속
    </span>
  </div>
)}

<nav style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
```

---

## 기능 3: `mealStore.ts` 수정 (기능 2보다 먼저)

### 변경 요약
- import에 `getAnalyzeUploadUrl`, `analyzeMealImage`, `AnalyzeResult` 추가
- `interface MealState`에 `quotaRemaining`, `analyzeImage` 추가
- 초기값 및 액션 구현 추가

### 코드 스니펫

**import 변경 (기존 3줄 → 5줄):**
```typescript
import {
  fetchMealLogs,
  createMealLog,
  deleteMealLog,
  getAnalyzeUploadUrl,
  analyzeMealImage,
} from '../services/mealApi';
import type { MealLogData, CreateMealLogInput, AnalyzeResult } from '../services/mealApi';
```

**interface 추가:**
```typescript
interface MealState {
  todayLogs: MealLogData[];
  loading: boolean;
  error: string | null;
  selectedDate: string;
  quotaRemaining: number | null;          // ← 추가
  loadTodayLogs: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  addLog: (input: CreateMealLogInput) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  analyzeImage: (file: File) => Promise<AnalyzeResult>;  // ← 추가
}
```

**초기값 추가 (store 생성자 객체):**
```typescript
quotaRemaining: null,
```

**액션 추가 (removeLog 다음):**
```typescript
analyzeImage: async (file: File) => {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const { uploadUrl, fileUrl } = await getAnalyzeUploadUrl(ext);
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  const result = await analyzeMealImage(fileUrl);
  set({ quotaRemaining: result.quotaRemaining });
  return result;
},
```

---

## 기능 2: `MealAddPage.tsx` 신규 생성

### 파일 위치
`src/pages/MealAddPage.tsx`

### Mode 설계
```
탭 레이어:
  '검색/직접입력' → mode: 'search' | 'manual' | 'detail'  (기존 검색/수동 흐름)
  'AI 분석'       → mode: 'analyze'                       (신규)

activeTab: 'search' | 'analyze'  ← 상위 탭 상태
mode: 'search' | 'manual' | 'detail' | 'analyze'  ← 하위 세부 상태 (activeTab='search'일 때만 의미있음)
```

### 전체 컴포넌트 코드

```typescript
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import type { AnalyzeResult } from '../services/mealApi';
import { useMealStore } from '../store/mealStore';
import { useUIStore } from '../store/uiStore';

type ActiveTab = 'search' | 'analyze';

const S = {
  page: { minHeight: '100dvh', background: '#F8FAFC', fontFamily: '"Noto Sans KR", sans-serif' } as const,
  wrap: { maxWidth: 430, margin: '0 auto', padding: '24px 20px 40px' } as const,
  tabRow: { display: 'flex', gap: 4, marginBottom: 20, background: '#F1F5F9', borderRadius: 14, padding: 4 } as const,
  card: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as const,
  input: {
    width: '100%', minHeight: 44, border: '1px solid #CBD5E1',
    borderRadius: 12, padding: '0 12px', background: '#fff',
    color: '#0F172A', boxSizing: 'border-box' as const, fontSize: 15,
  },
  btnPrimary: {
    width: '100%', minHeight: 48, border: 'none', borderRadius: 14,
    background: '#0F172A', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  } as const,
  btnSecondary: {
    width: '100%', minHeight: 48, border: '1px solid #CBD5E1', borderRadius: 14,
    background: '#fff', color: '#334155', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  } as const,
};

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, minHeight: 38, border: 'none', borderRadius: 10, cursor: 'pointer',
        background: active ? '#ffffff' : 'transparent',
        color: active ? '#0F172A' : '#64748B',
        fontWeight: active ? 700 : 500,
        fontSize: 14,
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

export default function MealAddPage() {
  const navigate = useNavigate();
  const addLog = useMealStore((s) => s.addLog);
  const analyzeImage = useMealStore((s) => s.analyzeImage);
  const quotaRemaining = useMealStore((s) => s.quotaRemaining);
  const selectedDate = useMealStore((s) => s.selectedDate);

  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  // ── AI 분석 탭 상태 ──────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzeResult(null);
    setAnalyzeError(null);
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeImage(selectedFile);
      setAnalyzeResult(result);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '분석 실패');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAddFromAnalyze() {
    if (!analyzeResult) return;
    setAdding(true);
    try {
      await addLog({
        loggedAt: new Date(selectedDate).toISOString(),
        foodName: analyzeResult.foodName,
        caloriesKcal: analyzeResult.caloriesKcal,
        proteinG: analyzeResult.proteinG,
        carbsG: analyzeResult.carbsG,
        fatG: analyzeResult.fatG,
      });
      navigate(-1);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '기록 실패');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>
          식사 추가
        </h1>

        {/* 상위 탭 */}
        <div style={S.tabRow}>
          <TabButton
            label="검색 / 직접입력"
            active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
          />
          <TabButton
            label="AI 분석"
            active={activeTab === 'analyze'}
            onClick={() => setActiveTab('analyze')}
          />
        </div>

        {/* ── 검색/직접입력 탭 (기존 search/manual/detail 흐름 자리) ── */}
        {activeTab === 'search' && (
          <div style={S.card}>
            <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>
              검색 및 직접입력 UI가 이 영역에 위치합니다.
            </p>
          </div>
        )}

        {/* ── AI 분석 탭 ── */}
        {activeTab === 'analyze' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* 파일 선택 */}
            <div style={S.card}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                style={S.btnSecondary}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? '📷 사진 다시 선택' : '📷 사진 선택 (카메라 / 갤러리)'}
              </button>

              {/* 썸네일 미리보기 */}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="선택된 식사 사진"
                  style={{
                    width: '100%', aspectRatio: '4/3', objectFit: 'cover',
                    borderRadius: 12, marginTop: 12,
                  }}
                />
              )}

              {/* 분석하기 버튼 */}
              {selectedFile && !analyzeResult && (
                <button
                  type="button"
                  style={{ ...S.btnPrimary, marginTop: 12 }}
                  onClick={() => { void handleAnalyze(); }}
                  disabled={analyzing}
                >
                  {analyzing ? <Spinner /> : '분석하기'}
                </button>
              )}
            </div>

            {/* 에러 메시지 */}
            {analyzeError && (
              <p style={{ margin: 0, color: '#DC2626', fontSize: 14, padding: '0 4px' }}>
                {analyzeError}
              </p>
            )}

            {/* 결과 카드 */}
            {analyzeResult && (
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                    {analyzeResult.foodName}
                  </span>
                  <span style={{
                    fontSize: 12, padding: '3px 10px', borderRadius: 999,
                    background: analyzeResult.confidence >= 0.8 ? '#DCFCE7' : '#FEF9C3',
                    color: analyzeResult.confidence >= 0.8 ? '#166534' : '#854D0E',
                    fontWeight: 600,
                  }}>
                    신뢰도 {Math.round(analyzeResult.confidence * 100)}%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: '칼로리', value: `${analyzeResult.caloriesKcal}kcal` },
                    { label: '단백질', value: `${analyzeResult.proteinG}g` },
                    { label: '탄수화물', value: `${analyzeResult.carbsG}g` },
                    { label: '지방', value: `${analyzeResult.fatG}g` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: 'center', background: '#F8FAFC', borderRadius: 10, padding: '8px 4px' }}>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {quotaRemaining !== null && (
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94A3B8' }}>
                    남은 분석 횟수: {quotaRemaining}회
                  </p>
                )}

                <button
                  type="button"
                  style={S.btnPrimary}
                  onClick={() => { void handleAddFromAnalyze(); }}
                  disabled={adding}
                >
                  {adding ? '저장 중...' : '기록 추가'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## App.tsx 수정 (라우트 추가)

```typescript
// lazy import 추가
const MealAddPage = lazy(() => import('./pages/MealAddPage'));

// Routes 안에 추가
<Route path="/meal/add" element={<MealAddPage />} />
```

---

## 변경 파일 요약

| 파일 | 작업 | 핵심 변경 |
|------|------|-----------|
| `src/pages/MealDashboardPage.tsx` | **수정** | `glp1StartDate` → Day 계산, `weeklyReport.streak` 읽기, chip row 삽입, h1 텍스트 변경 |
| `src/store/mealStore.ts` | **수정** | import 2개 추가, `quotaRemaining` state, `analyzeImage` action |
| `src/pages/MealAddPage.tsx` | **신규 생성** | 탭 2개(검색/AI분석), AI분석 전체 플로우 |
| `src/App.tsx` | **수정** | lazy import + `/meal/add` 라우트 |

---

## 주의사항

1. **MealDashboardPage의 `fetchWeekly` 호출 없음** — `weeklyReport`가 이미 fetch된 경우에만 streak를 보여주는 조건이므로, store 액션 호출 불필요 (요구사항 그대로). 다른 페이지(ReportPage 등)에서 먼저 fetch되어 있어야 표시됨.
2. **`capture="environment"` 속성** — iOS Safari는 이 속성이 있으면 카메라를 기본으로 열고, 없으면 갤러리. 양쪽 선택을 허용하려면 `capture` 속성을 **제거**하고 OS 기본 파일 선택기를 사용하는 게 더 범용적. 요구사항대로 넣되 실기기 테스트 권장.
3. **Object URL 해제** — `previewUrl`이 교체되거나 컴포넌트 언마운트 시 `URL.revokeObjectURL()` 호출이 없으면 메모리 누수. `useEffect` cleanup 추가 고려.
4. **MealAddPage의 검색/직접입력 탭** — 현재 LogPage에는 `search/manual/detail` 모드가 없으므로 해당 UI는 별도 설계 필요. 위 코드에서 placeholder로 처리.
