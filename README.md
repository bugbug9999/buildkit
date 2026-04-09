# BuildKit

AI 에이전트 파이프라인 오케스트레이터. Claude, Codex, Gemini를 조합해서 설계-개발-리뷰를 자동화한다.

**구독 CLI 기반 $0 실행** — API 키 없이 Claude Code, OpenAI Codex, Gemini CLI 구독만으로 동작.

## 빠른 시작

### 1. 클론 & 설치

```bash
git clone https://github.com/bugbug9999/buildkit.git
cd buildkit
npm install
cd dashboard && npm install && cd ..
```

### 2. CLI 설치 확인

BuildKit은 각 AI의 CLI 도구를 사용한다. 아래 3개 중 최소 1개는 있어야 함.

```bash
# Claude Code CLI (Anthropic 구독)
claude --version

# OpenAI Codex CLI (OpenAI 구독)
codex --version

# Gemini CLI (Google AI Ultra 구독)
gemini --version
```

설치 안 돼있으면:
```bash
npm install -g @anthropic-ai/claude-code   # Claude
npm install -g @openai/codex                # Codex
npm install -g @anthropic-ai/claude-code    # Gemini는 별도 설치
```

### 3. CLI 경로 설정

`core/providers.js` 에서 본인 환경에 맞게 CLI 경로 수정:

```js
const DEFAULT_CLAUDE_CLI = '/path/to/claude';   // which claude
const DEFAULT_CODEX_CLI = '/path/to/codex';     // which codex
const DEFAULT_GEMINI_CLI = '/path/to/gemini';   // which gemini
```

### 4. 실행

```bash
# 파이프라인 실행 (설계 → 개발 → 리뷰 체이닝)
node buildkit.js run pipeline.json

# 빠른 태스크 (병렬 실행)
node buildkit.js task tasks.json

# 상태 확인
node buildkit.js status
```

## 대시보드

웹 UI로 파이프라인 실행/모니터링 가능.

```bash
# 서버 + 대시보드 동시 시작
npm run dev

# 또는 각각 실행
PORT=3160 node server/index.js          # 백엔드 (기본 3160)
cd dashboard && npx next dev -p 3150    # 프론트 (기본 3150)
```

브라우저에서 `http://localhost:3150` 접속.

CLI로 실행한 파이프라인도 대시보드에 실시간 반영됨.

## pipeline.json 작성법

```json
{
  "project": "프로젝트명",
  "codebase": "/absolute/path/to/project",
  "steps": [
    {
      "step": "design",
      "role": "CTO",
      "model": "opus",
      "prompt": "설계 지시...",
      "output": "docs/design.md"
    },
    {
      "step": "implement",
      "role": "Developer",
      "model": "codex",
      "prompt": "개발 지시...",
      "input": ["design"],
      "files": ["src/app.ts"],
      "output": "code",
      "verify": "tsc --noEmit"
    },
    {
      "step": "review",
      "role": "Reviewer",
      "model": "sonnet",
      "prompt": "리뷰 지시...",
      "input": ["implement"],
      "output": "docs/review.md",
      "pass": 7
    }
  ]
}
```

### 필드 설명

| 필드 | 설명 |
|------|------|
| `model` | `opus` (설계/기획), `codex` (코드 생성), `sonnet` (리뷰/테스트) |
| `preset` | 프리셋 이름 또는 배열. 스택/규칙/컨텍스트를 프롬프트 앞에 자동 주입 |
| `input` | 이전 스텝 이름 배열. 해당 스텝의 출력을 컨텍스트로 받음 |
| `files` | 수정할 파일 경로. `output: "code"` 일 때 자동 적용 |
| `output` | `"code"` = files에 적용, `"파일경로"` = 텍스트 저장 |
| `verify` | 코드 적용 후 검증 명령. 실패 시 1회 재시도 |
| `pass` | 리뷰 점수 기준 (N/10). 미달 시 code 스텝 재실행 |

## 프리셋 시스템

`presets/` 디렉토리의 YAML 파일로 역할별 규칙/컨텍스트를 재사용.

### 사용법

```json
{
  "step": "code-gen",
  "model": "codex",
  "preset": "frontend-rn",
  "prompt": "실제 작업 지시..."
}
```

복수 프리셋 합성:
```json
"preset": ["frontend-rn", "reviewer"]
```

### 기본 제공 프리셋

| 파일 | 설명 |
|------|------|
| `frontend-rn.yaml` | React Native + Expo Router (GLP-Care mobile) |
| `backend-fastify.yaml` | Fastify 5 + Prisma + PostgreSQL (GLP-Care server) |
| `reviewer.yaml` | 코드 리뷰어 — 버그/보안/성능 체크 |
| `ux-designer.yaml` | UX 설계자 — 사용자 여정 + 접근성 |

### 커스텀 프리셋 만들기

`presets/my-preset.yaml` 파일 생성:

```yaml
name: my-preset
description: 설명
stack:
  - Node.js 22
rules:
  must:
    - TypeScript strict
  forbidden:
    - any 타입 금지
context: |
  추가 컨텍스트 (자유 형식)
```

## 모델 배치

| 역할 | model 값 | 실제 실행 |
|------|---------|----------|
| CPO/UX 기획 | `opus` | Claude CLI (Opus) |
| CTO/설계 | `opus` | Claude CLI (Opus) |
| 개발 | `codex` | Codex CLI (GPT) |
| 리뷰/테스트 | `sonnet` | Claude CLI (Sonnet) |

작업 규모에 따라 스텝 조절:
- **소규모** (1~2파일): `codex → sonnet` (2스텝)
- **중규모** (3~5파일): `opus → codex → sonnet` (3스텝)
- **대규모** (5파일+): `opus(기획) → opus(설계) → codex → sonnet` (풀 파이프라인)

## tasks.json (빠른 태스크)

여러 작업을 병렬로 실행:

```json
[
  {
    "file": "src/utils.ts",
    "do": "함수명을 camelCase로 변경",
    "model": "codex"
  },
  {
    "file": "src/api.ts",
    "do": "에러 핸들링 추가",
    "model": "codex"
  }
]
```

```bash
node buildkit.js task tasks.json
```

## 핵심 규칙

1. **API 키 넣지 않기** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` 환경변수 비워둘 것. CLI 구독으로 $0 실행.
2. **codex로만 코드 생성** — sonnet은 리뷰/테스트 전용. 코드 생성에 sonnet 사용 금지.
3. **RULES.md 참조** — AI 에이전트가 BuildKit을 실행할 때의 상세 규칙.

## 프로젝트 구조

```
buildkit/
├── buildkit.js              # CLI 메인 (파이프라인/태스크 실행)
├── core/
│   ├── engine.js            # PipelineEngine, TaskEngine
│   └── providers.js         # AI 모델 라우팅 (Claude/Codex/Gemini)
├── server/
│   ├── index.js             # Express + Socket.IO 백엔드
│   ├── db/
│   │   ├── db.js            # SQLite API
│   │   ├── schema.sql       # DB 스키마
│   │   └── buildkit.sqlite  # 실행 이력 DB
│   ├── routes/              # REST API 라우트
│   └── ws/                  # WebSocket 핸들러
├── dashboard/               # Next.js 14 웹 대시보드
│   ├── app/                 # 페이지 (대시보드/파이프라인/이력/설정)
│   ├── components/          # UI 컴포넌트
│   └── lib/                 # store, API, types
├── RULES.md                 # AI 에이전트용 실행 규칙
├── SPEC.md                  # 제품 사양서
└── examples/                # 파이프라인 예제
```

## 대시보드 기능

- **홈**: 현재 실행 상태, 빠른 실행, AI 프로바이더 연결 상태
- **파이프라인**: 저장된 파이프라인 관리 (실행/편집/복제/삭제)
- **빠른 태스크**: 인라인 태스크 편집 & 실행
- **실행 이력**: 전체 실행 로그, 스텝별 토큰/비용/시간
- **설정**: CLI 경로, API 키 관리
- **가이드**: 사용법 문서

## 라이선스

Private. 팀 내부 사용 전용.
