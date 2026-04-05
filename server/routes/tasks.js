import express from 'express';
import multer from 'multer';
import { ok, fail } from './utils.js';

const upload = multer({ storage: multer.memoryStorage() });

export function createTaskSetsRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    ok(res, db.listTaskSets());
  });

  router.post('/', (req, res) => {
    const payload = {
      name: req.body?.name,
      tasks: req.body?.tasks || [],
    };
    if (!payload.name || !Array.isArray(payload.tasks)) {
      return fail(res, 'INVALID_TASK_SET', 'name, tasks는 필수입니다.');
    }
    return ok(res, db.createTaskSet(payload));
  });

  router.post('/import', upload.single('file'), (req, res) => {
    try {
      const source = req.file?.buffer?.toString('utf-8') || req.body?.json;
      if (!source) {
        return fail(res, 'TASK_IMPORT_FAILED', 'JSON 파일이 필요합니다.');
      }
      const parsed = JSON.parse(source);
      return ok(res, db.createTaskSet({
        name: parsed.name || 'Imported Task Set',
        tasks: Array.isArray(parsed) ? parsed : parsed.tasks || [],
      }));
    } catch (error) {
      return fail(res, 'TASK_IMPORT_FAILED', error.message);
    }
  });

  router.get('/:id', (req, res) => {
    const taskSet = db.getTaskSet(req.params.id);
    if (!taskSet) {
      return fail(res, 'TASK_SET_NOT_FOUND', '태스크 세트를 찾을 수 없습니다.', 404);
    }
    return ok(res, taskSet);
  });

  router.put('/:id', (req, res) => {
    const taskSet = db.updateTaskSet(req.params.id, {
      name: req.body?.name,
      tasks: req.body?.tasks,
    });
    if (!taskSet) {
      return fail(res, 'TASK_SET_NOT_FOUND', '태스크 세트를 찾을 수 없습니다.', 404);
    }
    return ok(res, taskSet);
  });

  router.delete('/:id', (req, res) => {
    const result = db.deleteTaskSet(req.params.id);
    if (!result.changes) {
      return fail(res, 'TASK_SET_NOT_FOUND', '태스크 세트를 찾을 수 없습니다.', 404);
    }
    return ok(res, { id: req.params.id, deleted: true });
  });

  return router;
}
