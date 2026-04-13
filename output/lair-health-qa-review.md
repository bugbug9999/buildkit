# lair-health QA 리뷰

> 검토일: 2026-04-10 | 대상: apps/lair-health/src/ 전 32파일

## 심각한 버그 (P0)

### 1. 라우팅 경로 불일치
**MealDashboardPage.tsx:340** — `navigate('/meal/add?mealType=...')` 호출하지만 App.tsx에 `/meal/add` 라우트 미정의. 식사 추가 버튼 클릭 시 `<Navigate to="/" replace />`로 홈으로 리다이렉트됨. MealAddPage 구현 또는 임시 경로 처리 필요.

### 2. i18n 파일 미구현
**i18n/i18n.ts** — 파일이 2줄(빈 상태). `package.json`에 `i18next`, `react-i18next` dependency 선언되어 있으나 초기화 코드 없음. 현재는 하드코딩 한국어로 동작하나 라이브러리 import 시 초기화 오류 발생 가능.

## 중요 이슈 (P1)

### 1. TimeSlotModal 버튼 터치 타겟 미달
**TimeSlotModal.tsx:54** — 닫기 버튼 `padding: 4` 뿐, `minHeight` 없음 (44px 미달)
**TimeSlotModal.tsx:106** — 시간대 선택 버튼 `minHeight: 36` (권장 44px 미달)

### 2. Lair SDK 인스턴스 혼재 (구조 혼란)
**lib/lairClient.ts** — `export { lair as lairClient }` re-export로 단일 인스턴스는 유지되나, 두 파일이 공존해 혼란. `api.ts`가 `lairClient.ts`에서 import, `main.tsx`는 `lair-client.ts`에서 import. 장기적으로 `lairClient.ts` 제거하고 `lair-client.ts`로 일원화 권장.

### 3. MedicationPage — loadLogs deps 배열
**MedicationPage.tsx:108-113** — `loadLogs`가 `useEffect` deps에 있으나, Zustand store에서 함수가 매 렌더마다 새 참조로 반환될 경우 무한 루프 가능. `useMedicationStore` 셀렉터로 직접 참조해야 안전.

### 4. localStorage 토큰 평문 저장
**lib/storage.ts** — `get<string>('token')`으로 토큰을 localStorage에 평문 저장. Lair Host App의 `getInitData()`가 주요 소스이고 fallback용이나, XSS 시 토큰 탈취 가능. 세션 스토리지 대체 또는 주석으로 위험 명시 권장.

## 권고 사항 (P2)

### 1. 하드코딩 색상 vs tokens.ts 혼재
**components/\*.tsx 전반** — `#10B981`, `#6B7280`, `#EF4444` 등 직접 사용. `tokens.ts`의 `COLORS.PRIMARY` 등을 활용하면 테마 변경 시 일원 관리 가능.

### 2. GOAL_CALORIES 하드코딩
**MealDashboardPage.tsx:17-22** — `GOAL_CALORIES=2000`, `GOAL_CARBS=250` 등 상수. SettingsPage에 "추후 업데이트 예정" 명시되어 있으나, 현재 설정 변경 불가. uiStore에 goalCalories 필드 추가 후 SettingsPage에서 수정 가능하게 연결 권장.

### 3. useCallback deps 최적화
**MealDashboardPage.tsx:150-162** — `goPrev`/`goNext`가 `[selDate, setSelectedDate]` 의존. `selDate`가 매 렌더마다 새 Date 객체이면 의미 없음. string 기반 `selectedDate`를 deps에 사용하는 게 적절.

### 4. CalendarView 무거운 연산
**CalendarView.tsx** — `buildCalendarMatrix`, `getDayStatus`, `getDayDots`가 렌더마다 반복 계산됨. `useMemo` 적용 권장 (달력 크기 최대 42셀 × 약수 × 약 로그 수).

### 5. MedicationPage — 빈 slot 처리
**MedicationPage.tsx:241** — `SLOT_ORDER.map` 결과 중 모든 slot이 비어있으면 빈 공간만 표시. "오늘 복약 항목이 없습니다" 문구 추가 권장.

### 6. OfflineBanner navigator.onLine 초기값
**OfflineBanner.tsx:6** — `useState(() => !navigator.onLine)` 초기값으로 서버 사이드 렌더링(SSR) 시 `navigator is not defined` 오류 가능. 현재 Vite CSR이므로 문제없으나 방어 코드 추가 권장.

## 점검 통과 항목 ✅

| 항목 | 결과 |
|------|------|
| Lair SDK lair.ready() 초기화 순서 | ✅ main.tsx Bootstrap에서 ensureLairReady() 호출 |
| closeMiniApp() 연동 | ✅ MealDashboardPage 헤더 ← 버튼 |
| miniapps.json lair-health 엔트리 | ✅ url/locales/category/featured 모두 정상 |
| 자체 로그인 코드 없음 | ✅ 완전 제거 확인 |
| 푸시 알림 코드(expo-notifications) 없음 | ✅ 완전 제거 확인 |
| dangerouslySetInnerHTML 없음 | ✅ |
| console.log 토큰 출력 없음 | ✅ 에러 로깅만 |
| XSS 위험 없음 | ✅ |
| any 타입 사용 없음 | ✅ (@ts-expect-error 정당한 사용 2곳) |
| useEffect 이벤트 리스너 cleanup | ✅ OfflineBanner removeEventListener 완비 |
| React 19 strict mode 위반 없음 | ✅ |
| API 경로 /health-api/api/... 일관 | ✅ |
| Zustand store ↔ 컴포넌트 연결 | ✅ |
| 라우팅 완전성 (P0 제외) | ✅ /medication/:id/edit 포함 |
| HTML 시맨틱 (main/section/nav/article) | ✅ 전반적으로 양호 |
| aria-label, role 대부분 준수 | ✅ |
| 모바일 375px overflow 위험 없음 | ✅ maxWidth 430px 제한 |

## 점수: 7.5/10 — FAIL

| 항목 | 점수 |
|------|------|
| Lair 미니앱 규격 | 9/10 (SDK 구조 혼재 -1) |
| React 19 + TypeScript strict | 9.5/10 (i18n 미구현 -0.5) |
| 웹 품질/접근성 | 8/10 (터치 타겟 미달, 색상 혼재) |
| 기능 완성도 | 7/10 (/meal/add 라우팅 버그 -2, 설정 저장 미구현 -1) |
| 보안 | 9/10 (localStorage 토큰 -1) |
| 잠재적 버그 | 8.5/10 (useEffect deps 주의) |

**판정: P0 2건 해결 후 재검수 필요. 수정 시 예상 점수 8.5–9.0 (PASS)**

### 즉시 수정 목록 (배포 전 필수)
1. **App.tsx**: `/meal/add` 라우트 추가 또는 MealDashboardPage navigate 경로 수정
2. **i18n/i18n.ts**: i18next 설정 구현 또는 파일/의존성 완전 제거
3. **TimeSlotModal.tsx:54**: 닫기 버튼 `minHeight: 44` 추가
4. **TimeSlotModal.tsx:106**: 시간대 선택 버튼 `minHeight: 44` 변경
