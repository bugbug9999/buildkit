## 레어헬스 UX 리뷰

---

### BottomNav.tsx

✅ **잘 된 점**
- `aria-label="하단 탭 네비게이션"` + 각 NavLink에 개별 aria-label 존재
- `minHeight: 56` — 터치 타겟 충분
- `env(safe-area-inset-bottom)` iPhone 노치 대응
- active 상태: color + border-top 이중 표시

⚠️ **개선 필요**

| 심각도 | 문제 | 수정 제안 |
|--------|------|-----------|
| MED | emoji `<span>` 에 `aria-hidden="true"` 없음 → VoiceOver가 "집 기호 홈" 이중 읽기 | `<span style={iconStyle} aria-hidden="true">🏠</span>` |
| LOW | label `fontSize: 10` — WCAG AA 권장 최소 12px | `fontSize: 11` 이상으로 올리기 |
| LOW | NavLink의 `aria-label`이 내부 텍스트와 중복 → 스크린리더가 두 번 읽음 | NavLink에서 aria-label 제거 (이미 텍스트 레이블 있음) |

---

### MealDashboardPage.tsx (홈)

✅ **잘 된 점**
- 닫기/날짜 이동 버튼 모두 44px 터치 타겟 준수
- 날짜 nav에 `aria-label="날짜 네비게이터"` 적용
- MealCardItem 추가 버튼에 `aria-label={${label} 추가}` 적절
- MacroCard: 현재값 + 목표값 동시 표시

⚠️ **개선 필요**

| 심각도 | 문제 | 수정 제안 |
|--------|------|-----------|
| HIGH | `getMealTypeFromLog`이 시간 기반 분류 — GLP-1 유저는 식사 시간이 불규칙, 23시 저녁은 '간식'으로 분류됨 | 로그 기록 시 meal type 직접 선택하게 변경 |
| MED | MacroBadge는 %만 표시, MacroCard는 g 표시 — 같은 페이지에서 정보 표현 방식 불일치 | MacroBadge에 `현재g / 목표g` 툴팁 또는 서브텍스트 추가 |
| MED | 전체 로딩 중 Spinner만 표시 — 어느 영역인지 불명확 | 각 MealCardItem에 skeleton UI 적용 |
| LOW | `activeTab` ('detail'/'overview') state 선언되어 있으나 UI에서 탭 전환 구현이 코드에 안 보임 | 미구현이면 상태 제거, 구현 예정이면 탭 UI 추가 |

---

### LogPage.tsx (기록)

✅ **잘 된 점**
- `savingMap`으로 항목별 저장 중 상태 분리 관리
- 삭제 전 `window.confirm` 확인 존재
- `actionError` / `error` 이중 에러 표시

⚠️ **개선 필요**

| 심각도 | 문제 | 수정 제안 |
|--------|------|-----------|
| HIGH | 저장 성공 후 아무 피드백 없음 — 버튼 눌러도 화면 변화 없음 | 저장 후 `setSaveMessage('저장되었습니다')` toast 2초 표시 |
| HIGH | 에러 메시지: `setActionError(t('meal.foodName'))` — 필드명을 에러로 표시하는 버그로 추정 | `t('log.error.emptyFoodName')` 같은 전용 키 사용 |
| HIGH | `window.confirm` — 모바일에서 네이티브 브라우저 다이얼로그 표시, UX 단절 | MedicationPage처럼 `ConfirmModal` 컴포넌트로 교체 |
| MED | 빈 상태 카드에 CTA 없음 — "오늘 기록이 없습니다" 뿐, 기록 추가 버튼 없음 | 빈 상태에 `→ 식사 기록하기` 버튼 추가 (홈 탭 이동) |
| MED | 로그 목록이 식사 유형별 그룹 없이 평면 나열 | 아침/점심/저녁/간식 섹션으로 groupBy |
| LOW | 날짜가 `<p>{selectedDate}</p>` + `<input value={selectedDate}>`로 중복 표시 | p 태그 제거 |

---

### MedicationPage.tsx (투약)

✅ **잘 된 점**
- DateDetailModal: `role="dialog"`, `aria-modal="true"`, `aria-label` 완비
- bottom sheet 드래그 핸들(회색 바) 존재
- 어제 미복약 항목 prominently 표시
- 에러 상태에 재시도 버튼
- `ConfirmModal`로 취소 확인

⚠️ **개선 필요**

| 심각도 | 문제 | 수정 제안 |
|--------|------|-----------|
| HIGH | ConfirmModal 버튼 레이블 "취소 / 아니오" — "취소"가 액션(복약 취소)인지 닫기인지 모호 | `confirmText="복약 취소"`, `cancelText="유지"` |
| MED | 취소 시 `status: 'MISSED'` 설정 — 의도적 취소와 실제 미복약이 동일 상태로 기록됨 | `status: 'CANCELLED'` 또는 `'SKIPPED'` 별도 구분 |
| MED | 캘린더 로드 범위 ±14일 고정 — 월 이동 시 데이터 없음 | 월 이동 시 `loadLogs` 재호출 (calYear/calMonth useEffect 연동) |
| LOW | bottom sheet 배경 닫기 버튼이 `<button>` — 스타일 없어서 시각적으로 불투명 버튼처럼 렌더링될 수 있음 | `appearance: 'none'` 명시 |

---

### ReportPage.tsx (리포트)

✅ **잘 된 점**
- `useMemo`로 히트맵 셀 최적화
- 히트맵 4단계 색상 그라디언트 (없음 → 연초록 → 진초록)
- WeeklyReportCard: 총 기록수, 평균 칼로리, 평균 단백질, 연속일 4가지 핵심 지표
- `primaryButtonStyle`에 `minHeight: 44` 준수

⚠️ **개선 필요**

| 심각도 | 문제 | 수정 제안 |
|--------|------|-----------|
| HIGH | 히트맵 셀에 `title` 속성만 — 모바일 touch에서 hover tooltip 작동 안 함 | 셀 tap 시 날짜+기록수 표시하는 popover 또는 셀 클릭 → LogPage로 이동 |
| HIGH | 히트맵 셀에 `aria-label` 없음 — 스크린리더 접근 불가 | `aria-label={${cell.date} 기록 ${cell.count}개}` |
| MED | WeeklyReport에 단백질 목표 달성률 없음 — GLP-1 유저에게 단백질이 핵심 지표인데 절댓값만 표시 | `avgProtein / goalProtein` % bar 추가 |
| MED | 프리미엄 플랜 가격(9900원)이 버튼 외부에만 있고, 결제 확인 UI 없음 | 결제 클릭 시 금액 확인 ConfirmModal 추가 |
| LOW | 히트맵 색상 4단계: 0/1/2/3+ — count=3과 count=30이 동일색 | 5단계로 세분화 또는 로그 칼로리 기반 intensity |

---

### ProfilePage.tsx (프로필)

✅ **잘 된 점**
- `inputStyle`에 `minHeight: 44` 적용
- `CheckboxRow`에 `minHeight: 44`
- CSV 내보내기 기능
- `saveMessage` 상태로 저장 성공 피드백 준비

⚠️ **개선 필요**

| 심각도 | 문제 | 수정 제안 |
|--------|------|-----------|
| MED | `DRUG_OPTIONS` 레이블이 영문(wegovy, mounjaro) — 한국어 UI에서 설명 없이 약 이름만 나열 | `{ value: 'wegovy', label: '위고비 (Wegovy)' }` |
| MED | 알림 설정이 localStorage만 저장 — 실제 Push 권한 요청 없음, 유저가 설정해도 알림 안 옴 | `Notification.requestPermission()` 호출 또는 "앱 알림 설정 필요" 안내 문구 |
| MED | 체중 입력 필드에 단위 표시 없음 | placeholder="70" 옆에 `kg` 단위 레이블 또는 suffix |
| LOW | GLP-1 시작일 미래 날짜 허용 — validation 없음 | `max={new Date().toISOString().slice(0,10)}` |
| LOW | 로그아웃 버튼 존재하나 계정 삭제 옵션 없음 — GDPR/개인정보 처리방침 측면 | 설정 하단에 "계정 탈퇴" 링크 추가 |

---

## 전체 UX 점수: **6.5 / 10**

> 기본 구조와 접근성 기반은 탄탄하나, 인터랙션 피드백과 GLP-1 특화 UX에서 개선 여지 큼.

---

## 우선순위 TOP 5

| 순위 | 탭 | 이슈 | 심각도 |
|------|-----|------|--------|
| 1 | 기록 | **저장 성공 피드백 없음** — 사용자가 저장됐는지 알 방법 없음 | HIGH |
| 2 | 기록 | **`window.confirm` 삭제 다이얼로그** — 모바일 UX 단절 | HIGH |
| 3 | 홈 | **시간 기반 식사 분류** — GLP-1 유저 식사 패턴과 불일치 | HIGH |
| 4 | 투약 | **"취소/아니오" 모호한 버튼 레이블** — 복약 취소인지 닫기인지 불명확 | HIGH |
| 5 | 리포트 | **히트맵 모바일 터치 상호작용 없음** — `title` tooltip은 데스크탑 전용 | HIGH |
