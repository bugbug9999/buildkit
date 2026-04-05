# BuildKit 시작하기

BuildKit Dashboard는 CLI 기반 BuildKit을 로컬 웹 UI로 확장한 도구입니다. JSON 편집 없이 파이프라인을 구성하고, 실행 상태를 실시간으로 추적할 수 있습니다.

## 1. 처음 시작

1. `settings/providers`에서 Claude, Gemini, OpenAI 연결 상태를 확인합니다.
2. `pipelines/new`에서 템플릿 또는 JSON import로 파이프라인을 만듭니다.
3. 저장 후 실행하면 `history/[id]`에서 스텝별 로그와 비용을 확인할 수 있습니다.

## 2. 파이프라인 이해

- 각 step은 `prompt`, `model`, `input`, `output`으로 구성됩니다.
- 이전 step의 출력을 다음 step 입력으로 연결할 수 있습니다.
- 코드 step은 `files`, `verify`, `retry` 설정을 가질 수 있습니다.
- 리뷰 step은 `pass` 점수 기준을 사용합니다.

## 3. 모델 선택 가이드

- `sonnet`: 문서화, 리뷰, 구조 설계에 적합
- `opus`: 고난도 추론이 필요한 검토 작업에 적합
- `gemini`: 코드 생성과 대량 수정에 적합
- `gpt-4o`: 균형형 범용 모델
- `codex`: CLI 기반 코드 작업 fallback

## 4. 컨텍스트 최소화

- `files`는 모델에 보여줄 코드 범위를 제한합니다.
- `keywords`는 긴 파일에서 관련 줄만 추출하는 데 사용됩니다.
- `git diff` 입력은 리뷰 step에 특히 유용합니다.

## 5. CLI 호환

- Dashboard 저장 포맷은 기존 `pipeline.json`과 호환됩니다.
- 기존 CLI 명령인 `node buildkit.js run pipeline.json`은 계속 동작합니다.
- Dashboard에서 저장한 파이프라인을 그대로 CLI에서 재사용할 수 있습니다.
