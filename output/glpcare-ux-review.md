## 코드 리뷰 결과

---

점수: **6/10**

---

### 심각한 버그

- **[GLP-Care 위반] NativeWind `className` 전혀 미사용**: 두 파일 모두 `StyleSheet.create()` + `style={}` 100% 사용. GLP-Care 제약(NativeWind 사용) 위반. 전면 재작성 필요 수준.

- **날짜 변경 시 데이터 미갱신** (`index.tsx:151`): `fetchTodaySummary()`가 `selectedDate`를 인자로 받지 않음. 날짜를 바꿔도 항상 오늘 데이터만 fetch함.
  ```ts
  // 현재
  useEffect(() => { void fetchTodaySummary(); }, [selectedDate]);
  // fetchTodaySummary에 selectedDate 전달 없음 → 날짜 네비게이터 기능 사실상 무동작
  ```

- **탄/단/지 퍼센트 계산 방식 불일치** (`index.tsx:32`): `getMacroPercent`는 각 영양소의 **목표 달성률**을 반환함. 검토 항목 요구사항인 **totalMacroG 합산 기준** (탄+단+지 전체 중 비율) 이 아님.
  ```ts
  // 현재: current/goal × 100 (달성률)
  // 요구: current / (totalCarbsG + totalProteinG + totalFatG) × 100 (비율)
  ```

---

### 수정 권고

- **`renderFoodItem` useCallback 누락** (`add.tsx:215`): FlatList의 `renderItem`으로 전달되는데 useCallback 없이 매 렌더마다 새 함수 생성됨.

- **`containerStyle/valueStyle` 타입 부정확** (`index.tsx:77,90`): prop 타입이 `object`로 너무 느슨함. `StyleProp<ViewStyle>` / `StyleProp<TextStyle>` 사용 권장.

- **`handleManualSubmit` void 처리 누락** (`add.tsx:175`): async 함수를 `onPress`에 직접 전달 시 Promise가 floating됨. `onPress={() => void handleManualSubmit()}` 형태로 감싸야 함.

- **FlatList keyExtractor index 의존** (`add.tsx:71`): `externalId` 없을 경우 index 포함 key 사용 → 리스트 변경 시 reconciliation 오류 가능. `foodName` 단독 사용 권장.

---

통과 여부: **FAIL**

> NativeWind className 미사용(GLP-Care 핵심 제약 위반), 날짜-데이터 연동 버그, 퍼센트 계산 스펙 불일치 — 3개 항목이 심각한 버그로 분류됨.
