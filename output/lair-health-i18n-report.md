분석 완료. 결과를 정리합니다.

---

## 번역 누락/문제 분석 결과

### 1. nav.* 키 체크 (체크리스트 #1)

| 키 | ko.json 존재 여부 |
|---|---|
| `nav.home` | ✅ "홈" |
| `nav.log` | ✅ "기록" |
| `nav.medication` | ✅ "복약" |
| `nav.report` | ✅ "리포트" |
| `nav.profile` | ✅ "프로필" |

---

### 2. 하드코딩된 한국어 → t() 변환 필요 (체크리스트 #2)

| 파일 | 라인 | 하드코딩 텍스트 | 변환 방법 |
|---|---|---|---|
| `LogPage.tsx` | 198 | `오늘 기록이 없습니다` | `t('log.empty')` (키 존재, 텍스트만 불일치) |
| `ReportPage.tsx` | 40–41 | `'30일 프리미엄'`, `'90일 프리미엄'` | `t('report.plan.30days')` 등 신규 키 |
| `ReportPage.tsx` | 165 | `{report.streak}일` | `t('report.weekly.streak', { count: report.streak })` (키 존재, 미사용) |
| `ReportPage.tsx` | 181 | `{totalWeeks \|\| 12}주` | `t('report.heatmap.weeks', { count })` 신규 키 |
| `ReportPage.tsx` | 213 | `프리미엄 사용자만 공유 카드를 생성할 수 있습니다.` | `t('report.shareCard.premiumOnly')` 신규 키 |
| `ReportPage.tsx` | 243 | `생성` | `t('report.shareCard.generate')` 신규 키 |
| `ProfilePage.tsx` | 284 | `` `권장 단백질 목표 ${suggestedProteinGoal}g` `` | `t('profile.body.proteinGoalHint', { g: suggestedProteinGoal })` 신규 키 |
| `BottomNav.tsx` | 28 | `aria-label="하단 탭 네비게이션"` | `t('nav.ariaLabel')` 신규 키 |

---

### 3. t() 호출하지만 ko.json에 없는 키 (체크리스트 #3)

| 키 | 사용 위치 | 문제 |
|---|---|---|
| `log.error.emptyFoodName` | 존재하지 않음 | `LogPage.tsx:109`에서 `t('meal.foodName')` ("음식명")을 에러 메시지로 사용 — **버그** |

현재 코드:
```ts
setActionError(t('meal.foodName'));  // "음식명"이 에러로 표시됨 ← 버그
```
올바른 코드:
```ts
setActionError(t('log.error.emptyFoodName'));
```

---

### 4. ko.json에 추가해야 할 내용

```json
{
  "log.error.emptyFoodName": "음식명을 입력해 주세요.",

  "report.weekly.streak": "{{count}}일 연속",

  "report.shareCard.premiumOnly": "프리미엄 사용자만 공유 카드를 생성할 수 있습니다.",
  "report.shareCard.generate": "생성",

  "report.plan.30days": "30일 프리미엄",
  "report.plan.90days": "90일 프리미엄",

  "report.heatmap.weeks": "{{count}}주",

  "profile.body.proteinGoalHint": "권장 단백질 목표 {{g}}g",

  "nav.ariaLabel": "하단 탭 네비게이션"
}
```

> **참고**: `log.empty`("이 날 식사 기록이 없습니다.")는 ko.json에 이미 있는데, LogPage.tsx:198에서 `t()` 없이 `오늘 기록이 없습니다`로 하드코딩됨. `t('log.empty')`로 교체하면 해결됨 (텍스트는 ko.json 쪽이 맞음).

---

### 요약

- **누락 키**: `log.error.emptyFoodName` (1개 — 버그 수준)
- **존재하지만 미사용 키**: `report.weekly.streak` (하드코딩 `{count}일`로 대신 씀)
- **신규 추가 필요 키**: 7개 (위 JSON 참고)
- **하드코딩 → t() 교체 필요**: 8곳
