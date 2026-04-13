이제 모든 핵심 파일을 읽었습니다. 시나리오별로 분석합니다.

---

## 시나리오별 테스트 결과

---

### 시나리오 1: 신규 사용자 온보딩

**예상 동작**: 앱 진입 → `/onboarding` 리다이렉트 → 약물/신체정보/목표 입력 → 홈 이동

**실제 동작 및 버그**:

| # | 파일:라인 | 심각도 | 설명 |
|---|----------|--------|------|
| 🐛1 | `OnboardingPage.tsx:179, 321-334` | HIGH | `dosingFrequency` (투약 주기)를 step 1에서 필수 입력받아 검증하지만, `handleComplete()` → `OnboardingData`에 포함되지 않아 **완전히 버려짐**. 사용자 입력이 저장 안 됨. |
| 🐛2 | `OnboardingPage.tsx:187-189, 321-334` | MED | `muscleMass`, `bodyFat` 수집하지만 BMR 계산에도 안 쓰이고 `OnboardingData`에도 없음. 사용자가 입력해도 무시됨. |
| 🐛3 | `OnboardingPage.tsx:172` | LOW | `useUIStore().completeOnboarding` — selector 없이 전체 store 구독. 리렌더 오버헤드 (다른 모든 페이지는 `useUIStore((s) => s.xxx)` 패턴 사용). |

**판정**: 시나리오 1 → **FAIL** (🐛1 데이터 유실)

---

### 시나리오 2: 식단 기록 플로우

**예상 동작**: 기록 탭 진입 → 날짜별 로그 표시 → 수정/저장/삭제

**실제 동작 및 버그**:

| # | 파일:라인 | 심각도 | 설명 |
|---|----------|--------|------|
| 🐛4 | `LogPage.tsx:109` | HIGH | 음식명 비어있을 때 `setActionError(t('meal.foodName'))` — `'meal.foodName'`은 에러 메시지가 아닌 **필드 레이블**. 화면에 "음식명" 또는 번역 키 그대로 출력됨. |
| 🐛5 | `LogPage.tsx:101-133` | HIGH | 저장 성공 후 **아무 피드백 없음**. `savingMap[id]`이 false로 돌아가지만 성공 toast/message 없음. 사용자가 저장됐는지 알 수 없음. |
| 🐛6 | `LogPage.tsx:154-156` | LOW | `{selectedDate}` 가 `<p>` 태그로 표시(154줄) + `<input type="date">` 로 다시 표시(168줄). **날짜 중복 렌더링**. |
| 🐛7 | `LogPage.tsx:136` | MED | 삭제 시 `window.confirm` 사용. iOS/Android에서 브라우저 네이티브 다이얼로그 = UX 단절. |
| 🐛8 | `LogPage.tsx:195-201` | MED | 빈 상태 카드에 CTA 없음. "오늘 기록이 없습니다"만 표시, 기록 추가 버튼 없음. |
| 🐛9 | `LogPage.tsx:315-332` | LOW | 저장 버튼 style에 `cursor: 'pointer'` 누락. 삭제 버튼(339줄)도 누락. |

**판정**: 시나리오 2 → **FAIL** (🐛4 에러 메시지 버그, 🐛5 저장 피드백 없음)

---

### 시나리오 3: 주간 리포트 확인

**예상 동작**: 리포트 탭 → 히트맵 12주 표시 → 주간 요약 → 프리미엄 공유카드 생성

**실제 동작 및 버그**:

| # | 파일:라인 | 심각도 | 설명 |
|---|----------|--------|------|
| 🐛10 | `ReportPage.tsx:183-194` | HIGH | 히트맵 셀에 `title` 속성만 존재, `aria-label` 없음. 스크린리더 접근 불가. 모바일 터치로는 tooltip 작동 안 함. |
| 🐛11 | `ReportPage.tsx:359-367` | **CRITICAL** | `impUid: \`imp-${Date.now()}\`` — **결제 검증 없이 클라이언트에서 imp_uid 생성**. 실제 iamport 결제 없이 프리미엄 설정 가능. 누구나 결제 없이 프리미엄 획득. |
| 🐛12 | `ReportPage.tsx:298-312` | HIGH | 결제 버튼 클릭 시 **금액 확인 UI 없음**. `onCheckout` 즉시 호출됨. 실수 클릭 방지 없음. |

**판정**: 시나리오 3 → **FAIL** (🐛11 결제 우회 가능)

---

### 시나리오 4: 프로필 설정 변경

**예상 동작**: 체중/약물 변경 저장 → 알림 설정 → CSV 전체 내보내기

**실제 동작 및 버그**:

| # | 파일:라인 | 심각도 | 설명 |
|---|----------|--------|------|
| 🐛13 | `ProfilePage.tsx:238-239` | HIGH | CSV 내보내기가 **오늘 날짜 1일치만** 내보냄: `fetchMealLogs(today)`. 전체 기록 내보내기 기능 아님. |
| 🐛14 | `ProfilePage.tsx:229-231` | MED | `setSaveMessage(t('profile.saved'))` 후 **타이머 없음**. 성공 메시지가 영구 표시. 다음 저장 전까지 사라지지 않음. |
| 🐛15 | `ProfilePage.tsx:34-39` | MED | `DRUG_OPTIONS` 레이블이 영문(`'wegovy'`)인데, 온보딩에서는 한국어(`'위고비'`) 표시. 같은 값이지만 UI 불일치. |
| 🐛16 | `ProfilePage.tsx:206-208` | LOW | 알림 prefs 변경 시 `useEffect`로 즉시 `writePrefs` 호출 — 저장 버튼 없이 **자동 저장**되지만, Push 권한 요청 없어 실제 알림 안 옴. |

**판정**: 시나리오 4 → **FAIL** (🐛13 CSV 데이터 유실)

---

## 발견된 버그 전체 목록

| 우선순위 | # | 파일:라인 | 버그 |
|---------|---|----------|------|
| P0 | 🐛11 | `ReportPage.tsx:359-367` | **결제 우회** — impUid 클라이언트 생성, 무료로 프리미엄 획득 가능 |
| P1 | 🐛1 | `OnboardingPage.tsx:179,321` | 투약 주기(dosingFrequency) 저장 안 됨 — 필수 입력인데 데이터 유실 |
| P1 | 🐛4 | `LogPage.tsx:109` | 에러 메시지로 필드 레이블 출력 (`t('meal.foodName')`) |
| P1 | 🐛5 | `LogPage.tsx:101-133` | 저장 성공 피드백 없음 |
| P1 | 🐛13 | `ProfilePage.tsx:238-239` | CSV 내보내기가 오늘 1일치만 내보냄 |
| P2 | 🐛12 | `ReportPage.tsx:298-312` | 결제 확인 UI 없음, 즉시 결제 실행 |
| P2 | 🐛7 | `LogPage.tsx:136` | `window.confirm` — 모바일 UX 단절 |
| P2 | 🐛14 | `ProfilePage.tsx:229-231` | 저장 성공 메시지 영구 표시 (타이머 없음) |
| P2 | 🐛2 | `OnboardingPage.tsx:187-189` | muscleMass/bodyFat 수집 후 버려짐 |
| P3 | 🐛10 | `ReportPage.tsx:183-194` | 히트맵 aria-label 없음 |
| P3 | 🐛6 | `LogPage.tsx:154-156` | 날짜 중복 표시 |
| P3 | 🐛15 | `ProfilePage.tsx:34-39` | 약물 레이블 한/영 불일치 |
| P3 | 🐛8 | `LogPage.tsx:195-201` | 빈 상태 CTA 없음 |
| P4 | 🐛3 | `OnboardingPage.tsx:172` | `useUIStore()` 전체 구독 |
| P4 | 🐛9 | `LogPage.tsx:315-332` | 버튼 `cursor: pointer` 누락 |
| P4 | 🐛16 | `ProfilePage.tsx:206-208` | 알림 설정 자동 저장이나 실제 Push 없음 |

---

## 수정 우선순위 요약

**즉시 수정 필요 (P0)**:
- 🐛11 결제 검증 로직 — iamport SDK 실제 연동 전까지 서버사이드 검증 필수

**Sprint 내 수정 (P1)**:
- 🐛1 `OnboardingData`에 `dosingFrequency` 추가
- 🐛4 `t('log.error.emptyFoodName')` 같은 전용 에러 키 사용
- 🐛5 `handleSave` 성공 후 toast 추가
- 🐛13 `fetchMealLogs` 전체 날짜 범위로 변경

**다음 Sprint (P2)**:
- 🐛12 결제 전 ConfirmModal
- 🐛7 `window.confirm` → ConfirmModal 컴포넌트
- 🐛14 `saveMessage` setTimeout 2초 후 clear
