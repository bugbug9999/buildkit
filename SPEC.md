# BuildKit Dashboard 제품 사양서 (Product Specification)

## 1. 제품 개요 및 목표

### 1.1 제품 정의
BuildKit Dashboard는 CLI 기반 AI 오케스트레이션 도구 BuildKit을 웹 기반 대시보드로 확장하는 프로젝트다. 로컬 Mac에서 구동되는 데스크탑 웹 앱으로, 비개발자도 AI 파이프라인을 시각적으로 구성/실행/모니터링할 수 있게 한다.

### 1.2 핵심 목표
| 목표 | 측정 지표 |
|------|----------|
| 비기술 사용자 접근성 | 파이프라인 생성까지 평균 5분 이내 |
| 실시간 가시성 | 각 스텝 진행률, 토큰 사용량, 비용을 실시간 표시 |
| 파이프라인 재사용성 | 템플릿 기반 생성, 이력 조회, 복제 기능 |
| CLI 호환성 유지 | 기존 `pipeline.json`, `tasks.json` 포맷 100% 호환 |
| 제로 클라우드 의존 | 로컬 실행 전용, 파일시스템 직접 접근 |

### 1.3 현재 아키텍처 (buildkit.js 408줄)

| 함수 | 줄 | 역할 |
|------|-----|------|
| `initProviders()` | 17-46 | Claude SDK / Gemini SDK+CLI / OpenAI SDK+Codex CLI 초기화 |
| `callAI(model, prompt, options)` | 49-121 | 모델명 기반 라우팅. sonnet/opus → Anthropic, gemini → SDK or CLI, codex → CLI |
| `extractContext(codebase, files, keywords)` | 124-159 | 컨텍스트 최소화. 200줄 이하 전체, 키워드 주변만 추출 |
| `verify(codebase, type)` | 183-196 | typecheck/lint/build 검증 |
| `runPipeline(pipelinePath)` | 199-327 | 순차 실행. output→input 체이닝, 검증, 리뷰 점수 기반 재실행 |
| `runTask(taskPath)` | 330-363 | `Promise.allSettled`로 병렬 실행 |

---

## 2. 타겟 사용자

| 페르소나 | 역할 | 핵심 니즈 |
|----------|------|----------|
| **A: PM/기획자** (주 사용자) | 파이프라인 시각 구성/실행/모니터링 | JSON 편집 없이 드래그 앤 드롭 |
| **B: 테크리드** | 템플릿 설계, 모델/비용 최적화 | JSON 직접 편집 가능, 검증 설정 |
| **C: 개발자** (기존 CLI 사용자) | CLI와 대시보드 병행, 태스크 모드 | CLI 호환, 실행 이력/비용 분석 |

---

## 3. 기술 스택

### 3.1 제약 조건
- 로컬 Mac 전용 (파일시스템, CLI 도구 직접 접근)
- 환경변수(API 키) 접근 필수
- CLI 도구 실행: Gemini CLI, Codex CLI

### 3.2 스택

| 레이어 | 기술 | 근거 |
|--------|------|------|
| Backend | Node.js + Express | 기존 buildkit.js가 Node.js ESM. 코어 엔진 직접 import |
| WebSocket | Socket.IO | 스텝별 실시간 진행률. Express와 통합 |
| Frontend | Next.js 14 (App Router) | React 기반, 파일 기반 라우팅 |
| UI | Tailwind CSS + shadcn/ui | 빠른 프로토타이핑, 일관된 컴포넌트 |
| 상태 관리 | Zustand | 파이프라인 실행 상태, WebSocket 이벤트 |
| DB | SQLite (better-sqlite3) | 로컬 전용, 실행 이력/비용 기록 |
| 차트 | Recharts | 토큰 사용량/비용 시각화 |
| 파이프라인 빌더 | React Flow | 노드 기반 시각적 편집 |

### 3.3 디렉토리 구조

```
buildkit/
├── buildkit.js              # 기존 CLI (호환 유지, thin wrapper)
├── package.json
├── core/                    # 엔진 모듈화
│   ├── engine.js            # PipelineEngine, TaskEngine (EventEmitter 기반)
│   ├── providers.js         # initProviders, callAI
│   ├── context.js           # extractContext, getGitDiff
│   ├── verify.js            # verify, applyCode
│   └── types.ts             # TypeScript 타입 정의
├── server/
│   ├── index.js             # Express + Socket.IO 서버
│   ├── routes/
│   │   ├── pipelines.js     # 파이프라인 CRUD
│   │   ├── tasks.js         # 태스크 CRUD
│   │   ├── executions.js    # 실행 이력
│   │   ├── providers.js     # AI 프로바이더 상태
│   │   └── filesystem.js    # 파일 탐색
│   ├── db/
│   │   ├── schema.sql
│   │   └── db.js            # better-sqlite3 래퍼
│   └── ws/
│       └── execution.js     # WebSocket 실행 이벤트 핸들러
├── dashboard/               # Next.js 프론트엔드
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # 대시보드 홈
│   │   ├── pipelines/
│   │   ├── tasks/
│   │   ├── history/
│   │   ├── settings/
│   │   └── guide/
│   ├── components/
│   │   ├── pipeline-builder/
│   │   ├── execution-monitor/
│   │   ├── common/
│   │   └── layouts/
│   └── lib/
│       ├── store.ts         # Zustand
│       ├── socket.ts        # Socket.IO 클라이언트
│       └── api.ts           # fetch 래퍼
└── examples/                # 기존 예시 유지
```

---

## 4. 네비게이션 구조

```
좌측 사이드바 (고정, 240px)
├── 🏠 대시보드          /
├── 🔗 파이프라인         /pipelines
│   ├── 목록             /pipelines
│   ├── 새로 만들기       /pipelines/new
│   └── 상세/편집        /pipelines/[id]
├── ⚡ 빠른 태스크        /tasks
│   ├── 목록             /tasks
│   └── 새로 만들기       /tasks/new
├── 📊 실행 이력         /history
│   └── 실행 상세        /history/[id]
├── ⚙️ 설정             /settings
│   ├── AI 프로바이더     /settings/providers
│   ├── 기본값           /settings/defaults
│   └── API 키           /settings/keys
└── 📖 가이드           /guide
```

**상단 바**: 좌측 로고+버전, 중앙 현재 실행 상태, 우측 AI 프로바이더 연결 인디케이터 (●●●)

---

## 5. 상세 페이지 사양

### 5.1 대시보드 홈 (`/`)

**레이아웃**: 2열 (좌 65%, 우 35%)

**좌측:**
- **현재 실행 카드** (실행 중일 때만)
  - 파이프라인명, 진행률 바 (3/5 스텝), 각 스텝 상태 아이콘
  - 현재 스텝 실시간 로그 (마지막 10줄, auto-scroll)
  - [중지] [상세보기]
- **최근 실행 목록** (테이블, 10건)
  - 열: 파이프라인명, 모드, 상태(배지), 토큰, 비용, 소요시간, 일시
  - 행 클릭 → `/history/[id]`

**우측:**
- **빠른 실행 패널**: 파이프라인 드롭다운 + [실행], [JSON 파일 열기]
- **AI 프로바이더 상태 카드**: 각 프로바이더 이름, 연결방식(SDK/CLI), 상태 점
- **이번 달 사용량**: 총 토큰, 총 비용(USD), 실행 횟수, 모델별 비용 도넛 차트

### 5.2 파이프라인 목록 (`/pipelines`)

**카드 그리드 (3열)**, 각 카드:
- 이름 (bold), 설명 (1줄), 스텝 수 배지, 모델 아이콘들, 마지막 실행일
- 호버: [실행] [편집] [복제] [삭제]

**상단**: [+ 새 파이프라인] [JSON 가져오기], 검색, 정렬

### 5.3 파이프라인 빌더 (`/pipelines/new` 또는 `/pipelines/[id]`)

**3패널 레이아웃** (좌 250px / 중앙 플렉스 / 우 320px)

#### 좌측 — 스텝 팔레트 (드래그 가능)
| 유형 | 기본 role | 기본 model |
|------|----------|-----------|
| 📋 UX 기획 | CPO | sonnet |
| 🏗️ 아키텍처 | Blueprint | sonnet |
| 💻 코드 생성 | Developer | gemini |
| 🔍 리뷰 | Reviewer | sonnet |
| 🛡️ 보안 검토 | Security | sonnet |
| 🧪 테스트 생성 | Tester | gemini |
| 📝 커스텀 | 사용자 정의 | 사용자 선택 |

#### 중앙 — 캔버스 (React Flow)
- **시작 노드**: 프로젝트명 + codebase 경로
- **스텝 노드**: 드래그 앤 드롭 추가. role 아이콘, step 이름, model 배지 표시
- **연결선**: output → input 데이터 흐름, 라벨(문서/코드/diff)
- **끝 노드**: git commit 여부 토글
- 캔버스 컨트롤: 확대/축소, 전체 보기, 미니맵

#### 우측 — 속성 패널 (노드 선택 시)

**기본 정보:**
- 스텝 이름 (text)
- 역할 (드롭다운)

**AI 모델 선택:**
- 라디오: Claude Sonnet / Opus / Gemini / GPT-4o / Codex
- 각 모델 옆 비용 표시, 미설정 모델 비활성
- [고급] maxTokens 슬라이더 (1024-16384)

**프롬프트 편집기:**
- 멀티라인 textarea
- 변수 지원: `{{이전스텝명}}`, `{{파일목록}}`
- 글자 수 / 예상 토큰 수 실시간 표시

**입력 설정:**
- 체크박스: 이전 스텝 출력 (스텝 드롭다운) / 파일 (경로+찾아보기) / Git Diff
- 키워드 필터 (쉼표 구분)

**출력 설정:**
- 라디오: 문서로 저장 (경로) / 코드로 적용 (파일 목록) / 없음

**검증 설정** (출력이 '코드'일 때만):
- 체크박스: TypeCheck / Lint / Build
- 자동 재시도 토글

**리뷰 설정** (role이 'Reviewer'일 때만):
- 통과 점수 슬라이더 (1-10, 기본 7)
- 미통과 시 재실행 스텝 드롭다운

**필수 여부** 토글 (OFF면 실패해도 계속)

#### 하단 액션 바
- [저장] [JSON으로 내보내기] [JSON 보기/편집 토글] [실행]

#### JSON 양방향 동기화
- [JSON 보기/편집] 토글 시 캔버스가 JSON 에디터로 전환
- JSON ↔ 캔버스 실시간 양방향 동기화
- JSON 포맷 = 기존 `pipeline.json` (CLI 호환)

### 5.4 실행 모니터 (`/history/[id]`)

**상단 요약 바:**
- 파이프라인명, 시작 시각, 경과 시간 (라이브 카운터)
- 상태 배지, 진행률 "3/5 스텝 완료" + 프로그레스 바
- 누적 토큰 / 비용 (실시간), [중지]

**스텝 타임라인 (세로):**
```
◉ Step 1: UX 기획 (Claude Sonnet)         ✅ 완료 | 2,340 tokens | 3.2s
  ├─ 입력: PRD.md
  └─ 출력: specs/injection-ux.md [열기]
  [출력 내용 미리보기 접기/펼치기]

◉ Step 2: 아키텍처 (Claude Sonnet)         ✅ 완료 | 3,120 tokens | 4.1s
  ├─ 입력: specs/injection-ux.md
  └─ 출력: specs/injection-arch.md [열기]

● Step 3: 백엔드 코드 (Gemini)             🔄 실행중... 12s
  ├─ 입력: specs/injection-arch.md
  ├─ 대상 파일: prisma/schema.prisma, src/routes/injection.ts
  ├─ 검증: typecheck
  └─ [실시간 로그 스트림]

○ Step 4: 프론트엔드 코드 (Gemini)         ⏳ 대기
○ Step 5: 리뷰 (Claude Sonnet)             ⏳ 대기
```

- 완료 스텝: 출력 미리보기 (접기/펼치기)
- 실행 중: 실시간 로그, auto-scroll
- 실패: 빨간 배경, 에러 메시지, [재시도]
- 리뷰 스텝: 점수 원형 게이지, 통과/미통과

**하단 (완료 후):**
- 비용 분석 테이블: 스텝별 모델, 토큰(in/out), 비용, 소요시간, 총계
- [파이프라인 재실행] [결과 내보내기]

### 5.5 빠른 태스크 (`/tasks`)

**테이블 레이아웃:**
- 열: 파일경로, 수정 내용(do), 모델, 라인, 코드베이스, 상태
- [+ 태스크 추가] 인라인 편집 행
- 전체/개별 선택 체크박스

상단: [JSON 가져오기] [전체 실행]
실행 중: 각 행 상태 셀 실시간 갱신

### 5.6 설정 (`/settings`)

**AI 프로바이더 탭:** 각 프로바이더별 API 키(password) 또는 CLI 경로, 연결 테스트, 상태
**기본값 탭:** 기본 codebase 경로, 역할별 기본 모델, maxTokens, 리뷰 통과 점수

### 5.7 가이드 (`/guide`)

Markdown 기반 렌더링 (react-markdown):
- 시작하기: API 키 설정, 첫 파이프라인 실행
- 파이프라인 이해: step 구조, input/output 체이닝, 검증, 리뷰 점수
- 모델 선택 가이드: 각 모델 특성/가격/추천 용도
- 컨텍스트 최소화: keywords, 파일 제한 의미
- CLI 호환: JSON 포맷 상세, CLI와 대시보드 병행

---

## 6. 데이터 모델

### 6.1 SQLite 스키마

```sql
-- 파이프라인 정의
CREATE TABLE pipelines (
  id          TEXT PRIMARY KEY,          -- UUID
  name        TEXT NOT NULL,
  description TEXT,
  codebase    TEXT NOT NULL,             -- 절대 경로
  steps_json  TEXT NOT NULL,             -- JSON string (steps 배열)
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 태스크 세트
CREATE TABLE task_sets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tasks_json  TEXT NOT NULL,             -- JSON string (태스크 배열)
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 실행 이력
CREATE TABLE executions (
  id            TEXT PRIMARY KEY,
  pipeline_id   TEXT,
  task_set_id   TEXT,
  mode          TEXT NOT NULL,           -- 'pipeline' | 'task'
  status        TEXT NOT NULL,           -- 'running' | 'completed' | 'failed' | 'cancelled'
  total_tokens  INTEGER DEFAULT 0,
  total_cost    REAL DEFAULT 0,
  started_at    TEXT DEFAULT (datetime('now')),
  finished_at   TEXT,
  error_message TEXT,
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
  FOREIGN KEY (task_set_id) REFERENCES task_sets(id)
);

-- 스텝 실행 이력
CREATE TABLE execution_steps (
  id            TEXT PRIMARY KEY,
  execution_id  TEXT NOT NULL,
  step_index    INTEGER NOT NULL,
  step_name     TEXT NOT NULL,
  role          TEXT,
  model         TEXT NOT NULL,
  status        TEXT NOT NULL,           -- 'pending' | 'running' | 'completed' | 'failed' | 'retrying'
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost          REAL DEFAULT 0,
  elapsed_sec   REAL DEFAULT 0,
  output_text   TEXT,
  output_path   TEXT,
  error_message TEXT,
  review_score  INTEGER,
  retry_count   INTEGER DEFAULT 0,
  started_at    TEXT,
  finished_at   TEXT,
  FOREIGN KEY (execution_id) REFERENCES executions(id)
);

-- 설정 (key-value)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 6.2 비용 계산 상수

```javascript
const COST_PER_TOKEN = {
  'claude-sonnet-4-6':   { input: 0.003 / 1000, output: 0.015 / 1000 },
  'claude-opus-4-6':     { input: 0.015 / 1000, output: 0.075 / 1000 },
  'gemini-2.5-pro':      { input: 0.00125 / 1000, output: 0.005 / 1000 },
  'gpt-4o':              { input: 0.0025 / 1000, output: 0.01 / 1000 },
  'codex':               { input: 0, output: 0 }, // CLI 구독
  'gemini-cli':          { input: 0, output: 0 }, // CLI 구독
};
```

---

## 7. API 설계

**Base URL**: `http://localhost:3100/api`

### 7.1 파이프라인
```
GET    /pipelines                     목록
POST   /pipelines                     생성 { name, description, codebase, steps }
GET    /pipelines/:id                 상세
PUT    /pipelines/:id                 수정
DELETE /pipelines/:id                 삭제
POST   /pipelines/:id/duplicate       복제
POST   /pipelines/import              JSON 파일 import (multipart)
GET    /pipelines/:id/export          JSON 다운로드
```

### 7.2 태스크
```
GET    /task-sets                     목록
POST   /task-sets                     생성
GET    /task-sets/:id                 상세
PUT    /task-sets/:id                 수정
DELETE /task-sets/:id                 삭제
POST   /task-sets/import              JSON import
```

### 7.3 실행
```
POST   /executions/pipeline/:id       파이프라인 실행 → { executionId }
POST   /executions/task-set/:id       태스크 실행 → { executionId }
POST   /executions/file               JSON 직접 실행 (multipart)
POST   /executions/:id/cancel         취소
GET    /executions                    이력 (?page=1&limit=20&mode=pipeline)
GET    /executions/:id                상세 (steps 포함)
GET    /executions/:id/steps/:idx/output  스텝 출력 내용
```

### 7.4 프로바이더
```
GET    /providers/status              연결 상태
POST   /providers/test/:name          연결 테스트
```

### 7.5 파일시스템
```
GET    /fs/browse?path=...            디렉토리 내용
GET    /fs/read?path=...              파일 읽기
GET    /fs/validate?path=...          경로 존재 확인
```

### 7.6 통계
```
GET    /stats/monthly?year=2026&month=4   월별 집계
GET    /stats/by-model                    모델별 사용량
```

### 7.7 응답 포맷
```typescript
// 성공
{ success: true, data: T }
// 에러
{ success: false, error: { code: string, message: string } }
// 페이지네이션
{ success: true, data: T[], pagination: { page, limit, total } }
```

---

## 8. 실시간 통신 (WebSocket)

### 8.1 Socket.IO 이벤트

**클라이언트 → 서버:**
```
execution:subscribe   { executionId }
execution:unsubscribe { executionId }
execution:cancel      { executionId }
```

**서버 → 클라이언트:**
```
execution:started     { executionId, pipelineName, totalSteps }
step:started          { executionId, stepIndex, stepName, role, model }
step:progress         { executionId, stepIndex, message }
step:token-update     { executionId, stepIndex, tokensUsed }
step:completed        { executionId, stepIndex, tokensUsed, elapsed, outputPreview }
step:failed           { executionId, stepIndex, error }
step:retrying         { executionId, stepIndex, reason, retryCount }
step:verify-result    { executionId, stepIndex, verifyType, success, error }
step:review-score     { executionId, stepIndex, score, pass, willRetry }
execution:completed   { executionId, totalTokens, totalCost, elapsed }
execution:failed      { executionId, error, failedStep }
execution:cancelled   { executionId }
```

### 8.2 엔진 통합

현재 `console.log` 기반 → EventEmitter 패턴으로 전환:

```javascript
// core/engine.js
import { EventEmitter } from 'events';

export class PipelineEngine extends EventEmitter {
  async runPipeline(pipelineConfig) {
    this.emit('execution:started', { ... });
    for (const step of steps) {
      this.emit('step:started', { ... });
      const result = await callAI(step.model, prompt);
      this.emit('step:completed', { ... });
    }
    this.emit('execution:completed', { ... });
  }
}
```

서버에서 Socket.IO 브릿지:
```javascript
// server/ws/execution.js
engine.on('step:completed', (data) => {
  io.to(`execution:${data.executionId}`).emit('step:completed', data);
  db.updateExecutionStep(data); // 동시에 DB 기록
});
```

---

## 9. 파이프라인 빌더 UX 플로우

### 9.1 생성 플로우

```
1. [+ 새 파이프라인] 클릭
   ↓
2. 생성 방식 선택 모달:
   ├─ "템플릿에서 시작" → 템플릿 갤러리 (3종)
   │   ├─ 🏗️ 풀스택 개발 (UX→설계→백엔드→프론트→리뷰) — 5 steps
   │   ├─ 🔧 빠른 수정 + 리뷰 (코드→리뷰) — 2 steps
   │   └─ 📋 기획 전용 (UX→설계→문서화) — 3 steps
   ├─ "빈 캔버스에서 시작"
   └─ "JSON 가져오기" → 파일 선택
   ↓
3. 프로젝트 설정: 이름(필수), 코드베이스 경로(필수), 설명(선택)
   ↓
4. 캔버스 진입 (템플릿 선택 시 노드 미리 배치)
   ↓
5. 스텝 추가 (드래그 or 더블클릭)
   ↓
6. 스텝 설정 (노드 클릭 → 우측 속성 패널)
   ↓
7. 연결 조정 (핸들 드래그, Delete 키로 삭제)
   ↓
8. 유효성 검사 (실시간 + 저장 시)
   - 프롬프트 비어있음, 경로 유효성, 순환 참조, 코드 스텝에 files 필수
   ↓
9. 저장 또는 즉시 실행
```

---

## 10. 에러 처리 및 복구

| 에러 유형 | UI 표현 | 복구 옵션 |
|-----------|---------|-----------|
| API 키 미설정 | 모달 경고 | [설정으로 이동] |
| API 호출 실패 (네트워크) | 스텝 빨간색 + 에러 | [재시도] [다른 모델] [건너뛰기] |
| Rate Limit | 노란색 "60초 후 재시도" 카운트다운 | [즉시 재시도] [모델 변경] |
| TypeCheck/Lint 실패 | "검증 실패" 서브 카드 + 에러 로그 | 자동 재시도 or [수동 재시도] |
| 리뷰 점수 미달 | 게이지 빨간색 | 자동 재실행 or [수동] [무시] |
| 파일 없음 | "파일 없음: path" | [경로 수정] [건너뛰기] |
| 필수 스텝 실패 | 파이프라인 중단 배너 | [실패부터 재시작] [처음부터] |

### 실행 취소
1. 확인 모달: "Step 3을 중단? 완료된 1,2는 유지"
2. AbortController로 현재 AI 호출 abort
3. [완료 스텝 이후부터 재시작] 제공

### 부분 재실행
- 실행 이력에서 [이 스텝부터 재실행] → 새 execution, 이전 outputs 참조

---

## 11. 단계별 개발 로드맵

### Phase 1: 코어 엔진 분리 + 서버 (2주)
- buildkit.js → core/ 모듈 분리 (EventEmitter 기반)
- SQLite DB, Express + Socket.IO 서버
- 파이프라인/태스크/실행 CRUD API
- 프로바이더 상태 API
- **산출물**: `localhost:3100/api` 동작, CLI도 동일 동작

### Phase 2: 프론트엔드 + 실행 모니터 (2주)
- Next.js 초기화, 레이아웃 (사이드바+상단바)
- 대시보드 홈, 실행 모니터 (WebSocket), 이력 목록
- Zustand + Socket.IO 클라이언트
- **산출물**: JSON으로 실행 후 대시보드에서 실시간 모니터링

### Phase 3: 파이프라인 빌더 (2주)
- React Flow 캔버스, 스텝 팔레트, 속성 패널
- JSON 양방향 동기화, 유효성 검사
- 저장/불러오기/내보내기, import, 템플릿 3종
- **산출물**: 드래그 앤 드롭으로 파이프라인 생성

### Phase 4: 태스크 + 비용 분석 (1주)
- 태스크 목록 (인라인 편집), 실행 + 병렬 진행 표시
- 월별 통계 (Recharts), 모델별 비용 분석

### Phase 5: 가이드 + 폴리싱 (1주)
- 가이드 페이지, 온보딩 워크스루
- 파일시스템 브라우저, 다크 모드, 키보드 단축키
- 에러 처리 검수

**총 예상: 8주 (1인)**

---

## 12. 텍스트 와이어프레임

### 12.1 대시보드 홈 (`/`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ◼ BuildKit v0.2.0                    ● 실행중: GLP-Care 투약 3/5       ● ● ●  │
├────────────┬─────────────────────────────────────────────────────────────────────┤
│            │                                                                     │
│  🏠 대시보드│  ┌─ 현재 실행 ──────────────────────────┐  ┌─ 빠른 실행 ─────────┐ │
│            │  │ GLP-Care 투약 기록 기능                │  │                     │ │
│  🔗 파이프  │  │ ████████████░░░░░░░░ 3/5 (60%)       │  │ [파이프라인 선택 ▾]  │ │
│   라인     │  │                                       │  │ [▶ 실행]            │ │
│            │  │ ✅ UX 기획      2,340tk  3.2s         │  │                     │ │
│  ⚡ 빠른   │  │ ✅ 아키텍처     3,120tk  4.1s         │  │ [📁 JSON 파일 열기]  │ │
│   태스크   │  │ 🔄 백엔드 코드  ···      12s          │  └─────────────────────┘ │
│            │  │ ⏳ 프론트 코드                         │                         │
│  📊 실행   │  │ ⏳ 리뷰                               │  ┌─ AI 프로바이더 ────┐  │
│   이력     │  │                                       │  │ Claude   ● SDK     │  │
│            │  │ > Gemini SDK 호출중... 1,200tk 수신    │  │ Gemini   ● CLI     │  │
│  ⚙️ 설정   │  │                                       │  │ OpenAI   ● CLI     │  │
│            │  │ [⏹ 중지]              [상세보기 →]    │  │          [설정 →]   │  │
│  📖 가이드 │  └───────────────────────────────────────┘  └────────────────────┘  │
│            │                                                                     │
│            │  ┌─ 최근 실행 ───────────────────────────┐  ┌─ 이번 달 사용량 ──┐  │
│            │  │ 이름           모드    상태  토큰  비용 │  │                    │  │
│            │  │─────────────────────────────────────── │  │ 총 토큰  124,500   │  │
│            │  │ GLP-Care 투약  pipe   🔄    8.5K  $0.03│  │ 총 비용  $0.42     │  │
│            │  │ 나머지 10건    task   ✅    45K   $0.14│  │ 실행수   12회      │  │
│            │  │ Auth 리팩토링  pipe   ✅    12K   $0.04│  │                    │  │
│            │  │ 탭바 수정      task   ❌    2.1K  $0.01│  │  ╭──────╮          │  │
│            │  │ DB 마이그레이션 pipe   ✅    8.8K  $0.03│  │  │ 도넛  │ Sonnet   │  │
│            │  │                                       │  │  │ 차트  │ Gemini   │  │
│            │  │              1  2  3  [다음 →]        │  │  ╰──────╯ GPT      │  │
│            │  └───────────────────────────────────────┘  └────────────────────┘  │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

### 12.2 파이프라인 목록 (`/pipelines`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ◼ BuildKit v0.2.0                                                    ● ● ●    │
├────────────┬─────────────────────────────────────────────────────────────────────┤
│            │                                                                     │
│  🏠 대시보드│  [+ 새 파이프라인]  [📁 JSON 가져오기]    🔍 검색...    정렬: 최근▾  │
│            │                                                                     │
│  🔗 파이프  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│ ▸ 라인     │  │ GLP-Care        │ │ Auth 리팩토링    │ │ 대시보드 개선    │       │
│            │  │ 투약 기록 기능    │ │ JWT→세션 전환    │ │ 차트 컴포넌트    │       │
│  ⚡ 빠른   │  │                 │ │                 │ │                 │       │
│   태스크   │  │ 5 steps         │ │ 3 steps         │ │ 4 steps         │       │
│            │  │ ◉ Claude ◉ Gem  │ │ ◉ Claude        │ │ ◉ Gem ◉ Claude  │       │
│  📊 실행   │  │                 │ │                 │ │                 │       │
│   이력     │  │ 최근: 5분 전     │ │ 최근: 2일 전     │ │ 최근: 없음       │       │
│            │  │                 │ │                 │ │                 │       │
│  ⚙️ 설정   │  │ [▶][✏️][📋][🗑] │ │ [▶][✏️][📋][🗑] │ │ [▶][✏️][📋][🗑] │       │
│            │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│  📖 가이드 │                                                                     │
│            │  ┌─────────────────┐ ┌─────────────────┐                           │
│            │  │ + 새 파이프라인  │ │                 │                           │
│            │  │                 │ │   빈 슬롯       │                           │
│            │  │  여기를 클릭     │ │                 │                           │
│            │  └─────────────────┘ └─────────────────┘                           │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

### 12.3 파이프라인 빌더 (`/pipelines/new`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ◼ BuildKit v0.2.0                                                    ● ● ●    │
├────────────┬──────────┬──────────────────────────────────┬───────────────────────┤
│            │ 스텝 팔레트│         캔버스 (React Flow)       │     속성 패널         │
│  🏠 대시보드│          │                                  │                       │
│            │ ┌──────┐ │   ┌──────────────┐               │ Step 2: 아키텍처      │
│  🔗 파이프  │ │📋 UX │ │   │ 📦 시작       │               │ ────────────────────  │
│ ▸ 라인     │ │ 기획  │ │   │ GLP-Care     │               │                       │
│            │ └──────┘ │   │ /Users/bug.. │               │ 이름: [아키텍처     ]  │
│  ⚡ 빠른   │ ┌──────┐ │   └──────┬───────┘               │ 역할: [Blueprint   ▾]  │
│   태스크   │ │🏗️ 아키│ │          │                       │                       │
│            │ │ 텍처  │ │          ▼                       │ ── AI 모델 ──         │
│  📊 실행   │ └──────┘ │   ┌──────────────┐               │ ◉ Sonnet  $0.003/1K  │
│   이력     │ ┌──────┐ │   │ 📋 UX 기획    │               │ ○ Opus    $0.015/1K  │
│            │ │💻 코드│ │   │ CPO  sonnet  │               │ ○ Gemini  $0.001/1K  │
│  ⚙️ 설정   │ │ 생성  │ │   └──────┬───────┘               │ ○ GPT-4o  $0.003/1K  │
│            │ └──────┘ │          │                       │ maxTokens: [4096  ]   │
│  📖 가이드 │ ┌──────┐ │          ▼                       │                       │
│            │ │🔍 리뷰│ │   ┌──────────────┐ ← 선택됨     │ ── 프롬프트 ──        │
│            │ └──────┘ │   │ 🏗️ 아키텍처   │ (파란 테두리)  │ ┌───────────────────┐ │
│            │ ┌──────┐ │   │ Blueprint son │               │ │이 UX 명세를 기반   │ │
│            │ │🛡️ 보안│ │   └──────┬───────┘               │ │으로 투약 기록 API  │ │
│            │ └──────┘ │          │                       │ │/DB 설계해. Prisma  │ │
│            │ ┌──────┐ │          ▼                       │ │모델, Fastify 라우  │ │
│            │ │🧪 테스│ │   ┌──────────────┐               │ │트, 요청/응답 스키  │ │
│            │ │ 트    │ │   │ 💻 백엔드 코드│               │ │마. 간결하게.       │ │
│            │ └──────┘ │   │ Dev  gemini  │               │ └───────────────────┘ │
│            │ ┌──────┐ │   └──────┬───────┘               │ 284자 / ~71 tokens    │
│            │ │📝 커스│ │          │                       │                       │
│            │ │ 텀    │ │          ▼                       │ ── 입력 ──            │
│            │ └──────┘ │   ┌──────────────┐               │ ☑ 이전 스텝 출력      │
│            │          │   │ 💻 프론트 코드│               │   [UX 기획        ▾]  │
│            │          │   │ Dev  gemini  │               │ ☐ 파일                │
│            │          │   └──────┬───────┘               │ ☐ Git Diff            │
│            │          │          │                       │                       │
│            │          │          ▼                       │ ── 출력 ──            │
│            │          │   ┌──────────────┐               │ ◉ 문서 저장            │
│            │          │   │ 🔍 리뷰      │               │   [specs/arch.md   ]  │
│            │          │   │ Rev  sonnet  │               │ ○ 코드로 적용          │
│            │          │   └──────┬───────┘               │ ○ 없음                │
│            │          │          │                       │                       │
│            │          │          ▼                       │ ── 필수 ──            │
│            │          │   ┌──────────────┐               │ [████████░░] ON       │
│            │          │   │ 🏁 끝        │               │                       │
│            │          │   │ ☑ git commit │               │                       │
│            │          │   └──────────────┘               │                       │
│            │          │                                  │                       │
├────────────┴──────────┴──────────────────────────────────┴───────────────────────┤
│ [💾 저장]  [📤 JSON 내보내기]  [{ } JSON 보기/편집]                    [▶ 실행]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 12.4 파이프라인 빌더 — JSON 편집 모드 (토글 시)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
├────────────┬──────────┬──────────────────────────────────┬───────────────────────┤
│            │ 스텝 팔레트│         JSON 에디터               │     속성 패널         │
│            │          │                                  │                       │
│            │ (비활성,  │  1 │ {                            │  (비활성)             │
│            │  흐리게)  │  2 │   "project": "GLP-Care",    │                       │
│            │          │  3 │   "codebase": "/Users/..",   │                       │
│            │          │  4 │   "steps": [                 │                       │
│            │          │  5 │     {                        │                       │
│            │          │  6 │       "step": "ux",          │                       │
│            │          │  7 │       "role": "CPO",         │                       │
│            │          │  8 │       "model": "sonnet",     │                       │
│            │          │  9 │       "prompt": "GLP-1...",  │                       │
│            │          │ 10 │       "output": "specs/.."   │                       │
│            │          │ 11 │     },                       │                       │
│            │          │ 12 │     ...                      │                       │
│            │          │ 13 │   ]                          │                       │
│            │          │ 14 │ }                            │                       │
│            │          │    │                              │                       │
│            │          │    │ ✅ 유효한 JSON               │                       │
├────────────┴──────────┴──────────────────────────────────┴───────────────────────┤
│ [💾 저장]  [📤 JSON 내보내기]  [{ } 캔버스로 돌아가기]                  [▶ 실행]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 12.5 실행 모니터 (`/history/[id]`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ◼ BuildKit v0.2.0                                                    ● ● ●    │
├────────────┬─────────────────────────────────────────────────────────────────────┤
│            │                                                                     │
│  🏠 대시보드│  GLP-Care 투약 기록 기능                                             │
│            │  시작: 14:32:05  경과: 00:01:42  🔄 실행중    ████████░░░░ 3/5      │
│  🔗 파이프  │  토큰: 8,580  비용: $0.028                          [⏹ 중지]       │
│   라인     │  ─────────────────────────────────────────────────────────────       │
│            │                                                                     │
│  ⚡ 빠른   │  ◉──── Step 1: UX 기획 ─────────────── ✅ 완료  2,340tk  3.2s ───  │
│   태스크   │  │     CPO · Claude Sonnet                                          │
│            │  │     입력: PRD.md                                                  │
│  📊 실행   │  │     출력: specs/injection-ux.md                        [📄 열기]  │
│ ▸ 이력     │  │     ┌─ 미리보기 ──────────────────────────────────────┐ [접기 ▴]  │
│            │  │     │ # 투약 기록 화면 UX 명세                        │           │
│  ⚙️ 설정   │  │     │ ## 화면 구성                                    │           │
│            │  │     │ - 날짜/시간 선택 (DateTimePicker)               │           │
│  📖 가이드 │  │     │ - 약 선택: 위고비 / 마운자로 / 삭센다 (Radio)    │           │
│            │  │     │ - 용량: 슬라이더 (0.25mg ~ 2.5mg)              │           │
│            │  │     │ ...                                            │           │
│            │  │     └────────────────────────────────────────────────┘           │
│            │  │                                                                  │
│            │  ◉──── Step 2: 아키텍처 ─────────────── ✅ 완료  3,120tk  4.1s ───  │
│            │  │     Blueprint · Claude Sonnet                                    │
│            │  │     입력: specs/injection-ux.md                                   │
│            │  │     출력: specs/injection-arch.md                      [📄 열기]  │
│            │  │     [미리보기 펼치기 ▾]                                            │
│            │  │                                                                  │
│            │  ●──── Step 3: 백엔드 코드 ──────────── 🔄 실행중... 23s ──────────  │
│            │  │     Developer · Gemini                                            │
│            │  │     입력: specs/injection-arch.md                                 │
│            │  │     대상: prisma/schema.prisma, src/routes/injection.ts           │
│            │  │     검증: typecheck                                               │
│            │  │     ┌─ 실시간 로그 ──────────────────────────────────┐            │
│            │  │     │ 📡 Gemini SDK 호출중...                        │            │
│            │  │     │ 응답 수신: 1,847 tokens...                     │            │
│            │  │     │ ▊                                              │ auto-scroll│
│            │  │     └────────────────────────────────────────────────┘            │
│            │  │                                                                  │
│            │  ○──── Step 4: 프론트엔드 코드 ────────── ⏳ 대기 ─────────────────  │
│            │  │     Developer · Gemini                                            │
│            │  │                                                                  │
│            │  ○──── Step 5: 리뷰 ─────────────────── ⏳ 대기 ─────────────────── │
│            │        Reviewer · Claude Sonnet · 통과: 7점 이상                     │
│            │                                                                     │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

### 12.6 실행 완료 — 하단 비용 분석

```
│            │                                                                     │
│            │  ── 비용 분석 ─────────────────────────────────────────────────────  │
│            │  ┌────────────┬──────────┬──────────┬──────────┬────────┬────────┐  │
│            │  │ 스텝       │ 모델     │ In 토큰  │ Out 토큰 │ 비용   │ 시간   │  │
│            │  ├────────────┼──────────┼──────────┼──────────┼────────┼────────┤  │
│            │  │ UX 기획    │ Sonnet   │ 1,200    │ 1,140    │ $0.021 │ 3.2s   │  │
│            │  │ 아키텍처   │ Sonnet   │ 1,800    │ 1,320    │ $0.025 │ 4.1s   │  │
│            │  │ 백엔드 코드│ Gemini   │ 2,100    │ 1,850    │ $0.012 │ 8.3s   │  │
│            │  │  └ 재시도  │ Gemini   │ 2,500    │ 2,100    │ $0.014 │ 9.1s   │  │
│            │  │ 프론트 코드│ Gemini   │ 2,400    │ 1,900    │ $0.013 │ 7.8s   │  │
│            │  │ 리뷰       │ Sonnet   │ 3,200    │ 890      │ $0.023 │ 5.2s   │  │
│            │  ├────────────┼──────────┼──────────┼──────────┼────────┼────────┤  │
│            │  │ 합계       │          │ 13,200   │ 9,200    │ $0.108 │ 37.7s  │  │
│            │  └────────────┴──────────┴──────────┴──────────┴────────┴────────┘  │
│            │                                                                     │
│            │  [🔄 재실행]  [📤 결과 내보내기]                                      │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

### 12.7 실행 모니터 — 리뷰 스텝 결과 (점수 미달 시)

```
│            │                                                                     │
│            │  ◉──── Step 5: 리뷰 ─────────────────── ⚠️ 점수 미달 ────────────  │
│            │  │     Reviewer · Claude Sonnet                                     │
│            │  │                                                                  │
│            │  │     ┌─ 리뷰 점수 ───────┐                                        │
│            │  │     │                   │                                        │
│            │  │     │    ╭───────╮      │                                        │
│            │  │     │    │ 5/10  │      │  ❌ 통과 기준 7점 미달                  │
│            │  │     │    ╰───────╯      │                                        │
│            │  │     │   (빨간색 원형)    │  → Step 3(백엔드 코드) 자동 재실행     │
│            │  │     └───────────────────┘                                        │
│            │  │                                                                  │
│            │  │     피드백:                                                       │
│            │  │     - SQL injection 취약점 (injection.ts:45)                      │
│            │  │     - 에러 핸들링 누락 (schema.prisma validation)                 │
│            │  │     - UX 명세의 메모 필드 미구현                                   │
│            │  │                                                                  │
│            │  │     🔄 코드 재생성 시작... (Step 3 → 4 → 5 재실행)               │
│            │                                                                     │
```

### 12.8 빠른 태스크 (`/tasks`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ◼ BuildKit v0.2.0                                                    ● ● ●    │
├────────────┬─────────────────────────────────────────────────────────────────────┤
│            │                                                                     │
│  🏠 대시보드│  [📁 JSON 가져오기]  [+ 태스크 추가]                [▶ 선택 실행]     │
│            │                                                                     │
│  🔗 파이프  │  ┌──┬─────────────────────┬──────────────────────┬───────┬────┬───┐ │
│   라인     │  │☑ │ 파일                │ 수정 내용            │ 모델  │줄  │상태│ │
│            │  ├──┼─────────────────────┼──────────────────────┼───────┼────┼───┤ │
│  ⚡ 빠른   │  │☑ │ src/lib/daily-      │ proteinAchievement   │gemini │ 55 │ ✅│ │
│ ▸ 태스크   │  │  │ summary.ts          │ Rate 0~1 범위로 변경  │       │    │   │ │
│            │  ├──┼─────────────────────┼──────────────────────┼───────┼────┼───┤ │
│  📊 실행   │  │☑ │ mobile/src/types/   │ WeeklyReport 필드명   │gemini │    │ 🔄│ │
│   이력     │  │  │ report.ts           │ 백엔드 응답 일치      │       │    │   │ │
│            │  ├──┼─────────────────────┼──────────────────────┼───────┼────┼───┤ │
│  ⚙️ 설정   │  │☑ │ mobile/src/lib/     │ 401 refresh token    │gemini │    │ ⏳│ │
│            │  │  │ api.ts              │ 인터셉터 추가         │       │    │   │ │
│  📖 가이드 │  ├──┼─────────────────────┼──────────────────────┼───────┼────┼───┤ │
│            │  │☐ │ src/lib/quota.ts    │ getDailyLimitByUser  │gemini │    │ ⏳│ │
│            │  │  │                     │ 프리미엄 만료 체크    │       │    │   │ │
│            │  ├──┼─────────────────────┼──────────────────────┼───────┼────┼───┤ │
│            │  │☑ │ src/routes/meal.ts  │ 서버사이드 유효성     │gemini │    │ ❌│ │
│            │  │  │                     │ 검사 추가            │       │    │   │ │
│            │  ├──┼─────────────────────┼──────────────────────┼───────┼────┼───┤ │
│            │  │  │ ...                 │ ...                  │       │    │   │ │
│            │  └──┴─────────────────────┴──────────────────────┴───────┴────┴───┘ │
│            │                                                                     │
│            │  총 10건 | ✅ 3 완료  🔄 2 실행중  ⏳ 4 대기  ❌ 1 실패             │
│            │  토큰: 23,400 | 비용: $0.07 | 경과: 00:00:34                        │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

### 12.9 설정 — AI 프로바이더 (`/settings/providers`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
├────────────┬─────────────────────────────────────────────────────────────────────┤
│            │                                                                     │
│            │  [프로바이더]  [기본값]  [API 키]                                     │
│            │  ─────────────────────────────────────────────────────────────       │
│            │                                                                     │
│            │  ┌─ Claude (Anthropic) ─────────────────────────── ● 연결됨 ──┐     │
│            │  │                                                            │     │
│            │  │  연결 방식:  SDK (API Key)                                  │     │
│            │  │  API Key:   [sk-ant-api03-••••••••••••••••]  [👁]          │     │
│            │  │  사용 가능:  claude-sonnet-4-6, claude-opus-4-6   │     │
│            │  │                                                            │     │
│            │  │  [🔌 연결 테스트]  ✅ 응답 확인 (1.2s)                      │     │
│            │  └────────────────────────────────────────────────────────────┘     │
│            │                                                                     │
│            │  ┌─ Gemini (Google) ────────────────────────────── ● CLI ────┐      │
│            │  │                                                           │      │
│            │  │  연결 방식:  ○ SDK (API Key)  ◉ CLI (Ultra 구독)          │      │
│            │  │  CLI 경로:  [/tmp/node-v22.14.0-darwin-arm64/bin/gemini]  │      │
│            │  │  사용 가능:  gemini-2.5-pro (CLI 경유)                     │      │
│            │  │                                                           │      │
│            │  │  [🔌 연결 테스트]  ✅ CLI 응답 확인                         │      │
│            │  └───────────────────────────────────────────────────────────┘      │
│            │                                                                     │
│            │  ┌─ OpenAI ─────────────────────────────────────── ● CLI ────┐      │
│            │  │                                                           │      │
│            │  │  연결 방식:  ○ SDK (API Key)  ◉ Codex CLI                 │      │
│            │  │  CLI 경로:  [/tmp/node-v22.14.0-darwin-arm64/bin/codex ]  │      │
│            │  │  사용 가능:  codex (CLI exec 모드)                         │      │
│            │  │                                                           │      │
│            │  │  [🔌 연결 테스트]  ✅ CLI 응답 확인                         │      │
│            │  └───────────────────────────────────────────────────────────┘      │
│            │                                                                     │
│            │                                                     [💾 저장]       │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

### 12.10 새 파이프라인 — 생성 방식 선택 모달

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│           새 파이프라인 만들기                         │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  📦 템플릿에서 시작                              │  │
│  │                                                │  │
│  │  🏗️ 풀스택 개발              5 steps            │  │
│  │  UX → 설계 → 백엔드 → 프론트 → 리뷰             │  │
│  │                                                │  │
│  │  🔧 빠른 수정 + 리뷰          2 steps            │  │
│  │  코드 생성 → 리뷰                                │  │
│  │                                                │  │
│  │  📋 기획 전용                 3 steps            │  │
│  │  UX → 설계 → 문서화                              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  📄 빈 캔버스에서 시작                           │  │
│  │  스텝을 직접 드래그해서 구성                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  📁 JSON 가져오기                               │  │
│  │  기존 pipeline.json 파일 불러오기                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│                                        [취소]        │
└──────────────────────────────────────────────────────┘
```

---

## 13. API 요청/응답 예시

### 13.1 파이프라인 생성

**POST** `/api/pipelines`
```json
// Request
{
  "name": "GLP-Care 투약 기록 기능",
  "description": "투약 기록 화면 + API 개발",
  "codebase": "/Users/bugbookee/.paperclip/instances/default/projects/.../default",
  "steps": [
    {
      "step": "ux",
      "role": "CPO",
      "model": "sonnet",
      "prompt": "GLP-1 다이어트 앱의 투약 기록 화면 UX 명세를 작성해...",
      "input": "PRD.md",
      "output": "specs/injection-ux.md"
    },
    {
      "step": "architecture",
      "role": "Blueprint",
      "model": "sonnet",
      "prompt": "이 UX 명세를 기반으로 투약 기록 API/DB 설계해...",
      "input": ["specs/injection-ux.md"],
      "output": "specs/injection-arch.md"
    },
    {
      "step": "code-backend",
      "role": "Developer",
      "model": "gemini",
      "prompt": "아래 설계대로 Fastify + Prisma 백엔드 코드를 작성해...",
      "input": ["specs/injection-arch.md"],
      "files": ["prisma/schema.prisma", "src/routes/injection.ts"],
      "output": "code",
      "verify": "typecheck"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "GLP-Care 투약 기록 기능",
    "description": "투약 기록 화면 + API 개발",
    "codebase": "/Users/bugbookee/.paperclip/instances/.../default",
    "steps": [ ... ],
    "created_at": "2026-04-05T14:30:00Z",
    "updated_at": "2026-04-05T14:30:00Z"
  }
}
```

### 13.2 파이프라인 실행

**POST** `/api/executions/pipeline/a1b2c3d4-...`
```json
// Response
{
  "success": true,
  "data": {
    "executionId": "exec-5678-abcd",
    "status": "running",
    "started_at": "2026-04-05T14:32:05Z"
  }
}
```

### 13.3 실행 상세 조회

**GET** `/api/executions/exec-5678-abcd`
```json
{
  "success": true,
  "data": {
    "id": "exec-5678-abcd",
    "pipeline_id": "a1b2c3d4-...",
    "mode": "pipeline",
    "status": "completed",
    "total_tokens": 22400,
    "total_cost": 0.108,
    "started_at": "2026-04-05T14:32:05Z",
    "finished_at": "2026-04-05T14:32:43Z",
    "steps": [
      {
        "step_index": 0,
        "step_name": "ux",
        "role": "CPO",
        "model": "claude-sonnet-4-6",
        "status": "completed",
        "input_tokens": 1200,
        "output_tokens": 1140,
        "cost": 0.021,
        "elapsed_sec": 3.2,
        "output_path": "specs/injection-ux.md",
        "review_score": null,
        "retry_count": 0
      },
      {
        "step_index": 1,
        "step_name": "architecture",
        "status": "completed",
        "..."
      }
    ]
  }
}
```

### 13.4 프로바이더 상태

**GET** `/api/providers/status`
```json
{
  "success": true,
  "data": {
    "claude": {
      "available": true,
      "mode": "sdk",
      "models": ["claude-sonnet-4-6", "claude-opus-4-6"]
    },
    "gemini": {
      "available": true,
      "mode": "cli",
      "cli_path": "/tmp/node-v22.14.0-darwin-arm64/bin/gemini",
      "models": ["gemini-2.5-pro"]
    },
    "openai": {
      "available": true,
      "mode": "cli",
      "cli_path": "/tmp/node-v22.14.0-darwin-arm64/bin/codex",
      "models": ["codex"]
    }
  }
}
```

### 13.5 월별 통계

**GET** `/api/stats/monthly?year=2026&month=4`
```json
{
  "success": true,
  "data": {
    "total_tokens": 124500,
    "total_cost": 0.42,
    "execution_count": 12,
    "by_model": [
      { "model": "claude-sonnet-4-6", "tokens": 45000, "cost": 0.28 },
      { "model": "gemini-2.5-pro", "tokens": 65000, "cost": 0.12 },
      { "model": "codex", "tokens": 14500, "cost": 0.02 }
    ]
  }
}
```
