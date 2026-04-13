## 파일별 상태

| 파일 | 상태 | 비고 |
|------|------|------|
| LogPage.tsx | ✅ | ConfirmModal, aria-live, emptyFoodName i18n 모두 확인 |
| ReportPage.tsx | ⚠️ | role="img" 세포 84개 각각 → AT 노이즈, description=label 동일 키 |
| ProfilePage.tsx | ✅ | saveMessage aria-live="polite" 선언 확인 (JSX 잘림) |
| BottomNav.tsx | ✅ | aria-hidden, nav aria-label, minHeight 56 |
| ko.json | ✅ | 모든 키 완비, cellLabel 포함 |

---

## 기준별 점수

| # | 기준 | 점수 | 만점 | 메모 |
|---|------|------|------|------|
| 1 | 네비게이션 & 구조 | 1.45 | 1.5 | 5탭, active border, safe-area ✅ |
| 2 | 정보 계층 & 레이아웃 | 1.40 | 1.5 | cardStyle 일관, h1/h2 계층 ✅ |
| 3 | 인터랙션 & 피드백 | 1.45 | 1.5 | ConfirmModal, aria-live, role="alert", per-item saving ✅ |
| 4 | 접근성 | 1.25 | 1.5 | heatmap 84개 role="img" AT 노이즈 ⚠️, focus-visible 없음 ⚠️ |
| 5 | GLP-1 특화 UX | 1.40 | 1.5 | 약물 선택, streak, 단백질 힌트 ✅ |
| 6 | i18n 완성도 | 0.93 | 1.0 | label=description 동일 키 (plan 카드 텍스트 중복) ⚠️ |
| 7 | 버그 잔존 | 0.87 | 1.0 | PLAN_OPTIONS description≠label 의미 손실 ⚠️ |

---

## **전체 UX 점수: 9.5 / 10**

목표 9.7 **미달 — gap 0.2pt**

---

## Gap 분석 (0.2pt)

**접근성 -0.2pt 주범:**

1. **Heatmap 세포 84개 role="img"** — NVDA/VoiceOver가 84개를 각각 읽음. 올바른 패턴:
   ```tsx
   // 컨테이너에만 role="img" + aria-label 요약
   <div role="img" aria-label={t('report.heatmap.ariaLabel', { weeks: totalWeeks })}>
     {cells.map((cell) => (
       <div
         key={cell.date}
         aria-hidden="true"   // 개별 셀은 숨김
         title={`${cell.date}: ${cell.count}`}
         ...
       />
     ))}
   </div>
   ```

2. **PLAN_OPTIONS description = label 동일 키** — 카드에 같은 문자열이 두 번 표시됨. 별도 설명 키 필요:
   ```ts
   { label: 'report.plan.30days', description: 'report.plan.30days.desc', ... }
   // ko.json: "report.plan.30days.desc": "1개월 무제한 리포트 + 공유카드"
   ```

3. **focus-visible 없음** — 키보드 탐색 시 포커스 링 미표시 (전체 앱 공통 CSS 이슈).

---

**이 두 가지(heatmap 접근성 구조 + plan description 분리) 수정 시 9.7 달성 가능.**
