import { randomUUID } from 'crypto';
import { PipelineEngine, TaskEngine } from '../core/engine.js';
import { bridgeExecution } from './ws/execution.js';

function now() {
  return new Date().toISOString();
}

function toPipelineConfig(pipeline) {
  return {
    project: pipeline.name,
    codebase: pipeline.codebase,
    steps: pipeline.steps,
  };
}

export class ExecutionService {
  constructor({ db, io }) {
    this.db = db;
    this.io = io;
    this.running = new Map();
  }

  async startPipelineExecution({ pipelineId = null, pipelineConfig }) {
    const executionId = `exec-${randomUUID()}`;
    const startedAt = now();

    this.db.createExecution({
      id: executionId,
      pipeline_id: pipelineId,
      mode: 'pipeline',
      status: 'running',
      started_at: startedAt,
    });
    this.db.seedExecutionSteps(executionId, pipelineConfig.steps);

    const engine = new PipelineEngine({ executionId });
    const cleanup = bridgeExecution(this.io, this.db, engine);
    this.running.set(executionId, { engine, cleanup });

    Promise.resolve()
      .then(() => engine.runPipeline(pipelineConfig))
      .catch((error) => {
        this.db.finishExecution(executionId, {
          status: 'failed',
          error_message: error.message,
        });
      })
      .finally(() => {
        cleanup();
        this.running.delete(executionId);
      });

    return {
      executionId,
      status: 'running',
      started_at: startedAt,
    };
  }

  async startTaskExecution({ taskSetId = null, tasks }) {
    const executionId = `exec-${randomUUID()}`;
    const startedAt = now();

    this.db.createExecution({
      id: executionId,
      task_set_id: taskSetId,
      mode: 'task',
      status: 'running',
      started_at: startedAt,
    });
    this.db.seedExecutionSteps(executionId, tasks);

    const engine = new TaskEngine({ executionId });
    const cleanup = bridgeExecution(this.io, this.db, engine);
    this.running.set(executionId, { engine, cleanup });

    Promise.resolve()
      .then(() => engine.runTask(tasks))
      .catch((error) => {
        this.db.finishExecution(executionId, {
          status: 'failed',
          error_message: error.message,
        });
      })
      .finally(() => {
        cleanup();
        this.running.delete(executionId);
      });

    return {
      executionId,
      status: 'running',
      started_at: startedAt,
    };
  }

  cancelExecution(executionId) {
    const runningExecution = this.running.get(executionId);
    if (!runningExecution) {
      const current = this.db.getExecution(executionId);
      if (current && current.status === 'running') {
        this.db.finishExecution(executionId, {
          status: 'cancelled',
          total_tokens: current.total_tokens,
          total_cost: current.total_cost,
        });
      }
      return false;
    }

    runningExecution.engine.cancel();
    return true;
  }

  createPipelineConfigFromRecord(pipeline) {
    return toPipelineConfig(pipeline);
  }
}
