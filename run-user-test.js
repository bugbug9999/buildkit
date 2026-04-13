#!/usr/bin/env node
// GLP-Care 사용자 테스트 실행기
// injection.tsx + 기획서 내용을 프롬프트에 직접 포함 (파일 경로 참조 X)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INJECTION_PATH = '/Users/bugbookee/.paperclip/instances/default/projects/c130b9f3-5855-47c1-a128-b16f07ebdc69/12805932-2b62-4dff-93e9-39732f9e3926/_default/mobile/app/(tabs)/injection.tsx';
const SPEC_PATH = '/Users/bugbookee/Desktop/glpcare-medication-ux-spec.md';
const OUTPUT_DIR = path.join(__dirname, 'output');

const injectionCode = fs.readFileSync(INJECTION_PATH, 'utf-8');
const specContent = fs.readFileSync(SPEC_PATH, 'utf-8');

const SHARED_CONTEXT = `## 테스트 대상 코드 (injection.tsx)
\`\`\`tsx
${injectionCode}
\`\`\`

## 기획서 (GLP-Care 투약 관리 UX Spec v1.1)
${specContent}`;

const PERSONA_A_PROMPT = `너는 GLP-Care 투약 관리 앱의 사용자 테스트를 수행하는 UX 리서처다.

## 페르소나 A
- 30대 직장인
- 주 1회 위고비 0.5mg 피하주사 (금요일)
- 매일 아침 드시모네(유산균) 1정
- 하루 2회(아침 8시 / 저녁 22시) 항우울제 복용
- 스마트폰 앱은 자주 쓰지만 UI가 복잡하면 바로 이탈함
- 병원 다음 날 약 빼먹는 경우 잦음

${SHARED_CONTEXT}

## 시나리오 (순서대로 시뮬레이션)
1. **첫 진입**: 앱 투약 탭 처음 열기 → 빈 화면에서 무엇을 해야 할지 파악
2. **약 등록**: 위고비(주 1회 금요일, 주사) + 드시모네(매일 아침) + 항우울제(매일 아침/저녁) 3가지 등록
3. **오늘 복약 체크**: 아침에 드시모네, 항우울제 복용 체크 / 저녁 항우울제 체크
4. **달력 확인**: 지난 2주 복약 기록 달력에서 확인
5. **미복용 대응**: 어제 저녁 항우울제를 빼먹었다는 걸 오늘 발견 → 어떻게 처리하나

## 출력 형식
각 시나리오 단계마다:
- **동작**: 이 유저가 실제로 어떻게 행동하는지
- **혼란 포인트**: 헷갈리거나 막히는 부분
- **잘 된 부분**: 직관적이거나 편한 부분

마지막에 **UX 문제점 우선순위 리스트** (심각도: 높음/중간/낮음) 작성.

다른 AI 모델의 테스트 결과를 참조하지 말 것. 오직 이 코드와 이 페르소나만으로 판단해라.
출력은 한국어로.`;

const PERSONA_B_PROMPT = `너는 GLP-Care 투약 관리 앱의 사용자 테스트를 수행하는 UX 리서처다.

## 페르소나 B
- 55세 주부
- 매일 아침 혈압약(암로디핀) 1정
- 매일 아침/저녁 당뇨약(메트포르민) 1정씩
- 매일 저녁 비타민D 1정
- 스마트폰은 카카오톡, 유튜브만 주로 사용
- 글씨 작으면 못 읽고, 단계 3개 넘어가면 포기함
- 약 이름 영어로 쓰면 헷갈려함

${SHARED_CONTEXT}

## 시나리오 (순서대로 시뮬레이션)
1. **첫 진입**: 앱 투약 탭 처음 열기 → 빈 화면에서 무엇을 해야 할지 파악
2. **약 등록**: 혈압약(매일 아침) + 당뇨약(매일 아침/저녁) + 비타민D(매일 저녁) 3가지 등록
3. **오늘 복약 체크**: 아침 약 2개 복용 체크
4. **달력 확인**: 지난 일주일 복약 기록 달력에서 확인
5. **미복용 대응**: 저녁 당뇨약을 빼먹었지만 알림이 없어서 몰랐음 → 다음 날 발견

## 출력 형식
각 시나리오 단계마다:
- **동작**: 이 유저가 실제로 어떻게 행동하는지
- **혼란 포인트**: 헷갈리거나 막히는 부분
- **잘 된 부분**: 직관적이거나 편한 부분

마지막에 **접근성 관점 UX 문제점 리스트** (심각도: 높음/중간/낮음) 작성.
특히 글씨 크기, 버튼 크기, 단계 수, 용어 이해도에 집중해라.

다른 AI 모델의 테스트 결과를 참조하지 말 것. 오직 이 코드와 이 페르소나만으로 판단해라.
출력은 한국어로.`;

// tasks.json 동적 생성
const tasks = [
  {
    name: 'user-test-sonnet',
    role: 'UX Tester A',
    model: 'sonnet',
    prompt: PERSONA_A_PROMPT,
    output: path.join(OUTPUT_DIR, 'user-test-sonnet.md'),
  },
  {
    name: 'user-test-gemini',
    role: 'UX Tester B',
    model: 'gemini',
    prompt: PERSONA_B_PROMPT,
    output: path.join(OUTPUT_DIR, 'user-test-gemini.md'),
  },
];

const tasksFile = path.join(__dirname, 'user-test-tasks-inlined.json');
fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
console.log(`✅ tasks 파일 생성: ${tasksFile}`);
console.log(`📄 injection.tsx: ${injectionCode.length.toLocaleString()} chars`);
console.log(`📄 spec: ${specContent.length.toLocaleString()} chars`);
console.log('🚀 buildkit task 실행 중...');

const NODE = '/Users/bugbookee/.nvm/versions/node/v22.22.1/bin/node';
execSync(`cd "${__dirname}" && ${NODE} buildkit.js task user-test-tasks-inlined.json`, {
  stdio: 'inherit',
  timeout: 600000,
});
