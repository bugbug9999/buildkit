import express from 'express';
import multer from 'multer';
import { ok, fail } from './utils.js';

const upload = multer({ storage: multer.memoryStorage() });

function toRecordPayload(body) {
  return {
    name: body.name || body.project,
    description: body.description || null,
    codebase: body.codebase,
    steps: body.steps || [],
  };
}

function toPipelineExport(pipeline) {
  return {
    project: pipeline.name,
    codebase: pipeline.codebase,
    steps: pipeline.steps,
  };
}

export function createPipelinesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    ok(res, db.listPipelines());
  });

  router.post('/', (req, res) => {
    const payload = toRecordPayload(req.body || {});
    if (!payload.name || !payload.codebase || !Array.isArray(payload.steps)) {
      return fail(res, 'INVALID_PIPELINE', 'name, codebase, steps는 필수입니다.');
    }
    const pipeline = db.createPipeline(payload);
    return ok(res, pipeline);
  });

  router.post('/import', upload.single('file'), (req, res) => {
    try {
      const source = req.file?.buffer?.toString('utf-8') || req.body?.json;
      if (!source) {
        return fail(res, 'PIPELINE_IMPORT_FAILED', 'JSON 파일이 필요합니다.');
      }
      const parsed = JSON.parse(source);
      const pipeline = db.createPipeline(toRecordPayload(parsed));
      return ok(res, pipeline);
    } catch (error) {
      return fail(res, 'PIPELINE_IMPORT_FAILED', error.message);
    }
  });

  router.get('/:id', (req, res) => {
    const pipeline = db.getPipeline(req.params.id);
    if (!pipeline) {
      return fail(res, 'PIPELINE_NOT_FOUND', '파이프라인을 찾을 수 없습니다.', 404);
    }
    return ok(res, pipeline);
  });

  router.put('/:id', (req, res) => {
    const pipeline = db.updatePipeline(req.params.id, toRecordPayload(req.body || {}));
    if (!pipeline) {
      return fail(res, 'PIPELINE_NOT_FOUND', '파이프라인을 찾을 수 없습니다.', 404);
    }
    return ok(res, pipeline);
  });

  router.delete('/:id', (req, res) => {
    const result = db.deletePipeline(req.params.id);
    if (!result.changes) {
      return fail(res, 'PIPELINE_NOT_FOUND', '파이프라인을 찾을 수 없습니다.', 404);
    }
    return ok(res, { id: req.params.id, deleted: true });
  });

  router.post('/:id/duplicate', (req, res) => {
    const duplicated = db.duplicatePipeline(req.params.id);
    if (!duplicated) {
      return fail(res, 'PIPELINE_NOT_FOUND', '파이프라인을 찾을 수 없습니다.', 404);
    }
    return ok(res, duplicated);
  });

  router.get('/:id/export', (req, res) => {
    const pipeline = db.getPipeline(req.params.id);
    if (!pipeline) {
      return fail(res, 'PIPELINE_NOT_FOUND', '파이프라인을 찾을 수 없습니다.', 404);
    }
    res.type('application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${pipeline.name}.json"`);
    return res.send(JSON.stringify(toPipelineExport(pipeline), null, 2));
  });

  return router;
}
