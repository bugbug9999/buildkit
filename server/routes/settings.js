import express from 'express';
import { ok } from './utils.js';

export function createSettingsRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    ok(res, db.getSettings());
  });

  router.put('/', (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    ok(res, db.upsertSettings(payload));
  });

  return router;
}
