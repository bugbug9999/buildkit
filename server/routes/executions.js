import express from 'express';
import multer from 'multer';
import { ok, fail } from './utils.js';

const upload = multer({ storage: multer.memoryStorage() });

export function createExecutionsRouter(db, executionService) {
  const router = express.Router();

  router.post('/pipeline/:id', async (req, res) => {
    const pipeline = db.getPipeline(req.params.id);
    if (!pipeline) {
      return fail(res, 'PIPELINE_NOT_FOUND', '파이프라인을 찾을 수 없습니다.', 404);
    }
    const started = await executionService.startPipelineExecution({
      pipelineId: pipeline.id,
      pipelineConfig: executionService.createPipelineConfigFromRecord(pipeline),
    });
    return ok(res, started);
  });

  router.post('/task-set/:id', async (req, res) => {
    const taskSet = db.getTaskSet(req.params.id);
    if (!taskSet) {
      return fail(res, 'TASK_SET_NOT_FOUND', '태스크 세트를 찾을 수 없습니다.', 404);
    }
    const started = await executionService.startTaskExecution({
      taskSetId: taskSet.id,
      tasks: taskSet.tasks,
    });
    return ok(res, started);
  });

  router.post('/file', upload.single('file'), async (req, res) => {
    try {
      const source =
        req.file?.buffer?.toString('utf-8') ||
        req.body?.json ||
        (req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : null);
      if (!source) {
        return fail(res, 'EXECUTION_FILE_REQUIRED', '실행할 JSON 파일이 필요합니다.');
      }

      const parsed = JSON.parse(source);
      if (Array.isArray(parsed) || Array.isArray(parsed.tasks)) {
        const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
        return ok(res, await executionService.startTaskExecution({ tasks }));
      }

      if (parsed.steps && parsed.codebase) {
        const pipelineConfig = {
          project: parsed.project || parsed.name || 'Imported Pipeline',
          codebase: parsed.codebase,
          steps: parsed.steps,
        };
        return ok(res, await executionService.startPipelineExecution({ pipelineConfig }));
      }

      return fail(res, 'EXECUTION_FILE_INVALID', 'pipeline 또는 task JSON 포맷이 아닙니다.');
    } catch (error) {
      return fail(res, 'EXECUTION_FILE_INVALID', error.message);
    }
  });

  router.post('/:id/cancel', (req, res) => {
    const cancelled = executionService.cancelExecution(req.params.id);
    return ok(res, { executionId: req.params.id, cancelled });
  });

  router.get('/', (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const mode = req.query.mode || null;
    const result = db.listExecutions({ page, limit, mode });
    return ok(res, result.data, result.pagination);
  });

  router.get('/:id', (req, res) => {
    const execution = db.getExecution(req.params.id);
    if (!execution) {
      return fail(res, 'EXECUTION_NOT_FOUND', '실행 이력을 찾을 수 없습니다.', 404);
    }
    return ok(res, execution);
  });

  router.get('/:id/steps/:idx/output', (req, res) => {
    const output = db.getExecutionStepOutput(req.params.id, Number(req.params.idx));
    if (!output) {
      return fail(res, 'EXECUTION_STEP_NOT_FOUND', '스텝 출력을 찾을 수 없습니다.', 404);
    }
    return ok(res, output);
  });

  return router;
}
