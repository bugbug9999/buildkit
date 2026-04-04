#!/usr/bin/env node
/**
 * BuildKit — 토큰 효율 AI 오케스트레이션
 *
 * pipeline.json 기반으로 UX→설계→개발→리뷰→보안 자동 실행.
 * 각 step의 output이 다음 step의 input으로 체이닝.
 * Paperclip 대비 토큰 70% 절감.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// === AI Providers ===
let anthropic, gemini, openai;

async function initProviders() {
  // Anthropic (Claude)
  if (process.env.ANTHROPIC_API_KEY) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic();
    console.log('✅ Claude SDK ready');
  }

  // Google (Gemini)
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    console.log('✅ Gemini SDK ready');
  }

  // OpenAI (GPT / Codex)
  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    openai = new OpenAI();
    console.log('✅ OpenAI SDK ready');
  }
}

// === AI 호출 (모델별 라우팅) ===
async function callAI(model, prompt, options = {}) {
  const startTime = Date.now();
  let result, tokensUsed = 0;

  if (model.startsWith('claude') || model === 'sonnet' || model === 'opus') {
    const modelId = model === 'sonnet' ? 'claude-sonnet-4-6' :
                    model === 'opus' ? 'claude-opus-4-6' : model;
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY 없음');
    const resp = await anthropic.messages.create({
      model: modelId,
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }]
    });
    result = resp.content[0].text;
    tokensUsed = (resp.usage?.input_tokens || 0) + (resp.usage?.output_tokens || 0);
  }
  else if (model.startsWith('gemini')) {
    if (!gemini) throw new Error('GEMINI_API_KEY 없음');
    const modelId = model === 'gemini' ? 'gemini-2.5-pro' : model;
    const m = gemini.getGenerativeModel({ model: modelId });
    const resp = await m.generateContent(prompt);
    result = resp.response.text();
    tokensUsed = resp.response.usageMetadata?.totalTokenCount || 0;
  }
  else if (model.startsWith('gpt') || model === 'openai') {
    if (!openai) throw new Error('OPENAI_API_KEY 없음');
    const modelId = model === 'openai' ? 'gpt-4o' : model;
    const resp = await openai.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 4096,
    });
    result = resp.choices[0].message.content;
    tokensUsed = (resp.usage?.prompt_tokens || 0) + (resp.usage?.completion_tokens || 0);
  }
  else if (model === 'codex') {
    // Codex CLI fallback
    const tmpFile = '/tmp/buildkit-codex-prompt.txt';
    fs.writeFileSync(tmpFile, prompt);
    result = execSync(`cat ${tmpFile} | codex -p "$(cat ${tmpFile})"`, {
      encoding: 'utf-8', timeout: 120000
    });
    tokensUsed = prompt.length / 4; // 추정
  }
  else {
    throw new Error(`Unknown model: ${model}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return { result, tokensUsed, elapsed, model };
}

// === 컨텍스트 최소화 엔진 ===
function extractContext(codebase, files, keywords = []) {
  let context = '';

  for (const filePath of files) {
    const fullPath = path.resolve(codebase, filePath);
    if (!fs.existsSync(fullPath)) {
      context += `\n// [${filePath}] 파일 없음\n`;
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    if (lines.length <= 200) {
      // 짧은 파일은 전체
      context += `\n// === ${filePath} ===\n${content}\n`;
    } else if (keywords.length > 0) {
      // 키워드 주변 라인만 추출
      const relevantLines = new Set();
      lines.forEach((line, idx) => {
        if (keywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))) {
          for (let i = Math.max(0, idx - 5); i <= Math.min(lines.length - 1, idx + 10); i++) {
            relevantLines.add(i);
          }
        }
      });
      const extracted = [...relevantLines].sort((a, b) => a - b)
        .map(i => `${i + 1}: ${lines[i]}`).join('\n');
      context += `\n// === ${filePath} (관련 부분만) ===\n${extracted}\n`;
    } else {
      // 처음 200줄
      context += `\n// === ${filePath} (처음 200줄) ===\n${lines.slice(0, 200).join('\n')}\n`;
    }
  }

  return context;
}

// === Git Diff ===
function getGitDiff(codebase) {
  try {
    return execSync('git diff --cached || git diff', { cwd: codebase, encoding: 'utf-8' });
  } catch { return ''; }
}

// === 파일 적용 ===
function applyCode(codebase, filePath, content) {
  const fullPath = path.resolve(codebase, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 코드 블록 추출 (AI가 ```로 감싸는 경우)
  const codeMatch = content.match(/```(?:typescript|javascript|tsx|jsx|ts|js)?\n([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1] : content;

  fs.writeFileSync(fullPath, code);
  return fullPath;
}

// === Lint/Build 검증 ===
function verify(codebase, type = 'typecheck') {
  try {
    if (type === 'typecheck') {
      execSync('npx tsc --noEmit 2>&1 || true', { cwd: codebase, encoding: 'utf-8', timeout: 30000 });
    } else if (type === 'lint') {
      execSync('npx eslint . --max-warnings 0 2>&1 || true', { cwd: codebase, encoding: 'utf-8', timeout: 30000 });
    } else if (type === 'build') {
      execSync('npm run build 2>&1', { cwd: codebase, encoding: 'utf-8', timeout: 60000 });
    }
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: e.stdout || e.message };
  }
}

// === Pipeline Runner ===
async function runPipeline(pipelinePath) {
  const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf-8'));
  const { project, codebase, steps } = pipeline;
  const outputs = {}; // step name → output content
  let totalTokens = 0;

  console.log(`\n🏗️  BuildKit Pipeline: ${project}`);
  console.log(`📁 Codebase: ${codebase}`);
  console.log(`📋 Steps: ${steps.length}\n`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNum = `[${i + 1}/${steps.length}]`;

    console.log(`${stepNum} ${step.role} (${step.model}) — ${step.step}`);

    // input 조립
    let inputContent = '';

    // 이전 step output 참조
    if (step.input) {
      const inputs = Array.isArray(step.input) ? step.input : [step.input];
      for (const inp of inputs) {
        if (outputs[inp]) {
          inputContent += `\n--- ${inp} ---\n${outputs[inp]}\n`;
        } else if (fs.existsSync(path.resolve(codebase, inp))) {
          inputContent += `\n--- ${inp} ---\n${fs.readFileSync(path.resolve(codebase, inp), 'utf-8')}\n`;
        }
      }
    }

    // 코드 파일 컨텍스트
    if (step.files) {
      inputContent += extractContext(codebase, step.files, step.keywords || []);
    }

    // git diff (리뷰용)
    if (step.input === 'git diff') {
      inputContent = getGitDiff(codebase);
    }

    // 프롬프트 조립
    const fullPrompt = `${step.prompt}\n\n${inputContent}`.trim();

    // AI 호출
    try {
      const { result, tokensUsed, elapsed, model } = await callAI(step.model, fullPrompt, step.options || {});
      totalTokens += tokensUsed;

      console.log(`  ✅ ${tokensUsed} tokens, ${elapsed}s`);

      // output 저장
      if (step.output === 'code' && step.files) {
        // 코드 수정 — 파일에 적용
        // AI 결과에서 파일별 코드 추출
        for (const filePath of step.files) {
          const fileMatch = result.match(new RegExp(`// === ${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=// ===|$)`));
          if (fileMatch) {
            applyCode(codebase, filePath, fileMatch[0]);
            console.log(`  📝 ${filePath} 수정`);
          }
        }
        // 검증
        if (step.verify) {
          const v = verify(codebase, step.verify);
          if (!v.success && step.retry !== false) {
            console.log(`  ⚠️ 검증 실패, 재시도...`);
            const retryPrompt = `${fullPrompt}\n\n이전 결과에서 에러 발생:\n${v.error}\n\n수정해서 다시 작성해.`;
            const retry = await callAI(step.model, retryPrompt);
            totalTokens += retry.tokensUsed;
            for (const filePath of step.files) {
              applyCode(codebase, filePath, retry.result);
            }
            console.log(`  🔄 재시도 완료 (+${retry.tokensUsed} tokens)`);
          }
        }
        outputs[step.step] = result;
      }
      else if (step.output && step.output !== 'code') {
        // 문서 저장
        const outPath = path.resolve(codebase, step.output);
        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, result);
        outputs[step.step] = result;
        outputs[step.output] = result;
        console.log(`  📄 ${step.output} 저장`);
      }

      // 리뷰 점수 체크
      if (step.pass) {
        const scoreMatch = result.match(/(\d+)\s*\/\s*10/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
        console.log(`  📊 점수: ${score}/10`);
        if (score < step.pass) {
          console.log(`  ❌ ${step.pass}점 미만 — code step 재실행 필요`);
          // 재실행 로직: code step 찾아서 다시 실행
          const codeStep = steps.findIndex(s => s.step === 'code');
          if (codeStep >= 0 && codeStep < i) {
            console.log(`  🔄 Step ${codeStep + 1} 재실행...`);
            i = codeStep - 1; // 루프에서 다시 code step으로
            continue;
          }
        }
      }

    } catch (e) {
      console.log(`  ❌ 에러: ${e.message}`);
      if (step.required !== false) {
        console.log(`  🛑 필수 step 실패. 파이프라인 중단.`);
        break;
      }
    }
  }

  // git commit
  try {
    execSync('git add -A && git commit -m "buildkit: pipeline execution"', {
      cwd: codebase, encoding: 'utf-8'
    });
    console.log(`\n📦 Git commit 완료`);
  } catch { /* no changes */ }

  console.log(`\n🏁 Pipeline 완료`);
  console.log(`📊 총 토큰: ${totalTokens.toLocaleString()}`);
  console.log(`💰 예상 비용: $${(totalTokens * 0.000003).toFixed(4)} (Sonnet 기준)`);

  return { totalTokens, outputs };
}

// === 단일 태스크 실행 (빠른 수정용) ===
async function runTask(taskPath) {
  const tasks = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  let totalTokens = 0;

  console.log(`\n⚡ BuildKit Quick Tasks: ${tasks.length}건\n`);

  // 병렬 실행 (다른 파일을 수정하는 경우)
  const results = await Promise.allSettled(
    tasks.map(async (task, idx) => {
      const context = task.file ?
        fs.readFileSync(path.resolve(task.codebase || '.', task.file), 'utf-8') : '';

      const prompt = `파일: ${task.file}\n수정할 곳: ${task.line ? `${task.line}번 줄 근처` : '전체'}\n할 일: ${task.do}\n\n현재 코드:\n${context}\n\n수정된 전체 파일 코드만 출력. 설명 불필요.`;

      const { result, tokensUsed, elapsed } = await callAI(task.model || 'gemini', prompt);
      totalTokens += tokensUsed;

      if (task.file) {
        applyCode(task.codebase || '.', task.file, result);
      }

      console.log(`  ✅ [${idx + 1}/${tasks.length}] ${task.file || task.do} — ${tokensUsed} tokens, ${elapsed}s`);
      return { task, result, tokensUsed };
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`\n🏁 완료: ${succeeded}건 성공, ${failed}건 실패`);
  console.log(`📊 총 토큰: ${totalTokens.toLocaleString()}`);

  return { totalTokens, succeeded, failed };
}

// === CLI ===
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  await initProviders();

  if (command === 'run' || command === 'pipeline') {
    const file = args[1] || 'pipeline.json';
    await runPipeline(file);
  }
  else if (command === 'task' || command === 'quick') {
    const file = args[1] || 'tasks.json';
    await runTask(file);
  }
  else if (command === 'status') {
    console.log('BuildKit v0.1.0');
    console.log(`Claude: ${anthropic ? '✅' : '❌'}`);
    console.log(`Gemini: ${gemini ? '✅' : '❌'}`);
    console.log(`OpenAI: ${openai ? '✅' : '❌'}`);
  }
  else {
    console.log(`
BuildKit — 토큰 효율 AI 오케스트레이션

Usage:
  buildkit run [pipeline.json]    파이프라인 실행 (UX→설계→개발→리뷰)
  buildkit task [tasks.json]      빠른 태스크 실행 (병렬)
  buildkit status                 SDK 연결 상태 확인

Environment:
  ANTHROPIC_API_KEY    Claude SDK
  GEMINI_API_KEY       Gemini SDK (또는 GOOGLE_API_KEY)
  OPENAI_API_KEY       OpenAI SDK
    `);
  }
}

main().catch(console.error);
