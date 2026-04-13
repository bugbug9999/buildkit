# GLP-Care 투약 탭 전면 재설계 설계서 v1.0

---

## 0. 파일 구조 및 전역 상수

```
app/(tabs)/injection.tsx   ← 단일 파일, 모든 screen 포함
```

### 전역 상수

```ts
const PRIMARY = '#10B981';
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#EC4899', '#14B8A6'];
const COLOR_LABELS = ['그린', '블루', '퍼플', '오렌지', '핑크', '틸'];

const TIME_SLOT_LABELS: Record<MedicationSchedule['timeSlot'], string> = {
  morning:  '아침',
  lunch:    '점심',
  evening:  '저녁',
  bedtime:  '취침전',
};

const TIME_SLOT_DEFAULTS: Record<MedicationSchedule['timeSlot'], string> = {
  morning:  '08:00',
  lunch:    '12:00',
  evening:  '19:00',
  bedtime:  '22:00',
};

const CONDITION_LABELS: Record<Medication['condition'], string> = {
  fasting: '공복',
  before:  '식전',
  after:   '식후',
  any:     '무관',
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const WEEK_DAYS_ORDER = ['월', '화', '수', '목', '금', '토', '일'] as const;
```

---

## 1. 타입 정의 (파일 상단)

```ts
type MedForm = 'oral' | 'injection' | 'other';
type FreqType = 'daily' | 'weekly';
type ScreenState = 'main' | 'manage' | 'add';
type TimeSlot = 'morning' | 'lunch' | 'evening' | 'bedtime';
type Condition = 'fasting' | 'before' | 'after' | 'any';
type DayStatus = 'complete' | 'partial' | 'missed' | 'none';

interface MedicationSchedule {
  id: string;
  timeSlot: TimeSlot;
  timeDetail: string; // 'HH:MM'
}

interface Medication {
  id: string;
  name: string;
  form: MedForm;
  dosage: string;
  frequency: FreqType;
  frequencyDays: string[];
  schedules: MedicationSchedule[];
  condition: Condition;
  memo: string;
  colorIndex: number;
  isActive: boolean;
  createdAt: string;
}

interface MedicationLog {
  id: string;
  medicationId: string;
  scheduleId: string;
  date: string;       // 'YYYY-MM-DD'
  status: 'taken' | 'missed' | 'pending';
  checkedAt: string | null;
}

interface CheckItem {
  medicationId: string;
  scheduleId: string;
  name: string;
  dosage: string;
  condition: Condition;
  timeSlot: TimeSlot;
  timeDetail: string;
  color: string;
  log: MedicationLog | null;
}

// add 화면용 draft
interface MedDraft {
  name: string;
  form: MedForm;
  dosage: string;
  frequency: FreqType;
  frequencyDays: string[];
  schedules: MedicationSchedule[];
  condition: Condition;
  memo: string;
}
```

---

## 2. 유틸리티 함수

```ts
import { v4 as uuid } from 'uuid'; // expo-crypto로 대체 가능: Crypto.randomUUID()

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function formatDateHeader(dateStr: string): string {
  // '2026-04-09' → '4월 9일 목'
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayName = DAYS[d.getDay()];
  return `${month}월 ${day}일 ${dayName}`;
}

function getTodayCheckItems(
  medications: Medication[],
  logs: MedicationLog[],
  today: string
): CheckItem[] {
  const todayDayName = DAYS[new Date().getDay()];
  return medications
    .filter(m => m.isActive)
    .filter(m =>
      m.frequency === 'daily' ||
      m.frequencyDays.includes(todayDayName)
    )
    .flatMap(m =>
      m.schedules.map(s => ({
        medicationId: m.id,
        scheduleId: s.id,
        name: m.name,
        dosage: m.dosage,
        condition: m.condition,
        timeSlot: s.timeSlot,
        timeDetail: s.timeDetail,
        color: COLORS[m.colorIndex],
        log: logs.find(
          l => l.medicationId === m.id &&
               l.scheduleId === s.id &&
               l.date === today
        ) ?? null,
      }))
    )
    .sort((a, b) => a.timeDetail.localeCompare(b.timeDetail));
}

function isOverdue(timeDetail: string, log: MedicationLog | null): boolean {
  if (log?.status === 'taken') return false;
  const [h, m] = timeDetail.split(':').map(Number);
  const scheduled = new Date();
  scheduled.setHours(h, m, 0, 0);
  return Date.now() - scheduled.getTime() > 30 * 60 * 1000;
}

function getDayStatus(
  date: string,
  medications: Medication[],
  logs: MedicationLog[]
): DayStatus {
  const d = new Date(date);
  const dayName = DAYS[d.getDay()];
  const relevantMeds = medications.filter(
    m => m.isActive && (
      m.frequency === 'daily' || m.frequencyDays.includes(dayName)
    )
  );
  if (relevantMeds.length === 0) return 'none';

  const totalSlots = relevantMeds.reduce((acc, m) => acc + m.schedules.length, 0);
  if (totalSlots === 0) return 'none';

  const dayLogs = logs.filter(l => l.date === date);
  const takenCount = dayLogs.filter(l => l.status === 'taken').length;
  const missedCount = dayLogs.filter(l => l.status === 'missed').length;

  const today = todayStr();
  const isPast = date < today;

  if (takenCount === totalSlots) return 'complete';
  if (takenCount > 0) return 'partial';
  if (isPast && missedCount > 0) return 'missed';
  return 'none';
}

function getNextWeeklyInfo(
  med: Medication,
  today: string
): { dayName: string; daysUntil: number } | null {
  if (med.frequency !== 'weekly' || med.frequencyDays.length === 0) return null;
  const todayDow = new Date(today).getDay(); // 0=일
  const todayDayName = DAYS[todayDow];
  if (med.frequencyDays.includes(todayDayName)) return null; // 오늘이 해당 요일

  let minDays = 8;
  let nextDayName = '';
  for (const dn of med.frequencyDays) {
    const targetDow = DAYS.indexOf(dn as typeof DAYS[number]);
    let diff = (targetDow - todayDow + 7) % 7;
    if (diff === 0) diff = 7;
    if (diff < minDays) { minDays = diff; nextDayName = dn; }
  }
  return { dayName: nextDayName, daysUntil: minDays };
}

function getWeekSummary(logs: MedicationLog[]): { rate: number; missedCount: number } {
  // 이번 주 월~일
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const weekLogs = logs.filter(l => weekDates.includes(l.date));
  const total = weekLogs.length;
  if (total === 0) return { rate: 0, missedCount: 0 };
  const taken = weekLogs.filter(l => l.status === 'taken').length;
  const missed = weekLogs.filter(l => l.status === 'missed').length;
  return {
    rate: Math.round((taken / total) * 100),
    missedCount: missed,
  };
}

function buildCalendarMatrix(year: number, month: number): (number | null)[][] {
  // month: 0-indexed
  const firstDay = new Date(year, month, 1).getDay(); // 0=일
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ];
  // 6행으로 채우기
  while (cells.length % 7 !== 0) cells.push(null);
  const matrix: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) matrix.push(cells.slice(i, i + 7));
  return matrix;
}

function minuteStepper(current: number): { up: number; down: number } {
  // 0, 15, 30, 45 순환
  const options = [0, 15, 30, 45];
  const idx = options.indexOf(current);
  const safeIdx = idx === -1 ? 0 : idx;
  return {
    up: options[(safeIdx + 1) % 4],
    down: options[(safeIdx + 3) % 4],
  };
}
```

---

## 3. 루트 컴포넌트 — `InjectionScreen`

### 3-1. 전체 State 목록

```ts
// 네비게이션
const [screen, setScreen] = useState<ScreenState>('main');

// 도메인 데이터
const [medications, setMedications] = useState<Medication[]>([]);
const [logs, setLogs] = useState<MedicationLog[]>([]);

// 달력
const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>({
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-indexed
});

// 날짜 바텀시트
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [showDateSheet, setShowDateSheet] = useState(false);
```

### 3-2. 컴포넌트 트리

```
InjectionScreen (View, flex:1, bg:'#F8FAFC')
  ├─ screen === 'main'  → <MainScreen />
  ├─ screen === 'manage' → <ManageScreen />
  └─ screen === 'add'   → <AddScreen />
```

### 3-3. 핸들러 시그니처 (루트에서 정의, props로 내려줌)

```ts
handleToggleLog(medicationId: string, scheduleId: string, date: string): void
  // 해당 log 없으면 생성(taken), 있고 taken이면 pending으로 토글
  // log = { id: uuid(), medicationId, scheduleId, date, status:'taken', checkedAt: new Date().toISOString() }
  // setLogs(prev => [...prev.filter(not this slot), updatedLog])

handleAddMedication(draft: MedDraft): void
  // colorIndex = medications.length % 6
  // createInjection API 호출: { drug: draft.name, dosageMg: 0, site: 'none', memo: draft.memo }
  // setMedications(prev => [...prev, newMed])
  // setScreen('main')

handleDeleteMedication(id: string): void
  // setMedications(prev => prev.filter(m => m.id !== id))
  // setLogs(prev => prev.filter(l => l.medicationId !== id))
```

---

## 4. `MainScreen` 컴포넌트

### 4-1. Props

```ts
interface MainScreenProps {
  medications: Medication[];
  logs: MedicationLog[];
  calendarMonth: { year: number; month: number };
  setCalendarMonth: (v: { year: number; month: number }) => void;
  onGoManage: () => void;
  onGoAdd: () => void;
  onToggleLog: (medId: string, schedId: string, date: string) => void;
  onSelectDate: (date: string) => void;
}
```

### 4-2. 내부 State

```ts
const today = todayStr(); // 렌더 시 1회 계산
const checkItems = getTodayCheckItems(medications, logs, today);
const totalCount = checkItems.length;
const doneCount = checkItems.filter(i => i.log?.status === 'taken').length;
const weekSummary = getWeekSummary(logs);
```

### 4-3. 컴포넌트 트리 (Empty State)

```
ScrollView (bg: '#F8FAFC')
  Header (Row, justifyContent:'space-between', px:20, py:16)
    Text '투약 관리' (fontSize:22, fontWeight:'700', color:'#1E293B')
    TouchableOpacity → onGoManage
      Text '약 관리 ⚙️' (fontSize:14, color:PRIMARY)

  View (flex:1, justifyContent:'center', alignItems:'center', mt:80)
    View (bg:'#fff', borderRadius:20, p:32, mx:24, alignItems:'center', shadow)
      Text '💊' (fontSize:48)
      Text '복용 중인 약을 등록하면\n매일 복약 체크와 이력을 관리해드려요'
            (textAlign:'center', color:'#64748B', fontSize:14, mt:12, lineHeight:22)
      TouchableOpacity (bg:PRIMARY, borderRadius:12, px:24, py:12, mt:20)
        → onGoAdd
        Text '약 등록하기 →' (color:'#fff', fontWeight:'600')
```

### 4-4. 컴포넌트 트리 (Active State)

```
ScrollView (bg:'#F8FAFC', showsVerticalScrollIndicator:false)
  ├─ Header (동일)
  │
  ├─ MedSummaryBanner (TouchableOpacity → onGoManage)
  │    View (bg:'#fff', borderRadius:16, mx:16, p:16, mb:12, shadow)
  │      Row
  │        Text '💊 내 약 정보' (fontWeight:'600', color:'#1E293B')
  │        Text '▸' (color:'#94A3B8', ml:4)
  │      Text (color:'#64748B', fontSize:13, mt:4)
  │        → medications.slice(0,2).map(m=>m.name).join(' · ')
  │          + (medications.length > 2 ? ` 외 ${medications.length-2}개` : '')
  │
  ├─ TodayHeader
  │    View (mx:16, mb:8)
  │      Row (justifyContent:'space-between')
  │        Text '오늘의 복약' (fontSize:17, fontWeight:'700', color:'#1E293B')
  │        View (bg:'#D1FAE5', borderRadius:12, px:10, py:4)
  │          Text '{doneCount}/{totalCount} 완료' (color:'#059669', fontSize:13, fontWeight:'600')
  │      Text (formatDateHeader(today)) (color:'#64748B', fontSize:13, mt:4)
  │      ProgressBar
  │        View (bg:'#E2E8F0', borderRadius:8, height:6, mt:8)
  │          View (bg:PRIMARY, width:`${(doneCount/Math.max(totalCount,1))*100}%`, borderRadius:8, height:6)
  │
  ├─ ChecklistSection (각 시간대별 그룹)
  │    ['morning','lunch','evening','bedtime'].map(slot => {
  │      const slotItems = checkItems.filter(i => i.timeSlot === slot)
  │      if slotItems.length === 0: return null
  │      return:
  │        View (mx:16, mb:8)
  │          Text TIME_SLOT_LABELS[slot] (fontSize:13, color:'#94A3B8', fontWeight:'600', mb:6)
  │          slotItems.map(item => <CheckCard item={item} onToggle={onToggleLog} today={today} />)
  │    })
  │
  ├─ NextScheduleSection (weekly 약물 중 오늘 아닌 것)
  │    const nextItems = medications
  │      .filter(m => m.isActive && m.frequency === 'weekly')
  │      .map(m => ({ med: m, next: getNextWeeklyInfo(m, today) }))
  │      .filter(x => x.next !== null)
  │    if nextItems.length > 0:
  │      View (mx:16, mb:12)
  │        Text '다음 예정' (fontSize:15, fontWeight:'700', color:'#1E293B', mb:8)
  │        nextItems.map(({ med, next }) =>
  │          View (bg:'#fff', borderRadius:12, p:14, mb:8, Row, shadow)
  │            View (w:10, h:10, borderRadius:5, bg:COLORS[med.colorIndex], mr:10, mt:2)
  │            Text med.name (flex:1, fontWeight:'600', color:'#1E293B')
  │            Text `${next!.dayName}요일 (${next!.daysUntil}일 후)` (color:'#94A3B8', fontSize:13)
  │        )
  │
  ├─ CalendarSection
  │    → 별도 서브컴포넌트 <CalendarView> (아래 §6 참조)
  │
  └─ WeekSummarySection
       View (mx:16, mb:24, bg:'#fff', borderRadius:16, p:16, shadow)
         Text '이번 주 복약 현황' (fontSize:15, fontWeight:'700', color:'#1E293B', mb:12)
         Row (justifyContent:'space-around')
           View (alignItems:'center')
             Text `${weekSummary.rate}%` (fontSize:28, fontWeight:'700', color:PRIMARY)
             Text '복약률' (color:'#64748B', fontSize:13)
           View (w:1, h:40, bg:'#E2E8F0')
           View (alignItems:'center')
             Text `${weekSummary.missedCount}회` (fontSize:28, fontWeight:'700', color:'#EF4444')
             Text '놓친 약' (color:'#64748B', fontSize:13)
```

---

## 5. `CheckCard` 서브컴포넌트

### 5-1. Props

```ts
interface CheckCardProps {
  item: CheckItem;
  onToggle: (medId: string, schedId: string, date: string) => void;
  today: string;
}
```

### 5-2. 내부 계산

```ts
const taken = item.log?.status === 'taken';
const overdue = isOverdue(item.timeDetail, item.log);
```

### 5-3. 컴포넌트 트리

```
View (
  bg: taken ? '#D1FAE5' : '#fff',
  borderRadius: 14,
  p: 14,
  mb: 8,
  flexDirection: 'row',
  alignItems: 'center',
  shadow: { shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, elevation:2 }
)
  ├─ View (w:12, h:12, borderRadius:6, bg:item.color, mr:12)
  │
  ├─ View (flex:1)
  │    Text item.name (fontSize:15, fontWeight:'600', color: taken ? '#059669' : '#1E293B')
  │    Text `{item.dosage} · {CONDITION_LABELS[item.condition]} · {item.timeDetail}`
  │         (fontSize:12, color:'#94A3B8', mt:3)
  │    {overdue && !taken &&
  │      View (bg:'#FEE2E2', borderRadius:6, px:8, py:2, alignSelf:'flex-start', mt:5)
  │        Text '미복용' (color:'#EF4444', fontSize:11, fontWeight:'600')
  │    }
  │
  └─ TouchableOpacity (
       onPress: () => onToggle(item.medicationId, item.scheduleId, today),
       w:32, h:32, borderRadius:16,
       bg: taken ? PRIMARY : 'transparent',
       borderWidth: taken ? 0 : 2,
       borderColor: taken ? 'transparent' : '#CBD5E1',
       justifyContent:'center', alignItems:'center'
     )
       {taken && Text '✓' (color:'#fff', fontSize:16, fontWeight:'700')}
```

---

## 6. `CalendarView` 서브컴포넌트

### 6-1. Props

```ts
interface CalendarViewProps {
  year: number;
  month: number; // 0-indexed
  medications: Medication[];
  logs: MedicationLog[];
  today: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string) => void;
}
```

### 6-2. 내부 계산

```ts
const matrix = buildCalendarMatrix(year, month);
```

### 6-3. 컴포넌트 트리

```
View (mx:16, mb:16, bg:'#fff', borderRadius:16, p:16, shadow)
  ├─ Row (justifyContent:'space-between', alignItems:'center', mb:16)
  │    TouchableOpacity → onPrevMonth: Text '‹' (fontSize:22, color:'#64748B')
  │    Text `{year}년 {month+1}월` (fontSize:16, fontWeight:'700', color:'#1E293B')
  │    TouchableOpacity → onNextMonth: Text '›' (fontSize:22, color:'#64748B')
  │
  ├─ Row (mb:8): ['일','월','화','수','목','금','토'].map(d =>
  │    View (flex:1, alignItems:'center')
  │      Text d (fontSize:12, color:'#94A3B8', fontWeight:'600')
  │  )
  │
  └─ matrix.map((week, wi) =>
       Row (key:wi, mb:4):
         week.map((date, di) => {
           if date === null:
             View (flex:1)  // 빈 셀
           else:
             const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`
             const status = getDayStatus(dateStr, medications, logs)
             const isToday = dateStr === today
             const isFuture = dateStr > today
             const dayDots = getDayDots(dateStr, medications, logs) // 최대 3개 색상 배열
             TouchableOpacity (
               flex:1, alignItems:'center', py:4,
               onPress: isFuture ? undefined : () => onSelectDate(dateStr)
             )
               View (
                 w:32, h:32, borderRadius:16,
                 justifyContent:'center', alignItems:'center',
                 bg: isFuture ? 'transparent'
                   : status === 'complete' ? '#D1FAE5'
                   : status === 'partial'  ? '#FEF9C3'
                   : status === 'missed'   ? '#FEE2E2'
                   : 'transparent',
                 borderWidth: isToday ? 2 : 0,
                 borderColor: isToday ? PRIMARY : 'transparent',
               )
                 Text date (
                   fontSize:14,
                   fontWeight: isToday ? '700' : '400',
                   color: isFuture ? '#94A3B8'
                        : status === 'complete' ? '#059669'
                        : status === 'missed'   ? '#EF4444'
                        : '#1E293B'
                 )
               Row (mt:2, height:6, justifyContent:'center')
                 {!isFuture && dayDots.map((color, idx) =>
                   View (key:idx, w:5, h:5, borderRadius:3, bg:color, mx:1)
                 )}
         })
     )
```

### 6-4. `getDayDots` 헬퍼

```ts
function getDayDots(dateStr: string, medications: Medication[], logs: MedicationLog[]): string[] {
  const d = new Date(dateStr);
  const dayName = DAYS[d.getDay()];
  const relevant = medications.filter(
    m => m.isActive && (m.frequency === 'daily' || m.frequencyDays.includes(dayName))
  );
  const colors = relevant.slice(0, 3).map(m => COLORS[m.colorIndex]);
  return colors;
}
```

---

## 7. 날짜 바텀시트 `DateDetailSheet`

### 7-1. Props

```ts
interface DateDetailSheetProps {
  visible: boolean;
  date: string | null;
  medications: Medication[];
  logs: MedicationLog[];
  onClose: () => void;
  onToggleLog: (medId: string, schedId: string, date: string) => void;
}
```

### 7-2. 구현 방식

`Modal` (transparent, animationType:'slide') 사용.

```
Modal (visible, transparent, animationType:'slide')
  TouchableOpacity (flex:1, bg:'rgba(0,0,0,0.4)') → onClose
  View (
    bg:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24,
    p:24, maxHeight:'70%'
  )
    View (w:40, h:4, bg:'#E2E8F0', borderRadius:2, alignSelf:'center', mb:16)
    Text `{date ? formatDateHeader(date) : ''}` (fontSize:18, fontWeight:'700', mb:16)
    
    // 해당 날 체크아이템 (getTodayCheckItems 동일 로직, date 기준)
    ScrollView
      items.length === 0
        ? Text '이 날은 복약 항목이 없습니다.' (color:'#94A3B8', textAlign:'center')
        : items.map(item => <CheckCard item={item} onToggle={onToggleLog} today={date!} />)
```

---

## 8. `ManageScreen` 컴포넌트

### 8-1. Props

```ts
interface ManageScreenProps {
  medications: Medication[];
  onBack: () => void;
  onGoAdd: () => void;
  onDelete: (id: string) => void;
}
```

### 8-2. 컴포넌트 트리

```
View (flex:1, bg:'#F8FAFC')
  ├─ Header (Row, px:16, py:14, alignItems:'center', borderBottom)
  │    TouchableOpacity → onBack: Text '←' (fontSize:22, color:PRIMARY)
  │    Text '약 관리' (flex:1, textAlign:'center', fontSize:18, fontWeight:'700')
  │    View (w:32) // 오른쪽 균형
  │
  └─ ScrollView
       medications.map(med =>
         View (key:med.id, bg:'#fff', borderRadius:14, mx:16, p:16, mb:10, shadow)
           Row (justifyContent:'space-between', alignItems:'flex-start')
             Row (flex:1, alignItems:'center')
               View (w:12, h:12, borderRadius:6, bg:COLORS[med.colorIndex], mr:10)
               View (flex:1)
                 Text med.name (fontSize:16, fontWeight:'600', color:'#1E293B')
                 Text `{med.dosage} · {med.frequency==='daily'?'매일':med.frequencyDays.join('/')+' 요일'}`
                      (fontSize:13, color:'#94A3B8', mt:3)
             TouchableOpacity (
               bg:'#FEE2E2', borderRadius:8, px:12, py:6,
               onPress: () => onDelete(med.id)
             )
               Text '삭제' (color:'#EF4444', fontSize:13, fontWeight:'600')
       )
       TouchableOpacity (
         mx:16, mt:8, mb:32, bg:PRIMARY, borderRadius:14, p:16,
         alignItems:'center'
       ) → onGoAdd
         Text '+ 새 약 등록하기' (color:'#fff', fontWeight:'700', fontSize:16)
```

---

## 9. `AddScreen` 컴포넌트

### 9-1. Props

```ts
interface AddScreenProps {
  medicationsCount: number;
  onBack: () => void;
  onSave: (draft: MedDraft) => void;
}
```

### 9-2. 내부 State

```ts
const [draft, setDraft] = useState<MedDraft>({
  name: '',
  form: 'oral',
  dosage: '',
  frequency: 'daily',
  frequencyDays: [],
  schedules: [],
  condition: 'any',
  memo: '',
});

// 시간대 추가 시트
const [showTimeSheet, setShowTimeSheet] = useState(false);

// 직접 입력 시간 스테퍼 (시트 내부)
const [stepperHour, setStepperHour] = useState(8);
const [stepperMinute, setStepperMinute] = useState(0);
const [stepperSlot, setStepperSlot] = useState<TimeSlot>('morning');
const [stepperMode, setStepperMode] = useState<'preset' | 'custom'>('preset');

// 유효성
const canSave = draft.name.trim().length > 0 && draft.schedules.length > 0;
```

### 9-3. 핸들러 시그니처

```ts
function updateDraft<K extends keyof MedDraft>(key: K, value: MedDraft[K]): void {
  setDraft(prev => ({ ...prev, [key]: value }));
}

function toggleFreqDay(day: string): void {
  setDraft(prev => ({
    ...prev,
    frequencyDays: prev.frequencyDays.includes(day)
      ? prev.frequencyDays.filter(d => d !== day)
      : [...prev.frequencyDays, day],
  }));
}

function addScheduleFromPreset(slot: TimeSlot): void {
  // 이미 같은 slot 있으면 skip
  if (draft.schedules.some(s => s.timeSlot === slot)) return;
  const newSched: MedicationSchedule = {
    id: uuid(),
    timeSlot: slot,
    timeDetail: TIME_SLOT_DEFAULTS[slot],
  };
  setDraft(prev => ({ ...prev, schedules: [...prev.schedules, newSched] }));
  setShowTimeSheet(false);
}

function addScheduleCustom(): void {
  const hh = String(stepperHour).padStart(2, '0');
  const mm = String(stepperMinute).padStart(2, '0');
  const newSched: MedicationSchedule = {
    id: uuid(),
    timeSlot: stepperSlot,
    timeDetail: `${hh}:${mm}`,
  };
  setDraft(prev => ({ ...prev, schedules: [...prev.schedules, newSched] }));
  setShowTimeSheet(false);
}

function removeSchedule(id: string): void {
  setDraft(prev => ({ ...prev, schedules: prev.schedules.filter(s => s.id !== id) }));
}

function handleSave(): void {
  if (!canSave) return;
  onSave(draft);
}

// 스테퍼
function stepHour(direction: 1 | -1): void {
  setStepperHour(h => (h + direction + 24) % 24);
}
function stepMinute(direction: 1 | -1): void {
  const opts = [0, 15, 30, 45];
  const idx = opts.indexOf(stepperMinute);
  const next = (idx + direction + 4) % 4;
  setStepperMinute(opts[next]);
}
```

### 9-4. 컴포넌트 트리

```
View (flex:1, bg:'#F8FAFC')
  ├─ Header (Row, px:16, py:14, alignItems:'center', borderBottom)
  │    TouchableOpacity → onBack: Text '←' (fontSize:22, color:PRIMARY)
  │    Text '약 등록' (flex:1, textAlign:'center', fontSize:18, fontWeight:'700')
  │    TouchableOpacity (onPress: handleSave, opacity: canSave ? 1 : 0.4)
  │      Text '저장' (color:PRIMARY, fontWeight:'700', fontSize:16)
  │
  └─ KeyboardAvoidingView (behavior:'padding', flex:1)
       ScrollView (px:16, pt:20, pb:40)
         
         ── [섹션 1: 약 이름] ──
         SectionLabel '약 이름 *'
         TextInput (
           value: draft.name,
           onChangeText: v => updateDraft('name', v),
           placeholder: '예: 위고비, 우울증약, 유산균',
           style: INPUT_STYLE,
         )
         
         ── [섹션 2: 복용 형태] ──
         SectionLabel '복용 형태'
         Row (mb:20)
           [{ key:'oral', icon:'💊', label:'경구' },
            { key:'injection', icon:'💉', label:'주사' },
            { key:'other', icon:'🧴', label:'기타' }].map(opt =>
             TouchableOpacity (
               key:opt.key, flex:1, mr/ml:4,
               bg: draft.form === opt.key ? PRIMARY : '#fff',
               borderRadius:10, p:12, alignItems:'center',
               borderWidth: draft.form === opt.key ? 0 : 1.5,
               borderColor: '#E2E8F0',
               onPress: () => updateDraft('form', opt.key as MedForm)
             )
               Text opt.icon (fontSize:20)
               Text opt.label (
                 fontSize:13, fontWeight:'600',
                 color: draft.form === opt.key ? '#fff' : '#64748B', mt:4
               )
           )
         
         ── [섹션 3: 용량] ──
         SectionLabel '용량'
         TextInput (
           value: draft.dosage,
           onChangeText: v => updateDraft('dosage', v),
           placeholder: '예: 0.5mg, 1정, 2캡슐',
           style: INPUT_STYLE,
         )
         
         ── [섹션 4: 복용 주기] ──
         SectionLabel '복용 주기'
         Row (mb:12)
           ['daily','weekly'].map((f, i) =>
             TouchableOpacity (
               flex:1, mr/ml:4,
               bg: draft.frequency === f ? PRIMARY : '#fff',
               borderRadius:10, p:12, alignItems:'center',
               borderWidth: draft.frequency === f ? 0 : 1.5,
               borderColor: '#E2E8F0',
               onPress: () => updateDraft('frequency', f as FreqType)
             )
               Text (f === 'daily' ? '매일' : '요일 지정') (
                 fontWeight:'600',
                 color: draft.frequency === f ? '#fff' : '#64748B'
               )
           )
         
         {draft.frequency === 'weekly' &&
           Row (flexWrap:'wrap', mb:12)
             WEEK_DAYS_ORDER.map(day =>
               TouchableOpacity (
                 key:day, mr:8, mb:8,
                 w:38, h:38, borderRadius:19,
                 bg: draft.frequencyDays.includes(day) ? PRIMARY : '#fff',
                 borderWidth:1.5,
                 borderColor: draft.frequencyDays.includes(day) ? PRIMARY : '#E2E8F0',
                 justifyContent:'center', alignItems:'center',
                 onPress: () => toggleFreqDay(day)
               )
                 Text day (
                   fontWeight:'600',
                   color: draft.frequencyDays.includes(day) ? '#fff' : '#64748B'
                 )
             )
         }
         
         ── [섹션 5: 복용 시간대] ──
         SectionLabel '복용 시간대'
         {draft.schedules.map(s =>
           View (
             key:s.id, bg:'#fff', borderRadius:10, p:12, mb:8,
             flexDirection:'row', alignItems:'center',
             borderWidth:1, borderColor:'#E2E8F0'
           )
             Text TIME_SLOT_LABELS[s.timeSlot] (flex:1, fontWeight:'600', color:'#1E293B')
             Text s.timeDetail (color:PRIMARY, fontWeight:'600', mr:12)
             TouchableOpacity → removeSchedule(s.id)
               Text '✕' (color:'#94A3B8', fontSize:18)
         )}
         TouchableOpacity (
           bg:'#F0FDF4', borderRadius:10, p:12, mb:20,
           flexDirection:'row', alignItems:'center',
           borderWidth:1.5, borderColor:PRIMARY, borderStyle:'dashed',
           onPress: () => setShowTimeSheet(true)
         )
           Text '+ 시간대 추가' (color:PRIMARY, fontWeight:'600', flex:1, textAlign:'center')
         
         ── [섹션 6: 복용 조건] ──
         SectionLabel '복용 조건'
         Row (mb:20, flexWrap:'wrap')
           (['fasting','before','after','any'] as Condition[]).map(c =>
             TouchableOpacity (
               key:c, mr:8, mb:8,
               bg: draft.condition === c ? PRIMARY : '#fff',
               borderRadius:10, px:16, py:10,
               borderWidth:1.5,
               borderColor: draft.condition === c ? PRIMARY : '#E2E8F0',
               onPress: () => updateDraft('condition', c)
             )
               Text CONDITION_LABELS[c] (
                 fontWeight:'600',
                 color: draft.condition === c ? '#fff' : '#64748B'
               )
           )
         
         ── [섹션 7: 메모] ──
         SectionLabel '메모 (선택)'
         TextInput (
           value: draft.memo,
           onChangeText: v => updateDraft('memo', v),
           placeholder: '특이사항을 입력하세요',
           multiline: true,
           numberOfLines: 3,
           style: { ...INPUT_STYLE, height:80, textAlignVertical:'top' },
         )
  
  ── [시간대 추가 시트] ──
  Modal (visible:showTimeSheet, transparent, animationType:'slide')
    TouchableOpacity (flex:1, bg:'rgba(0,0,0,0.4)') → setShowTimeSheet(false)
    View (bg:'#fff', borderTopRadius:24, p:24)
      Text '시간대 추가' (fontSize:18, fontWeight:'700', mb:20)
      
      // 프리셋 버튼
      Text '빠른 선택' (color:'#94A3B8', fontSize:13, mb:8)
      Row (flexWrap:'wrap', mb:20)
        (['morning','lunch','evening','bedtime'] as TimeSlot[]).map(slot =>
          TouchableOpacity (
            key:slot, mr:8, mb:8,
            bg: draft.schedules.some(s=>s.timeSlot===slot) ? '#E2E8F0' : '#F0FDF4',
            borderRadius:10, px:16, py:10,
            borderWidth:1.5,
            borderColor: draft.schedules.some(s=>s.timeSlot===slot) ? '#CBD5E1' : PRIMARY,
            opacity: draft.schedules.some(s=>s.timeSlot===slot) ? 0.5 : 1,
            onPress: () => addScheduleFromPreset(slot)
          )
            Text `{TIME_SLOT_LABELS[slot]} {TIME_SLOT_DEFAULTS[slot]}` (color:PRIMARY, fontWeight:'600')
        )
      
      // 직접 입력 (▲▼ 스테퍼)
      Text '직접 입력' (color:'#94A3B8', fontSize:13, mb:12)
      
      // 시간대 라벨 선택
      Row (mb:12, flexWrap:'wrap')
        (['morning','lunch','evening','bedtime'] as TimeSlot[]).map(slot =>
          TouchableOpacity (
            key:slot, mr:6, mb:6,
            bg: stepperSlot===slot ? PRIMARY : '#fff',
            borderRadius:8, px:12, py:6,
            borderWidth:1, borderColor: stepperSlot===slot ? PRIMARY : '#E2E8F0',
            onPress: () => setStepperSlot(slot)
          )
            Text TIME_SLOT_LABELS[slot] (
              fontSize:13, fontWeight:'600',
              color: stepperSlot===slot ? '#fff' : '#64748B'
            )
        )
      
      // 시:분 스테퍼
      Row (justifyContent:'center', alignItems:'center', mb:20)
        // 시간 스테퍼
        View (alignItems:'center')
          TouchableOpacity (p:8) → stepHour(1): Text '▲' (fontSize:20, color:PRIMARY)
          Text String(stepperHour).padStart(2,'0') (fontSize:36, fontWeight:'700', color:'#1E293B', w:56, textAlign:'center')
          TouchableOpacity (p:8) → stepHour(-1): Text '▼' (fontSize:20, color:PRIMARY)
        
        Text ':' (fontSize:36, fontWeight:'700', color:'#1E293B', mx:8)
        
        // 분 스테퍼 (0/15/30/45)
        View (alignItems:'center')
          TouchableOpacity (p:8) → stepMinute(1): Text '▲' (fontSize:20, color:PRIMARY)
          Text String(stepperMinute).padStart(2,'0') (fontSize:36, fontWeight:'700', color:'#1E293B', w:56, textAlign:'center')
          TouchableOpacity (p:8) → stepMinute(-1): Text '▼' (fontSize:20, color:PRIMARY)
      
      TouchableOpacity (bg:PRIMARY, borderRadius:14, p:16, alignItems:'center')
        → addScheduleCustom
        Text '추가' (color:'#fff', fontWeight:'700', fontSize:16)
```

---

## 10. 공통 StyleSheet 값

```ts
const styles = StyleSheet.create({
  // 컨테이너
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // 헤더
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1E293B' },
  
  // 카드 공통 그림자
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  
  // 섹션 라벨
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: '#64748B',
    marginBottom: 8, marginTop: 4,
  },
  
  // 인풋 공통
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 20,
  },
  
  // 프라이머리 버튼
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  
  // 달력 셀 기본
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  calDayCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  calDayText: { fontSize: 14 },
});
```

---

## 11. `createInjection` API 연동 (저장 시)

`handleAddMedication` 내부에서 기존 API를 아래와 같이 호출:

```ts
async function handleAddMedication(draft: MedDraft): Promise<void> {
  try {
    // 기존 API 유지: drug=약이름, dosageMg=0, site='none', memo
    await createInjection({
      drug: draft.name,
      dosageMg: 0,
      site: 'none',
      memo: draft.memo || `${draft.dosage} / ${CONDITION_LABELS[draft.condition]}`,
    });
  } catch (e) {
    // API 실패해도 로컬 state는 추가 (오프라인 우선)
    console.warn('createInjection failed:', e);
  }

  const newMed: Medication = {
    id: uuid(),
    name: draft.name,
    form: draft.form,
    dosage: draft.dosage,
    frequency: draft.frequency,
    frequencyDays: draft.frequencyDays,
    schedules: draft.schedules,
    condition: draft.condition,
    memo: draft.memo,
    colorIndex: medications.length % 6,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  setMedications(prev => [...prev, newMed]);
  setScreen('main');
}
```

---

## 12. 컴포넌트 조립 — `InjectionScreen` 최종 구조

```ts
export default function InjectionScreen() {
  // §3-1 state 전부
  const today = todayStr();

  return (
    <View style={styles.screen}>
      {screen === 'main' && (
        <MainScreen
          medications={medications}
          logs={logs}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          onGoManage={() => setScreen('manage')}
          onGoAdd={() => setScreen('add')}
          onToggleLog={handleToggleLog}
          onSelectDate={(date) => { setSelectedDate(date); setShowDateSheet(true); }}
        />
      )}
      {screen === 'manage' && (
        <ManageScreen
          medications={medications}
          onBack={() => setScreen('main')}
          onGoAdd={() => setScreen('add')}
          onDelete={handleDeleteMedication}
        />
      )}
      {screen === 'add' && (
        <AddScreen
          medicationsCount={medications.length}
          onBack={() => setScreen('main')}
          onSave={handleAddMedication}
        />
      )}
      <DateDetailSheet
        visible={showDateSheet}
        date={selectedDate}
        medications={medications}
        logs={logs}
        onClose={() => setShowDateSheet(false)}
        onToggleLog={handleToggleLog}
      />
    </View>
  );
}
```

---

## 13. 엣지 케이스 처리 규칙

| 상황 | 처리 |
|------|------|
| `schedules` 비어 있는 약 등록 | 저장 버튼 비활성화 (canSave = false) |
| 같은 `timeSlot` 프리셋 중복 추가 | `addScheduleFromPreset` 에서 early return, 버튼 opacity 0.5 |
| `weekly` 약 + `frequencyDays` 빈 배열 | 체크리스트/달력 노출 없음 (filter에서 자연 제거) |
| 달력 미래 날짜 탭 | `onPress: undefined` (터치 무반응) |
| 미복용 뱃지 — 미래 시간 | `isOverdue` 음수 → false, 뱃지 없음 |
| `handleToggleLog` 중복 탭 | taken → pending 토글 (완전 삭제 아님, log 유지) |
| 약 삭제 시 log 정합성 | `handleDeleteMedication`에서 해당 `medicationId` logs 동시 제거 |

---

이 설계서대로 codex는 `app/(tabs)/injection.tsx` 단일 파일에 모든 컴포넌트를 순서대로 작성하면 됩니다. 외부 의존성은 `uuid`(또는 `expo-crypto`) 외 없으며, 기존 `createInjection` API 시그니처를 그대로 유지합니다.
