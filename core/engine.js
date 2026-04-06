import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import { callAI } from './providers.js';
import { extractContext, getGitDiff } from './context.js';
import { applyCode, verify } from './verify.js';

function normalizePipelineInput(pipelineInput) {
  if (typeof pipelineInput === 'string') {
    return JSON.parse(fs.readFileSync(pipelineInput, 'utf-8'));
  }
  return pipelineInput;
}

function normalizeTaskInput(taskInput) {
  if (typeof taskInput === 'string') {
    return JSON.parse(fs.readFileSync(taskInput, 'utf-8'));
  }
  return taskInput;
}

export class PipelineEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.executionId = options.executionId || null;
    this.cancelRequested = false;
  }

  cancel() {
    this.cancelRequested = true;
    this.emit('execution:cancelled', { executionId: this.executionId });
  }

  async runPipeline(pipelineInput) {
    const pipeline = normalizePipelineInput(pipelineInput);
    const { project, codebase, steps } = pipeline;
    const outputs = {};
    let totalTokens = 0;
    let totalCost = 0;
    let finalStatus = 'completed';
    let failureMessage = null;

    this.emit('execution:started', {
      executionId: this.executionId,
      pipelineName: project,
      totalSteps: steps.length,
      codebase,
      mode: 'pipeline',
    });

    for (let i = 0; i < steps.length; i += 1) {
      if (this.cancelRequested) {
        return { totalTokens, totalCost, outputs, cancelled: true };
      }

      const step = steps[i];
      const stepIndex = i;

      this.emit('step:started', {
        executionId: this.executionId,
        stepIndex,
        stepName: step.step,
        role: step.role,
        model: step.model,
        requestedModel: step.model,
      });

      let inputContent = '';

      if (step.input) {
        const inputs = Array.isArray(step.input) ? step.input : [step.input];
        for (const inputItem of inputs) {
          if (outputs[inputItem]) {
            inputContent += `\n--- ${inputItem} ---\n${outputs[inputItem]}\n`;
          } else if (fs.existsSync(path.resolve(codebase, inputItem))) {
            inputContent += `\n--- ${inputItem} ---\n${fs.readFileSync(path.resolve(codebase, inputItem), 'utf-8')}\n`;
          }
        }
      }

      if (step.files) {
        inputContent += extractContext(codebase, step.files, step.keywords || []);
      }

      if (step.input === 'git diff') {
        inputContent = getGitDiff(codebase);
      }

      const fullPrompt = `${step.prompt}\n\n${inputContent}`.trim();

      try {
        const response = await callAI(step.model, fullPrompt, {
          ...(step.options || {}),
          onProgress: (message) => {
            this.emit('step:progress', {
              executionId: this.executionId,
              stepIndex,
              message,
            });
          },
        });

        totalTokens += response.tokensUsed;
        totalCost += response.cost || 0;

        this.emit('step:token-update', {
          executionId: this.executionId,
          stepIndex,
          tokensUsed: response.tokensUsed,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          cost: response.cost,
        });

        if (step.output === 'code' && step.files) {
          for (const filePath of step.files) {
            const filePattern = new RegExp(`// === ${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=// ===|$)`);
            const fileMatch = response.result.match(filePattern);
            if (fileMatch) {
              applyCode(codebase, filePath, fileMatch[0]);
              this.emit('step:progress', {
                executionId: this.executionId,
                stepIndex,
                message: `📝 ${filePath} 수정`,
              });
            }
          }

          if (step.verify) {
            const verifyResult = verify(codebase, step.verify);
            this.emit('step:verify-result', {
              executionId: this.executionId,
              stepIndex,
              verifyType: step.verify,
              success: verifyResult.success,
              error: verifyResult.error,
            });

            if (!verifyResult.success && step.retry !== false) {
              this.emit('step:retrying', {
                executionId: this.executionId,
                stepIndex,
                reason: verifyResult.error,
                retryCount: 1,
              });

              const retryPrompt = `${fullPrompt}\n\n이전 결과에서 에러 발생:\n${verifyResult.error}\n\n수정해서 다시 작성해.`;
              const retry = await callAI(step.model, retryPrompt, step.options || {});
              totalTokens += retry.tokensUsed;
              totalCost += retry.cost || 0;

              for (const filePath of step.files) {
                applyCode(codebase, filePath, retry.result);
              }

              this.emit('step:progress', {
                executionId: this.executionId,
                stepIndex,
                message: `🔄 재시도 완료 (+${retry.tokensUsed} tokens)`,
              });
            }
          }

          outputs[step.step] = response.result;
        } else if (step.output && step.output !== 'code') {
          const outPath = path.resolve(codebase, step.output);
          const outDir = path.dirname(outPath);
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }
          fs.writeFileSync(outPath, response.result);
          outputs[step.step] = response.result;
          outputs[step.output] = response.result;
        }

        if (step.pass) {
          const scoreMatch = response.result.match(/(\d+)\s*\/\s*10/);
          const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
          const willRetry = score < step.pass;

        this.emit('step:review-score', {
          executionId: this.executionId,
          stepIndex,
          score,
          pass: step.pass,
          willRetry,
          retryStepIndex: willRetry ? steps.findIndex((item) => item.step === 'code') : -1,
        });

        if (willRetry) {
          const codeStep = steps.findIndex((item) => item.step === 'code');
          if (codeStep >= 0 && codeStep < i) {
              i = codeStep - 1;
            }
          }
        }

        this.emit('step:completed', {
          executionId: this.executionId,
          stepIndex,
          stepName: step.step,
          role: step.role,
          model: response.model,
          requestedModel: step.model,
          tokensUsed: response.tokensUsed,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          cost: response.cost,
          elapsed: Number(response.elapsed),
          outputPreview: response.result.slice(0, 500),
          outputText: response.result,
          outputPath: step.output && step.output !== 'code' ? step.output : null,
        });
      } catch (error) {
        this.emit('step:failed', {
          executionId: this.executionId,
          stepIndex,
          stepName: step.step,
          error: error.message,
          required: step.required !== false,
        });

        if (step.required !== false) {
          finalStatus = 'failed';
          failureMessage = error.message;
          this.emit('execution:failed', {
            executionId: this.executionId,
            error: error.message,
            failedStep: stepIndex,
          });
          break;
        }
      }
    }

    try {
      execSync('git add -A && git commit -m "buildkit: pipeline execution"', {
        cwd: codebase,
        encoding: 'utf-8',
      });
      this.emit('execution:progress', {
        executionId: this.executionId,
        message: '📦 Git commit 완료',
      });
    } catch {
      // no-op
    }

    this.emit('execution:completed', {
      executionId: this.executionId,
      status: finalStatus,
      totalTokens,
      totalCost: Number(totalCost.toFixed(6)),
      error: failureMessage,
    });

    return { totalTokens, totalCost: Number(totalCost.toFixed(6)), outputs };
  }
}

export class TaskEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.executionId = options.executionId || null;
  }

  async runTask(taskInput) {
    const tasks = normalizeTaskInput(taskInput);
    let totalTokens = 0;
    let totalCost = 0;

    this.emit('execution:started', {
      executionId: this.executionId,
      mode: 'task',
      totalSteps: tasks.length,
    });

    const results = await Promise.allSettled(
      tasks.map(async (task, index) => {
        const taskName = task.name || task.file || task.do || `task-${index}`;
        const taskModel = task.model || 'gemini';

        this.emit('step:started', {
          executionId: this.executionId,
          stepIndex: index,
          stepName: taskName,
          role: 'Task',
          model: taskModel,
          requestedModel: taskModel,
        });

        let context = '';
        const basePath = task.codebase || '.';

        // Read target file if it exists
        if (task.file) {
          const filePath = path.resolve(basePath, task.file);
          if (fs.existsSync(filePath)) {
            context = fs.readFileSync(filePath, 'utf-8');
          }
        }

        // Read context_files if provided
        let contextFiles = '';
        if (task.context_files && Array.isArray(task.context_files)) {
          for (const cf of task.context_files) {
            const cfPath = path.resolve(basePath, cf);
            if (fs.existsSync(cfPath)) {
              contextFiles += `\n--- ${cf} ---\n${fs.readFileSync(cfPath, 'utf-8')}\n`;
            }
          }
        }

        let prompt;
        if (task.instruction) {
          // New format: instruction-based task
          prompt = `${task.instruction}\n\n${context ? `현재 코드 (${task.file}):\n${context}\n\n` : ''}${contextFiles ? `참고 파일:\n${contextFiles}\n\n` : ''}수정된 전체 파일 코드만 출력. 설명 불필요.`;
        } else {
          // Legacy format: do-based task
          prompt = `파일: ${task.file}\n수정할 곳: ${task.line ? `${task.line}번 줄 근처` : '전체'}\n할 일: ${task.do}\n\n현재 코드:\n${context}\n\n수정된 전체 파일 코드만 출력. 설명 불필요.`;
        }

        const response = await callAI(taskModel, prompt, task.options || {});
        totalTokens += response.tokensUsed;
        totalCost += response.cost || 0;

        if (task.file) {
          applyCode(task.codebase || '.', task.file, response.result);
        }

        this.emit('step:completed', {
          executionId: this.executionId,
          stepIndex: index,
          stepName: taskName,
          role: 'Task',
          model: response.model,
          requestedModel: taskModel,
          tokensUsed: response.tokensUsed,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          cost: response.cost,
          elapsed: Number(response.elapsed),
          outputPreview: response.result.slice(0, 500),
          outputText: response.result,
          outputPath: task.file || null,
        });

        return { task, result: response.result, tokensUsed: response.tokensUsed };
      })
    );

    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.filter((result) => result.status === 'rejected').length;

    this.emit('execution:completed', {
      executionId: this.executionId,
      totalTokens,
      totalCost: Number(totalCost.toFixed(6)),
      succeeded,
      failed,
    });

    return { totalTokens, totalCost: Number(totalCost.toFixed(6)), succeeded, failed };
  }
}
