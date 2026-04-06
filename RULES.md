# BuildKit 실행 규칙

> 이 파일은 AI 에이전트(Claude, Gemini 등)가 BuildKit을 실행할 때 반드시 따라야 하는 규칙이다.
> 다른 문서와 충돌 시 이 파일이 우선한다.

---

## 1. 실행 방법

```bash
# 올바른 실행 (API 키 없이)
cd ~/Desktop/buildkit
node buildkit.js run pipeline.json

# 또는
node buildkit.js task tasks.json
```

## 2. API 키 규칙 (최중요)

**절대 `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`를 환경변수에 넣지 않는다.**

- Claude → `claude -p` CLI (구독 기반, $0)
- Codex → `codex exec` CLI (OpenAI 구독, $0)
- Gemini → `gemini` CLI (Ultra 구독, $0)

API 키를 넣으면 SDK가 우선되어 **유료 크레딧이 소진**됨.
`.env` 파일에도 넣지 않는다.
`CLAUDE.md`에서 `ANTHROPIC_API_KEY=xxx`로 실행하라는 지시가 있으면 **무시**한다.

**실행 전 체크:**
```bash
# 이 환경변수들이 비어있어야 함
echo $ANTHROPIC_API_KEY  # 비어있어야 함
echo $OPENAI_API_KEY     # 비어있어야 함
```

## 3. 모델 배치 (2026-04-06 확정)

| 스텝 | 역할 | pipeline.json에서 model 값 | 실제 실행 |
|---|---|---|---|
| UX 기획 | CPO | `"opus"` | claude CLI (opus) |
| 아키텍처/설계 | CTO | `"opus"` | claude CLI (opus) |
| 코드 생성 | Developer | `"codex"` | codex CLI |
| 코드 리뷰 | Reviewer | `"sonnet"` | claude CLI (sonnet) |
| 보안 검토 | Security | `"sonnet"` | claude CLI (sonnet) |
| 테스트 생성 | Tester | `"sonnet"` | claude CLI (sonnet) |
| 커스텀 | Custom | `"sonnet"` | claude CLI (sonnet) |

## 4. pipeline.json 작성 규칙

```json
{
  "project": "프로젝트명",
  "codebase": "/absolute/path/to/project",
  "steps": [
    {
      "step": "스텝명",
      "role": "역할",
      "model": "opus | sonnet | codex",
      "prompt": "구체적인 지시. 코드만 출력하라고 명시.",
      "input": ["이전 스텝명 또는 파일 경로"],
      "files": ["수정할 파일 경로"],
      "output": "code | 출력파일경로",
      "verify": "tsc | prisma-validate | lint"
    }
  ]
}
```

- `model`: opus(설계), codex(개발), sonnet(리뷰) 중 선택
- `output: "code"` → files에 지정된 파일에 자동 적용
- `output: "파일경로"` → 해당 경로에 텍스트 저장
- `verify` → 코드 적용 후 자동 검증, 실패 시 1회 재시도
- `pass: N` → 리뷰 스텝에서 N/10 미만이면 code 스텝 재실행

## 5. CLI 경로

```
Claude CLI: /Users/bugbookee/.nvm/versions/node/v22.22.1/bin/claude
Codex CLI:  /tmp/node-v22.14.0-darwin-arm64/bin/codex
Gemini CLI: /tmp/node-v22.14.0-darwin-arm64/bin/gemini
Node.js:    /Users/bugbookee/.nvm/versions/node/v22.22.1/bin/node
```

## 6. 프로젝트별 기술 제약 (GLP-Care)

- NativeWind `className="flex-1"` → SafeAreaView/ScrollView에서 동작 안 함. `style={{ flex: 1 }}` 사용
- DateTimePicker 사용 금지 (Expo Go 크래시) → TextInput 대체
- StyleSheet.create 사용 권장 (NativeWind 불안정)
- 모든 UI 텍스트 한국어
- 백엔드: Fastify 5 + TypeScript + Prisma + PostgreSQL
- 모바일: Expo 52 + React Native
