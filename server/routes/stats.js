import express from 'express';
import { ok } from './utils.js';

export function createStatsRouter(db) {
  const router = express.Router();

  router.get('/monthly', (req, res) => {
    const year = Number(req.query.year || new Date().getUTCFullYear());
    const month = Number(req.query.month || new Date().getUTCMonth() + 1);
    ok(res, db.getMonthlyStats({ year, month }));
  });

  router.get('/by-model', (req, res) => {
    ok(res, db.getModelStats());
  });

  return router;
}
