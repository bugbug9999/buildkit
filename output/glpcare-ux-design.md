코드 파악 완료. 설계서 작성합니다.

---

# GLP-Care 칼로리 앱 UX 설계서 v2.0

> Codex 구현 기준 문서. 기존 코드 대비 변경점 명확히 표기.

---

## 화면 1: 메인 대시보드 `(tabs)/index.tsx`

### 컴포넌트 트리

```
<SafeAreaView>                          ← root, bg #F8FAFC
  <ScrollView>
    <DateNavigator />                   ← [신규] 날짜 네비게이터
    <ViewTabBar />                      ← [신규] 자세히/한눈에 탭
    <View card>                         ← 기존 card 스타일 유지
      <CalorieGauge />                  ← [수정] SVG 크기 업그레이드
      <RemainingBanner />               ← [신규] 남은 칼로리 배너
      <MacroBadgeRow />                 ← [신규] 탄/단/지 퍼센트 배지
    </View>
    <MotivationMessage />               ← [신규] 상황별 메시지
    <View macroRow>                     ← 기존 3열 MacroCard 유지
      <MacroCard 탄수화물 />
      <MacroCard 단백질 />
      <MacroCard 지방 />
    </View>
    <Text sectionHeader>기록하기</Text>
    <MealGrid>                          ← [수정] 세로 나열 → 2x2 그리드
      <MealGridCard 아침 />
      <MealGridCard 점심 />
      <MealGridCard 저녁 />
      <MealGridCard 간식 />
    </MealGrid>
  </ScrollView>
</SafeAreaView>
```

---

### 핵심 State

```ts
// 기존 유지
const { todaySummary, fetchTodaySummary } = useMealStore();

// [신규] 날짜 네비게이터
const [selectedDate, setSelectedDate] = useState<Date>(new Date());
// isToday = selectedDate.toDateString() === new Date().toDateString()

// [신규] 탭 상태 (현재 '자세히'만 구현, '한눈에'는 TODO)
const [activeTab, setActiveTab] = useState<'detail' | 'overview'>('detail');
```

---

### 컴포넌트별 상세 설계

#### `<DateNavigator />`

```
[←]   4월 9일 수요일  [오늘]   [→]
```

- 레이아웃: `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`
- `←` / `→` 버튼: width/height 36, borderRadius 18, bg `#F1F5F9`
  - 텍스트: fontSize 18, color `#64748B`
  - `→` 버튼: isToday이면 `opacity: 0.3`, `disabled: true`
- 중앙 날짜 텍스트: fontSize 16, fontWeight `'600'`, color `#0F172A`
  - 날짜 포맷: `M월 D일 요일요일` (기존 `todayLabel()` 로직 재활용)
  - selectedDate 기준으로 계산하도록 변경: `dateLabel(selectedDate)`
- `[오늘]` 배지: isToday일 때만 렌더
  - bg `#DCFCE7`, color `#10B981`, fontSize 11, fontWeight `'600'`
  - paddingHorizontal 8, paddingVertical 3, borderRadius 10
  - marginLeft 6
- 날짜 이동 로직:
  ```ts
  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goForward = () => {
    if (isToday) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };
  ```
- `useEffect` 의존성에 `selectedDate` 추가:
  ```ts
  useEffect(() => {
    // fetchTodaySummary에 date 파라미터 지원 여부 불확실 → 일단 호출만
    void fetchTodaySummary();
  }, [selectedDate]);
  // TODO: fetchTodaySummary(selectedDate) 백엔드 파라미터 지원 시 전달
  ```

#### `<ViewTabBar />`

```
[  자세히  |  한눈에  ]
```

- 레이아웃: `flexDirection: 'row'`, bg `#F1F5F9`, borderRadius 10, padding 3
- 각 탭 버튼: `flex: 1`, height 34, borderRadius 8, `alignItems: 'center'`, `justifyContent: 'center'`
- active 탭: bg `#FFFFFF`, shadowColor `#000`, shadowOpacity 0.06, shadowRadius 4, elevation 2
- active 탭 텍스트: fontSize 14, fontWeight `'600'`, color `#0F172A`
- inactive 탭 텍스트: fontSize 14, fontWeight `'400'`, color `#64748B`
- '한눈에' 탭 onPress: `setActiveTab('overview')` — 현재는 TODO alert 또는 아무것도 렌더 안 함

#### `<CalorieGauge />` [수정]

기존 대비 변경:

| 항목 | 기존 | 변경 |
|------|------|------|
| `RADIUS` | 90 | **100** |
| `STROKE` | 12 | **14** |
| `SVG_SIZE` | `RADIUS*2+STROKE+4` | **동일 공식** → 218 |
| `gaugeKcal` fontSize | 28 | **40** |
| `gaugeKcal` 텍스트 | `{Math.round(current)}` | **`{Math.round(current)}`** (유지) |
| progress stroke | `#0D9488` | **`#10B981`** (테마 그린) |
| background stroke | `#E5E7EB` | **`#E2E8F0`** |

```tsx
// 변경된 상수
const RADIUS = 100;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SVG_SIZE = RADIUS * 2 + STROKE + 4;  // 218
const CENTER = SVG_SIZE / 2;               // 109

// gaugeCenter 내부 — 기존 유지하되 스타일만 변경
<Text style={styles.gaugeKcal}>{Math.round(current)}</Text>
<Text style={styles.gaugeUnit}>kcal</Text>          // [신규] 'kcal' 단위 작게
<Text style={styles.gaugeGoal}>/ {Math.round(goal)} kcal 목표</Text>
```

스타일 값:
```ts
gaugeKcal: { fontSize: 40, fontWeight: '800', color: '#0F172A' },
gaugeUnit: { fontSize: 14, color: '#64748B', marginTop: -4 },  // kcal 단위
gaugeGoal: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
```

#### `<RemainingBanner />` [신규]

게이지 아래 배너. `calGaugeCard` View 안에 CalorieGauge 바로 아래 위치.

```tsx
function RemainingBanner({ current, goal }: { current: number; goal: number }) {
  const remaining = Math.round(goal - current);
  const isOver = remaining < 0;
  const isDone = remaining === 0;
  return (
    <View style={[styles.remainingBanner, isOver && styles.remainingBannerOver]}>
      <Text style={[styles.remainingText, isOver && styles.remainingTextOver]}>
        {isDone
          ? '목표 달성! 🎉'
          : isOver
          ? `목표 초과 ${Math.abs(remaining)}kcal 🔥`
          : `🔥 오늘 남은 칼로리: ${remaining}kcal`}
      </Text>
    </View>
  );
}
```

스타일:
```ts
remainingBanner: {
  marginTop: 12,
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: '#F0FDF4',
  borderRadius: 20,
  alignSelf: 'center',
},
remainingBannerOver: { backgroundColor: '#FFF7ED' },
remainingText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
remainingTextOver: { color: '#F97316' },
```

#### `<MacroBadgeRow />` [신규]

게이지 카드 내부, RemainingBanner 아래에 배치.

```tsx
function MacroBadgeRow({ carbs, protein, fat, carbsGoal, proteinGoal, fatGoal }) {
  const pct = (v: number, g: number) => (g > 0 ? Math.round((v / g) * 100) : 0);
  return (
    <View style={styles.macroBadgeRow}>
      <MacroBadge label="탄수화물" pct={pct(carbs, carbsGoal)} color="#3B82F6" />
      <MacroBadge label="단백질"   pct={pct(protein, proteinGoal)} color="#10B981" />
      <MacroBadge label="지방"     pct={pct(fat, fatGoal)} color="#F97316" />
    </View>
  );
}

function MacroBadge({ label, pct, color }) {
  return (
    <View style={[styles.macroBadge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.macroBadgePct, { color }]}>{pct}%</Text>
      <Text style={styles.macroBadgeLabel}>{label}</Text>
    </View>
  );
}
```

스타일:
```ts
macroBadgeRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 16,
  justifyContent: 'center',
},
macroBadge: {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 20,
  alignItems: 'center',
  minWidth: 80,
},
macroBadgePct: { fontSize: 14, fontWeight: '700' },
macroBadgeLabel: { fontSize: 10, color: '#64748B', marginTop: 1 },
```

#### `<MotivationMessage />` [신규]

macroRow 위에 별도 카드 없이 텍스트만 표시.

```tsx
function MotivationMessage({ current, goal }) {
  const pct = goal > 0 ? current / goal : 0;
  let msg = '오늘도 건강하게 시작해요 💪';
  if (pct >= 1) msg = '오늘 목표 달성! 🎉';
  else if (pct >= 0.5) msg = '절반 왔어요! 잘하고 있어요 🌿';
  return <Text style={styles.motivation}>{msg}</Text>;
}
```

스타일:
```ts
motivation: {
  fontSize: 13,
  color: '#64748B',
  textAlign: 'center',
  marginVertical: 4,
},
```

#### `MacroCard` [유지]

기존 코드 그대로. 탄수화물 색 `#F59E0B` → `#3B82F6`(파랑)으로 통일 (MacroBadgeRow와 색상 맞춤).

```ts
// index.tsx 내 MacroCard 호출부 수정
<MacroCard label="탄수화물" current={carbs} goal={carbsGoal} color="#3B82F6" />
<MacroCard label="단백질"   current={protein} goal={proteinGoal} color="#10B981" />
<MacroCard label="지방"     current={fat} goal={fatGoal} color="#F97316" />
// TODO: 당류/나트륨 MacroCard — 백엔드 데이터 확보 후 추가
```

#### `<MealGrid>` / `<MealGridCard>` [신규, 기존 MealTimeCard 교체]

기존 세로 나열 → 2×2 그리드.

```tsx
// MealGrid 레이아웃
<View style={styles.mealGrid}>
  {MEAL_CONFIG.map(({ key, emoji, label }) => (
    <MealGridCard key={key} mealKey={key} emoji={emoji} label={label}
      items={(meals?.[key] as MealItem[] | undefined) ?? []} />
  ))}
</View>

// MealGridCard
function MealGridCard({ mealKey, emoji, label, items }) {
  const router = useRouter();
  const hasItems = items.length > 0;
  return (
    <TouchableOpacity
      style={styles.mealGridCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/meal/add?mealType=${mealKey}`)}
    >
      <Text style={styles.mealGridEmoji}>{emoji}</Text>
      <Text style={styles.mealGridLabel}>{label}</Text>
      {hasItems ? (
        <Text style={styles.mealGridCount}>{items.length}개 기록</Text>
      ) : (
        <Text style={styles.mealGridEmpty}>아직 기록 없음</Text>
      )}
      <View style={styles.mealGridAddBtn}>
        <Text style={styles.mealGridAddBtnText}>+</Text>
      </View>
    </TouchableOpacity>
  );
}
```

스타일:
```ts
mealGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},
mealGridCard: {
  width: '48%',                    // 2열, gap 10px 고려
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
  position: 'relative',
  minHeight: 120,
},
mealGridEmoji: { fontSize: 32, marginBottom: 6 },
mealGridLabel: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
mealGridCount: { fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: '600' },
mealGridEmpty: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
mealGridAddBtn: {
  position: 'absolute',
  top: 10,
  right: 10,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#F1F5F9',
  alignItems: 'center',
  justifyContent: 'center',
},
mealGridAddBtnText: { fontSize: 16, color: '#10B981', lineHeight: 20 },
```

---

### 기존 로직 유지 vs 변경 요약

| 항목 | 처리 |
|------|------|
| `useMealStore`, `fetchTodaySummary` | **유지** |
| `todaySummary` 데이터 바인딩 | **유지** |
| `MEAL_CONFIG` 배열 | **유지** |
| `CalorieGauge` SVG 로직 | **유지, 상수값만 변경** |
| `MacroCard` 컴포넌트 | **유지, 탄수화물 색 변경** |
| `MealTimeCard` (세로 나열) | **삭제 → MealGridCard로 교체** |
| `todayLabel()` 함수 | **`dateLabel(date: Date)` 로 시그니처 변경** |
| `DAYS` 배열 | **유지** |

---

---

## 화면 2: 음식 추가 화면 `meal/add.tsx`

### 컴포넌트 트리

```
── mode === 'search' ──────────────────────────────────────────
<KeyboardAvoidingView>
  <SearchHeader />                    ← [수정] 헤더 전면 개편
  <SearchBar />                       ← [수정] 고정 위치 명확화
  <View style={{ flex: 1 }}>
    {query.trim() === '' ? (
      <>
        <FrequentFoodsSection />      ← [신규] 자주 먹는 음식
        <RecentFoodsSection />        ← [수정] 기존 recentFoods 재활용
      </>
    ) : loading ? (
      <ActivityIndicator />
    ) : (
      <FlatList results />            ← [수정] 컬러 도트 추가
    )}
  </View>
</KeyboardAvoidingView>

── mode === 'detail' ──────────────────────────────────────────
<SafeAreaView>
  <DetailHeader />                    ← [수정] 뒤로가기 + 제목
  <ScrollView>
    <FoodTitleSection />              ← 기존 title + manufacturer 유지
    <NutrientTileGrid />              ← [수정] 타일형으로 확장
    <ServingControl />                ← 기존 유지
    <PrimaryButton>기록에 추가</PrimaryButton>
  </ScrollView>
</SafeAreaView>

── mode === 'manual' ──────────────────────────────────────────
<KeyboardAvoidingView>
  <ManualHeader />                    ← [수정] SearchHeader 스타일 통일
  <ScrollView>
    <폼 필드들 />                     ← 기존 유지
    <PrimaryButton>등록하기</PrimaryButton>
  </ScrollView>
</KeyboardAvoidingView>
```

---

### 핵심 State

```ts
// 기존 유지
const [mode, setMode] = useState<Mode>('search');
const [query, setQuery] = useState('');
const [results, setResults] = useState<FoodItem[]>([]);
const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
const [servingCount, setServingCount] = useState(1);
const [loading, setLoading] = useState(false);
const [manualName, setManualName] = useState('');
const [manualCalories, setManualCalories] = useState('');
const [manualProtein, setManualProtein] = useState('');
const [manualCarbs, setManualCarbs] = useState('');
const [manualFat, setManualFat] = useState('');

// [신규] 자주 먹는 음식 (recentFoods 재활용 — 현재 구현 없으면 빈 배열)
const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
// TODO: AsyncStorage 또는 mealStore에서 최근 기록 불러오기
```

---

### 컴포넌트별 상세 설계

#### `<SearchHeader />` [신규]

기존 `<View style={styles.header}>` 완전 교체.

```
[X]        아침 식사        직접입력 →
```

```tsx
function SearchHeader({ mealLabel, onClose, onManual }) {
  return (
    <View style={styles.searchHeader}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      <Text style={styles.searchHeaderTitle}>{mealLabel}</Text>
      <TouchableOpacity onPress={onManual}>
        <Text style={styles.manualLink}>직접입력</Text>
      </TouchableOpacity>
    </View>
  );
}
```

`onClose` = `router.back()`  
`onManual` = `() => setMode('manual')`

스타일:
```ts
searchHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  paddingTop: 16,
  paddingBottom: 12,
  backgroundColor: '#FFFFFF',
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},
closeButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#F1F5F9',
  alignItems: 'center',
  justifyContent: 'center',
},
closeButtonText: { fontSize: 16, color: '#64748B' },
searchHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
manualLink: { fontSize: 14, color: '#10B981', fontWeight: '600' },
```

#### `<SearchBar />` [수정]

기존 `searchInput` 스타일 업그레이드. 위치는 헤더 바로 아래 고정 (FlatList 스크롤과 분리됨).

```tsx
<View style={styles.searchBarWrapper}>
  <Text style={styles.searchIcon}>🔍</Text>
  <TextInput
    style={styles.searchInputInner}
    placeholder="음식을 검색하세요"
    placeholderTextColor="#94A3B8"
    value={query}
    onChangeText={setQuery}
    autoFocus
    returnKeyType="search"
    clearButtonMode="while-editing"
  />
</View>
```

스타일:
```ts
searchBarWrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  marginHorizontal: 20,
  marginVertical: 12,
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: '#E2E8F0',
  paddingHorizontal: 14,
  paddingVertical: 10,
},
searchIcon: { fontSize: 16, marginRight: 8 },
searchInputInner: {
  flex: 1,
  fontSize: 16,
  color: '#0F172A',
  padding: 0,           // iOS 내부 패딩 제거
},
```

#### 기존 `<TouchableOpacity manualButton>` 삭제

SearchHeader의 '직접입력' 링크로 대체.

#### `<FrequentFoodsSection />` [신규]

`query.trim() === ''` 일 때 최상단 표시. `recentFoods` 데이터 재활용.

```tsx
function FrequentFoodsSection({ foods, onSelect }) {
  if (foods.length === 0) return null;    // 데이터 없으면 숨김
  return (
    <View style={styles.foodSection}>
      <Text style={styles.foodSectionTitle}>자주 먹는 음식</Text>
      {foods.slice(0, 5).map((food, idx) => (
        <FoodListItem key={idx} food={food} onPress={() => onSelect(food)} />
      ))}
    </View>
  );
}
```

#### `<RecentFoodsSection />` [수정]

기존 검색 빈 상태에서 보이던 최근 기록. `FrequentFoodsSection` 아래에 배치.

```tsx
function RecentFoodsSection({ foods, onSelect }) {
  if (foods.length === 0) return (
    <View style={styles.emptyStateWrapper}>
      <Text style={styles.emptyStateIcon}>🍽️</Text>
      <Text style={styles.emptyStateText}>음식을 검색하거나{'\n'}직접 입력해보세요</Text>
    </View>
  );
  return (
    <View style={styles.foodSection}>
      <Text style={styles.foodSectionTitle}>최근 기록</Text>
      {foods.map((food, idx) => (
        <FoodListItem key={idx} food={food} onPress={() => onSelect(food)} />
      ))}
    </View>
  );
}
```

스타일:
```ts
foodSection: { paddingHorizontal: 20, marginBottom: 8 },
foodSectionTitle: {
  fontSize: 13,
  fontWeight: '700',
  color: '#64748B',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
emptyStateWrapper: { alignItems: 'center', marginTop: 60 },
emptyStateIcon: { fontSize: 40, marginBottom: 12 },
emptyStateText: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
```

#### `<FoodListItem />` [신규 공통 컴포넌트]

검색 결과, 최근 기록, 자주 먹는 음식 모두 같은 컴포넌트 사용.

```tsx
function calorieDotColor(kcal: number): string {
  if (kcal < 200) return '#10B981';   // 그린
  if (kcal <= 500) return '#F97316';  // 오렌지
  return '#EF4444';                   // 레드
}

function FoodListItem({ food, onPress }) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.calorieDot, { backgroundColor: calorieDotColor(food.caloriesKcal) }]} />
      <View style={styles.listItemMain}>
        <Text style={styles.listItemName}>{food.foodName}</Text>
        {food.manufacturer ? (
          <Text style={styles.listItemManufacturer}>{food.manufacturer}</Text>
        ) : null}
      </View>
      <View style={styles.listItemNutrients}>
        <Text style={styles.listItemCalories}>{food.caloriesKcal} kcal</Text>
        <Text style={styles.listItemMacros}>
          단 {food.proteinG}g · 탄 {food.carbsG}g · 지 {food.fatG}g
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

스타일:
```ts
listItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},
calorieDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  marginRight: 12,
  flexShrink: 0,
},
listItemMain: { flex: 1, marginRight: 12 },
listItemName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
listItemManufacturer: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
listItemNutrients: { alignItems: 'flex-end' },
listItemCalories: { fontSize: 15, fontWeight: '700', color: '#10B981' },
listItemMacros: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
```

#### `<NutrientTileGrid />` [수정 — detail 화면]

기존 `nutrientCard` 리스트 → 2×2 타일 그리드로 확장.

```tsx
const NUTRIENT_TILES = [
  { label: '칼로리', unit: 'kcal', value: food.caloriesKcal, color: '#EF4444', bg: '#FEF2F2' },
  { label: '탄수화물', unit: 'g',   value: food.carbsG,      color: '#3B82F6', bg: '#EFF6FF' },
  { label: '단백질',  unit: 'g',   value: food.proteinG,    color: '#10B981', bg: '#F0FDF4' },
  { label: '지방',    unit: 'g',   value: food.fatG,        color: '#F97316', bg: '#FFF7ED' },
];

function NutrientTileGrid({ food, servingCount }) {
  return (
    <View style={styles.nutrientGrid}>
      {NUTRIENT_TILES.map(({ label, unit, value, color, bg }) => (
        <View key={label} style={[styles.nutrientTile, { backgroundColor: bg }]}>
          <Text style={styles.nutrientTileLabel}>{label}</Text>
          <Text style={[styles.nutrientTileValue, { color }]}>
            {(value * servingCount).toFixed(unit === 'kcal' ? 0 : 1)}
          </Text>
          <Text style={styles.nutrientTileUnit}>{unit}</Text>
        </View>
      ))}
    </View>
  );
}
```

스타일:
```ts
nutrientGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 20,
  marginBottom: 8,
},
nutrientTile: {
  width: '48%',
  borderRadius: 14,
  padding: 16,
  alignItems: 'center',
},
nutrientTileLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
nutrientTileValue: { fontSize: 28, fontWeight: '800', marginTop: 6 },
nutrientTileUnit: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
```

#### `<DetailHeader />` [수정]

기존 `backButton` → 아이콘 버튼으로 통일.

```tsx
<View style={styles.detailHeader}>
  <TouchableOpacity style={styles.closeButton} onPress={() => setMode('search')}>
    <Text style={styles.closeButtonText}>✕</Text>
  </TouchableOpacity>
  <Text style={styles.detailHeaderTitle}>음식 상세</Text>
  <View style={{ width: 36 }} />    {/* 우측 공간 확보 */}
</View>
```

스타일: `searchHeader`와 동일 재사용.

#### `ServingControl` [유지]

기존 코드 그대로. 색상만 `#4CAF50` → `#10B981` 통일.

```ts
servingButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: '#DCFCE7',    // 기존 #e8f5e9 → 테마 맞춤
  alignItems: 'center',
  justifyContent: 'center',
},
servingButtonText: { fontSize: 22, fontWeight: '700', color: '#10B981' },
servingCount: { fontSize: 20, fontWeight: '600', color: '#0F172A', minWidth: 70, textAlign: 'center' },
```

#### `Manual 화면` [수정 — 헤더만]

```tsx
// 기존 backButton + title 교체
<View style={styles.searchHeader}>
  <TouchableOpacity style={styles.closeButton} onPress={() => setMode('search')}>
    <Text style={styles.closeButtonText}>✕</Text>
  </TouchableOpacity>
  <Text style={styles.searchHeaderTitle}>직접 등록</Text>
  <View style={{ width: 36 }} />
</View>
// 나머지 폼 필드 전부 유지
```

#### `PrimaryButton` 스타일 통일 [수정]

기존 `#4CAF50` → `#10B981` (테마 그린).

```ts
primaryButton: {
  marginTop: 24,
  backgroundColor: '#10B981',
  borderRadius: 14,
  paddingVertical: 16,
  alignItems: 'center',
},
primaryButtonDisabled: { backgroundColor: '#CBD5E1' },
primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
```

#### `container` 배경색 [수정]

기존 `'#fff'` → `'#F8FAFC'` (테마 배경으로 통일).

---

### 기존 로직 유지 vs 변경 요약

| 항목 | 처리 |
|------|------|
| `searchFood()` API 호출 + debounce 500ms | **유지** |
| `handleSelectFood`, `handleManualSubmit`, `handleAddDetail` | **유지** |
| `logMeal()` 함수 | **유지** (TODO 그대로) |
| `FlatList` + `keyboardShouldPersistTaps` | **유지** |
| `KeyboardAvoidingView` 구조 | **유지** |
| `resultItem` → `FoodListItem` 교체 | **변경** (공통 컴포넌트로) |
| 기존 `manualButton` (TouchableOpacity 별도) | **삭제** → 헤더 링크로 이동 |
| `backButton` / `backButtonText` | **삭제** → `closeButton`으로 통일 |
| nutrientCard (row 방식) | **삭제** → `NutrientTileGrid` 교체 |
| 색상 `#4CAF50` 전체 | **`#10B981`으로 교체** |

---

## 글로벌 상수 정의 (두 파일 공통)

```ts
// constants/theme.ts 생성 또는 파일 상단에 선언
const COLORS = {
  primary: '#10B981',
  primaryLight: '#DCFCE7',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSub: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  carbs: '#3B82F6',
  protein: '#10B981',
  fat: '#F97316',
  danger: '#EF4444',
};
```
