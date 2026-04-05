import express from 'express';
import { getProviderStatus, initProviders } from '../../core/providers.js';
import { ok, fail } from './utils.js';

export function createProvidersRouter() {
  const router = express.Router();

  router.get('/status', (req, res) => {
    ok(res, getProviderStatus());
  });

  router.post('/test/:name', async (req, res) => {
    const status = await initProviders();
    const provider = status[req.params.name];
    if (!provider) {
      return fail(res, 'PROVIDER_NOT_FOUND', '알 수 없는 프로바이더입니다.', 404);
    }
    return ok(res, provider);
  });

  return router;
}
