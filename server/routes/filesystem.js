import fs from 'fs';
import path from 'path';
import express from 'express';
import { ok, fail } from './utils.js';

function statItem(targetPath, name) {
  const itemPath = path.resolve(targetPath, name);
  const stat = fs.statSync(itemPath);
  return {
    name,
    path: itemPath,
    type: stat.isDirectory() ? 'directory' : 'file',
    size: stat.size,
  };
}

export function createFilesystemRouter() {
  const router = express.Router();

  router.get('/browse', (req, res) => {
    const targetPath = req.query.path || process.cwd();
    const resolved = path.resolve(String(targetPath));
    if (!fs.existsSync(resolved)) {
      return fail(res, 'PATH_NOT_FOUND', '경로가 존재하지 않습니다.', 404);
    }
    const items = fs.readdirSync(resolved).map((name) => statItem(resolved, name));
    return ok(res, { path: resolved, items });
  });

  router.get('/read', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) {
      return fail(res, 'PATH_REQUIRED', 'path 쿼리가 필요합니다.');
    }
    const resolved = path.resolve(String(targetPath));
    if (!fs.existsSync(resolved)) {
      return fail(res, 'PATH_NOT_FOUND', '파일이 존재하지 않습니다.', 404);
    }
    return ok(res, { path: resolved, content: fs.readFileSync(resolved, 'utf-8') });
  });

  router.get('/validate', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) {
      return fail(res, 'PATH_REQUIRED', 'path 쿼리가 필요합니다.');
    }
    const resolved = path.resolve(String(targetPath));
    return ok(res, { path: resolved, exists: fs.existsSync(resolved) });
  });

  return router;
}
