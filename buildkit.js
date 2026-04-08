#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
import { PipelineEngine, TaskEngine } from './core/engine.js';
import { getClaudeCliPath, getCodexCliPath, getGeminiCliPath, getProviderStatus, initProviders } from './core/providers.js';
import { createDb } from './server/db/db.js';

function now() {
  return new Date().toISOString();
}

function withDb(action) {
  try {
    return action();
  } catch (error) {
    console.error(`  ⚠️ DB 기록 실패: ${error.message}`);
    return null;
  }
}

function ensurePipelineRecord(db, pipeline) {
  if (!db || !pipeline) return null;

  const input = {
    id: pipeline.id || null,
    name: pipeline.project || pipeline.name,
    description: pipeline.description || null,
    codebase: pipeline.codebase || process.cwd(),
    steps: pipeline.steps || [],
  };

  if (!input.name) return null;

  if (typeof db.upsertPipeline === 'function') {
    const saved = db.upsertPipeline(input);
    return saved?.id || input.id || null;
  }

  if (typeof db.createPipeline !== 'function') {
    return null;
  }

  if (input.id && typeof db.getPipeline === 'function') {
    const existingById = db.getPipeline(input.id);
    if (existingById) {
      return existingById.id;
    }
  }

  if (typeof db.listPipelines === 'function') {
    const existingByName = db.listPipelines().find((item) => item.name === input.name && item.codebase === input.codebase);
    if (existingByName) {
      return existingByName.id;
    }
  }

  const created = db.createPipeline(input);
  return created?.id || input.id || null;
}

function failExecutionRecord(db, executionId, error) {
  if (typeof db.syncExecutionTotals === 'function') {
    db.syncExecutionTotals(executionId);
  }

  if (typeof db.failExecution === 'function') {
    db.failExecution(executionId, error);
    return;
  }

  if (typeof db.finishExecution === 'function') {
    const current = typeof db.getExecution === 'function' ? db.getExecution(executionId) : null;
    db.finishExecution(executionId, {
      status: 'failed',
      total_tokens: current?.total_tokens || 0,
      total_cost: current?.total_cost || 0,
      error_message: error || null,
    });
  }
}

function completeExecutionRecord(db, executionId, data = {}) {
  if (typeof db.syncExecutionTotals === 'function') {
    db.syncExecutionTotals(executionId);
  }

  const status = data.status || (data.error ? 'failed' : 'completed');

  if (status === 'failed') {
    failExecutionRecord(db, executionId, data.error);
    return;
  }

  if (typeof db.completeExecution === 'function') {
    db.completeExecution(executionId);
    return;
  }

  if (typeof db.finishExecution === 'function') {
    db.finishExecution(executionId, {
      status,
      total_tokens: data.totalTokens || 0,
      total_cost: data.totalCost || 0,
      error_message: data.error || null,
    });
  }
}

function attachExecutionDbRecording(engine, db, { executionId, mode, pipelineId = null, taskSetId = null, steps = [] }) {
  let executionCreated = false;

  const createExecutionRecord = (startedAt = now()) => {
    if (executionCreated) return;

    db.createExecution({
      id: executionId,
      pipeline_id: pipelineId,
      task_set_id: taskSetId,
      mode,
      status: 'running',
      total_tokens: 0,
      total_cost: 0,
      started_at: startedAt,
    });
    db.seedExecutionSteps(executionId, steps);
    executionCreated = true;
  };

  engine.on('execution:started', () => {
    withDb(() => createExecutionRecord());
  });

  engine.on('step:started', (data) => {
    withDb(() => {
      db.markExecutionStepStarted(executionId, data.stepIndex, {
        stepName: data.stepName,
        role: data.role,
        model: data.model || data.requestedModel,
      });
    });
  });

  engine.on('step:completed', (data) => {
    withDb(() => {
      db.markExecutionStepCompleted(executionId, data.stepIndex, {
        model: data.model || data.requestedModel,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost: data.cost,
        elapsed: data.elapsed,
        outputText: data.outputText,
        outputPath: data.outputPath,
      });
      db.syncExecutionTotals(executionId);
    });
  });

  engine.on('step:failed', (data) => {
    withDb(() => {
      db.markExecutionStepFailed(executionId, data.stepIndex, {
        error: data.error,
      });
    });
  });

  engine.on('execution:completed', (data) => {
    withDb(() => {
      completeExecutionRecord(db, executionId, data);
    });
  });

  engine.on('execution:failed', (data) => {
    withDb(() => {
      failExecutionRecord(db, executionId, data.error);
    });
  });

  return {
    createExecutionRecord,
  };
}

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

async function runPipeline(file, db) {
  const pipeline = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const executionId = randomUUID();
  const pipelineId = ensurePipelineRecord(db, pipeline);
  const engine = new PipelineEngine({ executionId });

  const { createExecutionRecord } = attachExecutionDbRecording(engine, db, {
    executionId,
    mode: 'pipeline',
    pipelineId,
    steps: pipeline.steps,
  });

  createExecutionRecord();
  attachPipelineCliLogging(engine, pipeline.steps.length);
  return engine.runPipeline(pipeline);
}

async function runTask(file, db) {
  const tasks = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const executionId = randomUUID();
  const engine = new TaskEngine({ executionId });

  const seedSteps = tasks.map((task) => ({
    ...task,
    step: task.name || task.file || task.do || 'Task',
    role: task.role || 'Task',
  }));

  const { createExecutionRecord } = attachExecutionDbRecording(engine, db, {
    executionId,
    mode: 'task',
    steps: seedSteps,
  });

  createExecutionRecord();
  attachTaskCliLogging(engine, tasks.length);
  return engine.runTask(tasks);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  await initProviders({ logger: console.log });

  const db = createDb({
    dbPath: path.resolve(process.cwd(), 'server/db/buildkit.sqlite'),
  });

  if (command === 'run' || command === 'pipeline') {
    const file = args[1] || 'pipeline.json';
    await runPipeline(file, db);
    return;
  }

  if (command === 'task' || command === 'quick') {
    const file = args[1] || 'tasks.json';
    await runTask(file, db);
    return;
  }

  if (command === 'status') {
    const status = getProviderStatus();
    console.log('BuildKit v0.2.0');
    let claudeCli = false;

    let geminiCli = false;
    let codexCli = false;

    try {
      execSync(`${getClaudeCliPath()} --version`, { encoding: 'utf-8', timeout: 5000 });
      claudeCli = true;
    } catch {
      claudeCli = false;
    }

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

    console.log(`Claude: ${status.claude.mode === 'sdk' ? '✅ SDK' : claudeCli ? '✅ Claude CLI (구독)' : '❌'}`);
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
