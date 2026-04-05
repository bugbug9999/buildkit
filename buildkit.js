#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import { PipelineEngine, TaskEngine } from './core/engine.js';
import { getCodexCliPath, getGeminiCliPath, getProviderStatus, initProviders } from './core/providers.js';

function attachPipelineCliLogging(engine, stepsLength) {
  engine.on('execution:started', ({ pipelineName, codebase, totalSteps }) => {
    console.log(`\n🏗️  BuildKit Pipeline: ${pipelineName}`);
    console.log(`📁 Codebase: ${codebase}`);
    console.log(`📋 Steps: ${totalSteps || stepsLength}\n`);
  });

  engine.on('step:started', ({ stepIndex, role, requestedModel, stepName }) => {
    console.log(`[${stepIndex + 1}/${stepsLength}] ${role} (${requestedModel}) — ${stepName}`);
  });

  engine.on('step:progress', ({ message }) => {
    console.log(`  ${message}`);
  });

  engine.on('step:completed', ({ tokensUsed, elapsed, outputPath }) => {
    console.log(`  ✅ ${tokensUsed} tokens, ${elapsed}s`);
    if (outputPath) {
      console.log(`  📄 ${outputPath} 저장`);
    }
  });

  engine.on('step:verify-result', ({ success }) => {
    if (!success) {
      console.log('  ⚠️ 검증 실패, 재시도...');
    }
  });

  engine.on('step:review-score', ({ score, pass, willRetry, retryStepIndex }) => {
    console.log(`  📊 점수: ${score}/10`);
    if (willRetry) {
      console.log(`  ❌ ${pass}점 미만 — code step 재실행 필요`);
      if (retryStepIndex >= 0) {
        console.log(`  🔄 Step ${retryStepIndex + 1} 재실행...`);
      }
    }
  });

  engine.on('step:failed', ({ error, required }) => {
    console.log(`  ❌ 에러: ${error}`);
    if (required) {
      console.log('  🛑 필수 step 실패. 파이프라인 중단.');
    }
  });

  engine.on('execution:progress', ({ message }) => {
    console.log(`\n${message}`);
  });

  engine.on('execution:completed', ({ totalTokens }) => {
    console.log('\n🏁 Pipeline 완료');
    console.log(`📊 총 토큰: ${totalTokens.toLocaleString()}`);
    console.log(`💰 예상 비용: $${(totalTokens * 0.000003).toFixed(4)} (Sonnet 기준)`);
  });
}

function attachTaskCliLogging(engine, totalTasks) {
  engine.on('execution:started', () => {
    console.log(`\n⚡ BuildKit Quick Tasks: ${totalTasks}건\n`);
  });

  engine.on('step:completed', ({ stepIndex, stepName, tokensUsed, elapsed }) => {
    console.log(`  ✅ [${stepIndex + 1}/${totalTasks}] ${stepName} — ${tokensUsed} tokens, ${elapsed}s`);
  });

  engine.on('execution:completed', ({ totalTokens, succeeded, failed }) => {
    console.log(`\n🏁 완료: ${succeeded}건 성공, ${failed}건 실패`);
    console.log(`📊 총 토큰: ${totalTokens.toLocaleString()}`);
  });
}

async function runPipeline(file) {
  const pipeline = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const engine = new PipelineEngine();
  attachPipelineCliLogging(engine, pipeline.steps.length);
  return engine.runPipeline(pipeline);
}

async function runTask(file) {
  const tasks = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const engine = new TaskEngine();
  attachTaskCliLogging(engine, tasks.length);
  return engine.runTask(tasks);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  await initProviders({ logger: console.log });

  if (command === 'run' || command === 'pipeline') {
    const file = args[1] || 'pipeline.json';
    await runPipeline(file);
    return;
  }

  if (command === 'task' || command === 'quick') {
    const file = args[1] || 'tasks.json';
    await runTask(file);
    return;
  }

  if (command === 'status') {
    const status = getProviderStatus();
    console.log('BuildKit v0.2.0');
    console.log(`Claude: ${status.claude.available ? '✅ SDK' : '❌'}`);

    let geminiCli = false;
    let codexCli = false;

    try {
      execSync(`${getGeminiCliPath()} --version`, { encoding: 'utf-8', timeout: 5000 });
      geminiCli = true;
    } catch {
      geminiCli = false;
    }

    try {
      execSync(`${getCodexCliPath()} --version`, { encoding: 'utf-8', timeout: 5000 });
      codexCli = true;
    } catch {
      codexCli = false;
    }

    console.log(`Gemini: ${status.gemini.mode === 'sdk' ? '✅ SDK' : geminiCli ? '✅ CLI (Ultra)' : '❌'}`);
    console.log(`OpenAI: ${status.openai.mode === 'sdk' ? '✅ SDK' : codexCli ? '✅ CLI (Codex)' : '❌'}`);
    return;
  }

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

main().catch(console.error);
