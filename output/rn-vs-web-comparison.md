# GLP-Care RN 네이티브 앱 vs 레어헬스 웹 미니앱 전체 비교 리포트

> 생성일: 2026-04-11
> 비교 기준: RN 소스 (Expo Router, React Native) vs 웹 소스 (React + Vite + Lair SDK)
> 분석 방법: RN 15개 파일(~7,250줄)과 웹 30개 파일(~3,370줄) 전체 소스 코드 1:1 대조

---

## 1. 프로젝트 구조 개요

### RN (GLP-Care)
- **프레임워크**: React Native + Expo Router
- **상태관리**: Zustand (mealStore, userStore)
- **저장소**: AsyncStorage
- **인증**: 자체 소셜 로그인 (Apple/Google/Kakao)
- **네비게이션**: Expo Router 탭 (홈/기록/투약/리포트/프로필), Stack 네비게이션
- **총 화면**: 15개 파일 (약 7,250줄)

### 웹 (레어헬스 미니앱)
- **프레임워크**: React + Vite + React Router DOM
- **상태관리**: Zustand (mealStore, medicationStore, uiStore)
- **저장소**: localStorage (lib/storage.ts 래퍼)
- **인증**: Lair SDK 연동 (호스트앱 세션 → 자체 JWT)
- **네비게이션**: React Router + BottomNav 컴포넌트 (홈/투약/설정 3탭)
- **총 화면**: 30개 파일 (약 3,370줄)

---

## 2. A. 디자인 비교 (화면별)

### 2-1. 메인 대시보드 (홈)

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 홈 | 히어로 카드 | 카드형 (borderRadius:28, shadow, 패딩22) | header flex row, 뒤로가기(←) + h1 | 웹은 카드 없이 헤더만 존재, closeMiniApp 버튼 포함 | P2 |
| 홈 | 날짜 네비게이터 | 원형 화살표 버튼(40x40), '오늘' 뱃지(초록 pill) | 동일 구조, 원형 버튼(40x40), '오늘' 뱃지 | 거의 동일 | - |
| 홈 | 탭바 (자세히/한눈에) | 배경색 슬라이딩 (E2E8F0 → 흰), borderRadius:16 | 버튼 2개, 테두리 방식 (border: 1.5px solid), 초록 테두리 active | RN=배경 전환형, 웹=테두리 전환형. 스타일 차이 | P3 |
| 홈 | 원형 게이지 | react-native-svg, 240px, strokeWidth:14, 초록색(#10B981) | SVG 직접, 200px, strokeWidth:14, 초과시 빨간색(#EF4444) | 웹이 40px 작음. 웹만 초과시 빨간색 전환 | P3 |
| 홈 | 남은 칼로리 배너 | pill형 (borderRadius:999), 초록/주황 2색 | 카드형 (borderRadius:12), 초록/빨강 2색 | RN=pill+주황, 웹=카드+빨강 | P3 |
| 홈 | 매크로 뱃지 | 3개 pill형 (min-width:88), 각 색상 배경 | 3개 flex row (gap:8), 배경색 ${color}18 | RN=pill형, 웹=카드형. 단백질 색상: RN=#10B981 웹=#8B5CF6 | P2 |
| 홈 | 매크로 상세 카드 | 3열 row (width:31.5%), 각 색상 배경 | 3열 flex (gap:8), border 추가 | 웹에 border 추가됨, 단백질 색상 차이 (초록 vs 보라) | P3 |
| 홈 | 식사 카드 그리드 | 2열 (width:48%), shadow, borderRadius:24, min-height:168 | 2열 grid (gap:10), border, borderRadius:16, min-height:110 | 웹이 더 작고 평면적 (shadow 없음, border만) | P3 |
| 홈 | '한눈에' 탭 내용 | "준비 중" 플레이스홀더 | 진행률 바 4개 (칼로리/탄수화물/단백질/지방) | 웹이 오히려 더 완성됨 | P1(웹 우위) |
| 홈 | 폰트 크기 전체 | heroTitle:28, gaugeCalories:40, sectionTitle:19 | h1:24, gauge:size*0.15(=30), sectionTitle:16 | 웹이 전반적으로 작은 폰트 | P3 |
| 홈 | Shadow/Elevation | 전반적으로 shadowRadius:18, elevation:2 | boxShadow: 0 2px 8px rgba(0,0,0,0.06) | RN이 더 깊은 그림자 | P3 |
| 홈 | 로딩 상태 | 없음 (데이터 즉시 표시) | "불러오는 중..." 텍스트 표시 | 웹만 로딩 UI 있음 | P1(웹 우위) |

### 2-2. 투약 화면

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 투약 | 헤더 | "투약 관리" + "약 관리" 텍스트 링크 | "투약 관리" + "약 관리" 초록 버튼 (pill형) | 웹이 CTA 강조 | P3 |
| 투약 | 어제 누락 배너 | 노란 배경, TouchableOpacity | 노란 배경 + border, button 태그 | 동일 구조, 웹에 border 추가 | - |
| 투약 | 빈 상태 (empty) | 💊 이모지, 설명 텍스트, CTA "약 등록하기" | 동일 구조 (💊, 텍스트, CTA) | 거의 동일 | - |
| 투약 | 내 약 요약 배너 | TouchableOpacity, 카드형 | button 태그, flex + border | 동일 기능, 웹은 border 방식 | - |
| 투약 | 오늘의 복약 체크리스트 | 완료 뱃지(pill), 프로그레스바(6px) | 동일 (pill + 프로그레스바 6px) | 거의 동일 | - |
| 투약 | CheckCard 디자인 | TouchableOpacity, dot(10px)+이름+메타+체크원 | button 태그, dot(10px)+이름+메타+체크원 | 거의 동일, 웹에 cursor:pointer | - |
| 투약 | 달력 셀 크기 | calendarCell flex, circle(28x28) | 동일 구조 | 거의 동일 | - |
| 투약 | 달력 범례 | complete/partial/missed/none 4색 | 동일 4색 | 동일 | - |
| 투약 | 주간 요약 카드 | card 내 복약률+놓친횟수, 구분선 | 동일 구조 (flex 2열 + 구분선) | 동일 | - |
| 투약 | 면책 푸터 | footer 텍스트 | 동일 | 동일 | - |
| 투약 | 날짜 상세 시트 | React Native Modal (slide 애니메이션) | createPortal (DOM portal, 하단 시트 시뮬레이션) | RN=네이티브 모달, 웹=CSS 모달 | P3 |

### 2-3. 투약 등록/편집

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 약 등록 | 약 이름 입력 | TextInput, 커스텀 스타일 | input type=text, 웹 표준 | 플랫폼 차이 | - |
| 약 등록 | 복용 형태 선택 | 3개 세그먼트 버튼 (TouchableOpacity) | 3개 button (flex, border) | 동일 기능, 웹 스타일 | - |
| 약 등록 | 요일 선택 | TouchableOpacity pill 7개 | button circle(40x40) 7개 | 웹이 원형, RN이 pill형 | P3 |
| 약 등록 | 시간대 추가 모달 | React Native Modal (slide) + 프리셋 + 스텝퍼 | createPortal 모달 (TimeSlotModal 컴포넌트) + 프리셋 + 스텝퍼 | 동일 구조 | - |
| 약 등록 | 시간 스텝퍼 | ▲▼ 버튼 + 시:분 표시 | 동일 (▲▼ + HH:MM) | 동일 | - |
| 약 등록 | 복용 조건 | 4개 pill (fasting/before/after/any) | 4개 button (pill형, border) | 동일 | - |
| 약 등록 | 메모 입력 | TextInput multiline, 4줄 | textarea rows=3 | 동일 기능 | - |
| 약 등록 | 저장 버튼 | 2개 (헤더 "저장" + 하단 "저장하기") | 2개 (헤더 "저장" + 하단 "저장하기") | 동일 | - |
| 약 편집 | 삭제 버튼 | Alert.alert 확인 대화상자 | window.confirm + 별도 삭제 버튼 (빨간 배경) | 웹은 편집 페이지에 삭제 버튼 별도 표시 | P3 |
| 약 관리 | 약 관리 화면 | ManageScreen (목록+편집+삭제) 별도 화면 | 없음 — 약 관리 = 약 등록 화면으로 이동 | RN은 manage→edit→add 3단계, 웹은 add/edit 2페이지 | P2 |

### 2-4. 식단 추가

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 식단 추가 | 헤더 | "X" 닫기 + 식사명 + "직접입력" 링크 | "✕" 닫기 + 식사명 + "직접입력" 링크 | 동일 구조 | - |
| 식단 추가 | 검색 카드 | 카드형 (borderRadius:24, shadow), label + TextInput | 카드형 (borderRadius:24, boxShadow), label + input | 거의 동일 | - |
| 식단 추가 | 검색 결과 카드 | TouchableOpacity (borderRadius:22, shadow), dot+이름+칼로리+매크로+제조사 | button (borderRadius:22, boxShadow), dot+이름+칼로리+매크로 | 웹에 제조사 미표시 | P2 |
| 식단 추가 | 상세 모드 (영양 타일) | 4타일 2x2 (색상 배경) | 동일 (2x2, 같은 색상) | 동일 | - |
| 식단 추가 | 인분 조절기 | -, +, count pill | 동일 (−, +, count) | 동일 | - |
| 식단 추가 | 직접 입력 모드 | 5개 TextInput | 5개 input | 동일 | - |
| 식단 추가 | FlatList 사용 | FlatList (가상화 스크롤) | 일반 map (비가상화) | RN이 성능 우위 (긴 목록) | P3 |

### 2-5. 설정 화면

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 설정 | 화면 구성 | 프로필(약/체중/시작일) + 알림설정 + 공유카드 + CSV내보내기 + 로그아웃 | 프로필(닉네임/상태) + 목표(칼로리/탄단지) + 정보(버전) + 면책 | 완전 다른 구조 | P1 |
| 설정 | 목표 칼로리 변경 | 없음 (온보딩에서 1회 설정) | GoalInput 컴포넌트로 인라인 편집 | 웹만 칼로리/탄단지 직접 변경 가능 | P1(웹 우위) |
| 설정 | 알림 설정 | Switch 토글 (식사/수분 리마인더, 시간 설정) | 없음 | 웹에서 제거됨 (웹 알림 미지원) | P2 |
| 설정 | 공유카드 설정 | Switch 토글 3개 | 없음 | 웹에서 제거됨 | P3 |
| 설정 | CSV 내보내기 | Share.share()로 CSV 텍스트 공유 | 없음 | 웹에서 제거됨 | P3 |
| 설정 | 로그아웃 | PrimaryButton "로그아웃" | 없음 | 웹에서 제거됨 (Lair 호스트앱에서 관리) | P2 |
| 설정 | 복용 약물 변경 | wegovy/mounjaro/saxenda/기타 선택 | 없음 | 웹에서 제거됨 | P2 |
| 설정 | 체중 입력 | TextInput (decimal-pad) | 없음 | 웹에서 제거됨 | P2 |
| 설정 | 면책 안내 | footer 텍스트 (투약 화면) | 별도 섹션 (노란 배경 카드) | 웹이 더 눈에 띄게 표시 | P3 |

---

## 3. B. 기능 비교 (화면별 — RN에 있고 웹에 없는 것)

### 3-1. 메인 대시보드

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 홈 | 날짜 네비게이터 | 있음 (selectedDate state, 좌우 화살표) | 있음 (selectedDate in store, 좌우 화살표) | 동일 | - |
| 홈 | 원형 게이지 | react-native-svg 직접 구현 (788줄 파일 내) | CircularGauge 컴포넌트 분리 (67줄) | 동일 기능, 웹이 모듈화 | - |
| 홈 | 자세히/한눈에 탭 | "한눈에"는 "준비 중" 플레이스홀더 | "한눈에"는 진행률 바 4개 구현 완료 | 웹이 더 완성됨 | P1(웹 우위) |
| 홈 | 식사별 카드 (4개) | 있음 (breakfast/lunch/dinner/snack) | 있음 (동일 4개) | 동일 | - |
| 홈 | 식사 분류 로직 | todaySummary.meals 에서 key별 분리 | loggedAt 시간 기반 자동 분류 (getMealTypeFromLog) | 웹은 시간대 기반 자동 분류 | P2 |
| 홈 | 칼로리 목표 소스 | API 응답 (calorieGoalKcal 등, fallback 2000) | uiStore (localStorage, 기본값 2000) | RN=서버 목표, 웹=로컬 목표 | P1 |
| 홈 | 매크로 목표 소스 | API 응답 (goalCarbsG 등, fallback 250/120/65) | uiStore (localStorage, 기본값 250/120/65) | RN=서버 목표, 웹=로컬 목표 | P1 |

### 3-2. 투약

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 투약 | 오늘 복약 체크리스트 | 있음 (slot별 그룹핑, CheckCard) | 있음 (동일 구조) | 동일 | - |
| 투약 | 어제 누락 배너 | 있음 (yesterdayMissed 계산) | 있음 (동일 로직) | 동일 | - |
| 투약 | 달력 뷰 | 있음 (CalendarView 인라인 컴포넌트) | 있음 (CalendarView 별도 컴포넌트) | 동일 기능 | - |
| 투약 | 주간 요약 | 있음 (복약률/놓친횟수/상세리스트) | 있음 (동일) | 동일 | - |
| 투약 | 다음 예정 | 있음 (주간 약의 다음 복약일 계산) | 있음 (동일 로직) | 동일 | - |
| 투약 | 약 관리 화면 | ManageScreen 별도 화면 (목록+편집+삭제) | 없음 — navigate('/medication/add')로 이동 | RN은 중간 관리 화면 있음, 웹은 바로 등록으로 | P2 |
| 투약 | 약 편집 | AddScreen에 editingMedication 전달 | MedicationEditPage 별도 라우트 (/medication/:id/edit) | RN=같은 화면 재활용, 웹=별도 페이지 | P3 |
| 투약 | 면책 모달 (첫 실행) | AsyncStorage 기반 DISCLAIMER_ACCEPTED_KEY | DisclaimerModal 컴포넌트 (localStorage) | 동일 기능, 다른 구현 | - |
| 투약 | 체크 해제 확인 | Alert.alert("복약 기록 취소") | window.confirm("복약 기록을 취소할까요?") | 동일 기능 | - |
| 투약 | 낙관적 업데이트 | 있음 (setLogs 즉시 업데이트 → API 호출) | 없음 (API 호출 후 store 업데이트) | RN이 UX 더 부드러움 | P2 |
| 투약 | 오프라인 감지 | NetworkError catch → isOffline state → 배너 | 없음 (에러 메시지만) | 웹에서 오프라인 별도 처리 없음 | P2 |
| 투약 | 알림 연동 | requestNotificationPermission, syncMedicationNotifications, cancelDailyNotif | 없음 | 웹에서 완전 제거 | P3 |

### 3-3. 식단 추가

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 식단 | 검색 모드 | 있음 (searchFood API, debounce 500ms) | 있음 (searchFood API, debounce 500ms) | 동일 | - |
| 식단 | 직접 입력 모드 | 있음 (5개 필드, sourceType: 'manual') | 있음 (5개 필드) | 동일 | - |
| 식단 | 상세 모드 (인분 조절) | 있음 (servingCount +-) | 있음 (동일) | 동일 | - |
| 식단 | 최근 음식 | AsyncStorage 기반 (recentFoods lib) | localStorage 기반 (storageGet/storageSet) | 동일 기능 | - |
| 식단 | 카메라 AI 분석 | 있음 (meal/camera.tsx, 167줄, 카메라 촬영→AI분석) | 없음 | 웹에서 완전 제거 (네이티브 기능) | P3 |
| 식단 | FlatList 가상화 | 있음 (검색결과 FlatList) | 없음 (map 렌더링) | 웹은 대량 결과시 성능 이슈 가능 | P3 |
| 식단 | 검색 결과 제조사 표시 | item.manufacturer 표시 | 없음 | 웹에 빠짐 | P2 |
| 식단 | 저장 시 mealType 전달 | mealType: mealType (검색 파라미터) | loggedAt: makeLoggedAt(mealType) — 시간으로 변환 | RN=타입 직접 전달, 웹=시간대 기반 | P2 |
| 식단 | 저장 시 sourceType | sourceType: 'search' 또는 'manual' | 없음 (전달 안 함) | 웹에서 sourceType 빠짐 | P3 |
| 식단 | 저장 시 servingCount | servingCount 필드 포함 | 없음 (칼로리에 곱해서 전달) | 웹에서 servingCount 메타 빠짐 | P3 |

### 3-4. 설정/프로필

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 설정 | 칼로리 목표 변경 | 없음 (온보딩에서만 설정) | 있음 (GoalInput으로 실시간 변경) | 웹 우위 | P1(웹 우위) |
| 설정 | 탄단지 목표 변경 | 없음 | 있음 | 웹 우위 | P1(웹 우위) |
| 설정 | 복용 약물 선택 | 있음 (wegovy/mounjaro/saxenda/other) | 없음 | 웹에서 제거 | P2 |
| 설정 | 체중 입력 | 있음 (decimal-pad) | 없음 | 웹에서 제거 | P2 |
| 설정 | 복용 시작일 | 있음 (YYYY-MM-DD) | 없음 | 웹에서 제거 | P2 |
| 설정 | 알림 설정 | 있음 (식사/수분 리마인더 토글, 시간) | 없음 | 웹에서 제거 | P3 |
| 설정 | 공유카드 설정 | 있음 (3개 토글) | 없음 | 웹에서 제거 | P3 |
| 설정 | CSV 내보내기 | 있음 (Share.share) | 없음 | 웹에서 제거 | P3 |
| 설정 | 로그아웃 | 있음 | 없음 (Lair 호스트앱 관리) | 의도적 제거 | - |
| 설정 | 프로필 저장 (서버) | patchProfile API | 없음 (로컬만) | 웹은 로컬 저장만 | P1 |

### 3-5. 네비게이션

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 네비게이션 | 탭 수 | 5개 (홈/기록/투약/리포트/프로필) | 3개 (홈/투약/설정) | 기록/리포트 탭 웹에서 제거 | P2 |
| 네비게이션 | 탭 아이콘 | Feather 아이콘 (home/book-open/activity/bar-chart/user) | 이모지 (🏠💊⚙️) | 웹은 이모지만 사용 | P2 |
| 네비게이션 | 탭바 위치 | 네이티브 탭바 (하단) | CSS fixed bottom (BottomNav 컴포넌트) | 웹은 커스텀 구현 | P3 |
| 네비게이션 | 딥링크 | 알림 탭 → 투약 탭 (registerNotificationTapHandler) | 없음 | 웹에서 제거 | P3 |
| 네비게이션 | safe-area 처리 | SafeAreaView | env(safe-area-inset-bottom) | 웹에서 CSS로 대체 | - |
| 네비게이션 | maxWidth 제한 | 없음 (전체 너비) | 430px maxWidth | 웹은 모바일 시뮬레이션 | - |

---

## 4. C. 기획/UX 차이

| 화면 | 항목 | RN 상태 | 웹 상태 | 차이 | 우선순위 |
|---|---|---|---|---|---|
| 온보딩 | 온보딩 플로우 | 3단계: 약 선택 → 신체정보 → 목표확인 (glp1-setup.tsx 567줄 + goal-confirm.tsx 50줄) | 없음 — 온보딩 없이 바로 대시보드 | 웹에서 온보딩 완전 제거 | P1 |
| 로그인 | 로그인 플로우 | 자체 소셜 로그인 (Apple/Google/Kakao) → 온보딩 → 홈 | Lair SDK 세션 자동 감지 (useSession) → 백엔드 lair-login API → JWT | 완전 다른 인증 구조 | - |
| 투약 | 빈 상태 (투약) | 💊 + "복용 중인 약을 등록해 주세요" + CTA | 동일 | 동일 | - |
| 식단 | 빈 상태 (식단 검색) | "검색 결과가 없습니다" + "다른 키워드로 다시 검색" | 동일 | 동일 | - |
| 식단 | 빈 상태 (최근 음식) | "최근 등록한 음식이 없습니다" | 동일 | 동일 | - |
| 투약 | 에러 처리 (투약) | Alert.alert + loadError 상태 + retry | error 상태 + "다시 시도" 버튼 | 동일 구조 | - |
| 식단 | 에러 처리 (식단) | Alert.alert("저장 실패") | alert("저장에 실패했습니다") | 동일 | - |
| 투약 | 오프라인 대응 (투약) | NetworkError 감지 → isOffline state → 배너 | 없음 (에러 메시지만) | RN이 더 세밀 | P2 |
| 글로벌 | 오프라인 배너 (글로벌) | 없음 (화면별 처리) | OfflineBanner 컴포넌트 (navigator.onLine) | 웹은 글로벌 오프라인 배너 있음 | P1(웹 우위) |
| 글로벌 | 면책 모달 | AsyncStorage 기반, 투약 화면 최초 접근시 | DisclaimerModal (앱 전체 최초 실행시, createPortal) | 웹이 더 넓은 범위로 적용 | P3 |
| 글로벌 | 확인 대화상자 | Alert.alert (네이티브) | window.confirm (브라우저) | 플랫폼 차이 | - |
| 기록 | 기록 탭 | 있음 (log.tsx, 오늘 기록 수정/삭제) | 없음 | 웹에서 제거 | P2 |
| 리포트 | 리포트 탭 | 있음 (report.tsx, 주간 리포트/히트맵/공유카드) | 없음 | 웹에서 제거 | P2 |
| 체중 | 체중 기록 | 있음 (weight.tsx, 체중 입력/히스토리) | 없음 | 웹에서 제거 | P2 |

---

## 5. D. 기술적 이슈 (웹에서 동작 안 하는 것)

| 항목 | 상태 | 영향 | 우선순위 |
|---|---|---|---|
| 백엔드 API 연결 | fetchWithAuth → BASE_URL (VITE_API_URL 또는 상대경로). 프록시 미설정시 CORS/404 | 식단/투약 데이터 로드 실패 | P0 |
| Lair SDK 브라우저 폴백 | `lair.host.isInHostApp() = false` → BrowserModeBanner 표시. auth.getInitData() = null → useSession에서 token/nickname null | 로그인 불가, API 인증 실패 | P0 |
| 토큰 갱신 | lair.auth.requestTokenRefresh() → 브라우저에서 실패 → requireLogin() → no-op | 401 후 복구 불가 | P0 |
| 푸시 알림 | 완전 제거 (import 없음) | 복약 리마인더 없음 | P3 |
| 카메라 | meal/camera.tsx 웹에서 미포팅 | AI 식단 분석 불가 | P3 |
| 생체인증 | 없음 (RN에도 미구현) | - | - |
| AsyncStorage → localStorage | 웹에서 localStorage로 전환 (lib/storage.ts) | 정상 동작 | - |
| Share API | 웹에서 미구현 (CSV 내보내기 등 제거) | 공유 기능 없음 | P3 |
| KeyboardAvoidingView | 웹에서 해당 없음 (CSS로 대체) | - | - |
| FlatList 가상화 | 웹에서 map으로 대체 | 대량 검색결과시 성능 저하 가능 | P3 |

---

## 6. E. 웹에서 추가된 것 (RN에 없는 것)

| 항목 | 웹 구현 | 설명 |
|---|---|---|
| i18n 통합 | react-i18next (useTranslation), i18n/i18n.ts | 다국어 지원 기반 마련 (현재 ko만) |
| 브라우저 폴백 배너 | BrowserModeBanner (App.tsx) | Lair 호스트앱 바깥에서 실행시 경고 |
| Lair SDK 연결 | lair-client.ts (createLairClient, ready, getSession, closeMiniApp) | 호스트앱 연동 |
| BottomNav 웹 버전 | BottomNav.tsx (NavLink 3개, 이모지 아이콘, fixed bottom) | 웹 전용 하단 탭바 |
| DisclaimerModal | DisclaimerModal.tsx (createPortal, localStorage) | 앱 전체 면책 모달 |
| closeMiniApp 버튼 | MealDashboardPage 헤더에 ← 버튼 → closeMiniApp() | 호스트앱으로 돌아가기 |
| ErrorBoundary | ErrorBoundary.tsx (React Error Boundary) | 전역 에러 캐치 |
| OfflineBanner | OfflineBanner.tsx (navigator.onLine 감지) | 글로벌 오프라인 상태 표시 |
| '한눈에' 탭 구현 | 진행률 바 4개 (칼로리/탄/단/지) | RN은 "준비 중" |
| 목표 인라인 편집 | SettingsPage GoalInput 컴포넌트 | 칼로리/탄단지 목표 직접 변경 |
| lazy loading | React.lazy + Suspense (모든 페이지) | 코드 스플리팅 |
| PageLoader | 전체 화면 로딩 UI (그라데이션 배경) | 초기 로딩 UX |
| vConsole | DEV 모드에서 vconsole 자동 로드 | 모바일 웹뷰 디버깅 |
| Noto Sans KR | 동적 폰트 주입 (main.tsx) | 웹 폰트 로딩 |
| theme tokens | tokens.ts (색상/간격/타이포 토큰) | 디자인 토큰 분리 (미사용 상태) |
| 타입 분리 | types/medication.ts (296줄, 공유 유틸+타입) | RN은 injection.tsx에 인라인 |
| 목표 초과시 빨간 게이지 | CircularGauge에서 isOver → stroke="#EF4444" | RN은 항상 초록 |

---

## 7. 웹 미니앱에서 수정해야 할 것 (우선순위별)

### P0 — 반드시 수정 (앱 동작 불가)

1. **백엔드 API 연결 확인**: VITE_API_URL 환경변수 설정, 프록시 구성 또는 CORS 허용. 현재 `fetchWithAuth`가 상대경로 사용 중이라 Lair 웹뷰 내에서 올바른 BASE_URL 필요
2. **Lair SDK 인증 플로우 완성**: `useSession` → `lairLogin` → JWT 발급 → `storageSet('token')` 플로우가 호스트앱 내에서 정상 동작하는지 E2E 검증
3. **토큰 갱신 실패 복구**: `requestTokenRefresh()` 실패 시 `requireLogin()` 호출 후 사용자에게 재로그인 안내 UI 필요

### P1 — 높은 우선순위 (핵심 기능 차이)

4. **칼로리/매크로 목표 소스 통일**: RN은 서버에서 목표값 수신, 웹은 localStorage 하드코딩(2000/250/120/65). 서버 API에서 목표값을 받아 uiStore에 반영하도록 수정
5. **온보딩 플로우 추가 또는 대안**: RN은 3단계 온보딩(약 선택→신체정보→목표 계산)으로 개인화 목표 생성. 웹은 기본값만 사용. 최소한 설정에서 체중 기반 목표 자동계산 지원 필요
6. **프로필 데이터 서버 동기화**: 웹 SettingsPage의 GoalInput이 localStorage만 저장. 서버 patchProfile API 연동 필요

### P2 — 중간 우선순위 (기능 누락)

7. **약 관리(목록) 화면 추가**: RN의 ManageScreen에 해당하는 약 목록 화면 없음. 현재 "약 관리" 버튼이 /medication/add로 이동하는데, 기존 약 목록 + 각 약 편집 링크 표시하는 중간 페이지 필요
8. **낙관적 업데이트 적용**: medicationStore.upsertLog가 API 응답 후에만 state 업데이트. 체크 토글 시 즉시 UI 반영 후 API 호출로 변경
9. **식단 저장 시 mealType 전달**: 웹은 loggedAt 시간대로 식사 유형 추론하지만, RN처럼 명시적 mealType 전달이 더 정확
10. **검색결과 제조사(manufacturer) 표시**: FoodCard에 제조사 정보 미표시. RN처럼 표시 추가
11. **기록 탭 (식사 수정/삭제)**: RN의 log.tsx에 해당하는 기능 없음. 대시보드에서 식사 기록 편집/삭제 필요
12. **리포트 탭**: RN의 report.tsx (주간 히트맵, 공유카드) 미포팅
13. **체중 기록**: RN의 weight.tsx 미포팅
14. **투약 오프라인 처리**: 투약 API 실패시 NetworkError 구분하여 별도 안내
15. **탭 아이콘**: 이모지 → Lucide/Feather 아이콘으로 교체 (전문적 인상)
16. **단백질 색상 불일치**: 매크로 뱃지/카드에서 단백질 색상 RN=#10B981(초록), 웹=#8B5CF6(보라). 통일 필요

### P3 — 낮은 우선순위 (폴리싱)

17. **탭바 스타일 통일**: 대시보드 자세히/한눈에 탭 — RN의 배경전환형을 웹에도 적용
18. **게이지 크기**: 200px → 240px로 RN과 동일하게
19. **식사 카드 크기**: min-height 110 → 168로 RN과 동일하게
20. **요일 칩 디자인**: 약 등록 화면에서 원형(웹) vs pill형(RN) 통일
21. **카메라 AI 식단 분석**: 웹 카메라 API 또는 이미지 업로드로 구현 고려
22. **FlatList 가상화**: 검색결과가 많을 경우 react-window 등 적용 고려
23. **알림 설정 UI**: 웹에서 제거되었으나 향후 Web Push 지원 시 복원
24. **공유카드/CSV 내보내기**: Web Share API 또는 다운로드로 구현 고려
25. **sourceType/servingCount 메타**: 식단 저장 시 메타데이터 전달 추가
26. **Shadow 깊이 조정**: 웹의 boxShadow를 RN 수준으로 조정하여 입체감 통일

---

## 8. 요약 통계

| 카테고리 | 항목 수 |
|---|---|
| P0 (앱 동작 불가) | 3 |
| P1 (핵심 기능 차이) | 3 |
| P2 (기능 누락) | 10 |
| P3 (폴리싱) | 10 |
| 웹 우위 (RN에 없는 것) | 17 |
| 동일/유사 | 30+ |

---

*이 리포트는 RN 15개 파일(~7,250줄)과 웹 30개 파일(~3,370줄)의 소스 코드를 1:1 대조하여 작성되었습니다.*
