import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { initProviders } from '../core/providers.js';
import { createDb } from './db/db.js';
import { ExecutionService } from './execution-service.js';
import { createPipelinesRouter } from './routes/pipelines.js';
import { createTaskSetsRouter } from './routes/tasks.js';
import { createExecutionsRouter } from './routes/executions.js';
import { createProvidersRouter } from './routes/providers.js';
import { createFilesystemRouter } from './routes/filesystem.js';
import { createStatsRouter } from './routes/stats.js';
import { createSettingsRouter } from './routes/settings.js';
import { attachExecutionSocket } from './ws/execution.js';

const port = Number(process.env.PORT || 3100);
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

await initProviders();

const db = createDb({
  dbPath: path.resolve(process.cwd(), 'server/db/buildkit.sqlite'),
  schemaPath: path.resolve(process.cwd(), 'server/db/schema.sql'),
});
const executionService = new ExecutionService({ db, io });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/pipelines', createPipelinesRouter(db));
app.use('/api/task-sets', createTaskSetsRouter(db));
app.use('/api/executions', createExecutionsRouter(db, executionService));
app.use('/api/providers', createProvidersRouter());
app.use('/api/fs', createFilesystemRouter());
app.use('/api/stats', createStatsRouter(db));
app.use('/api/settings', createSettingsRouter(db));

attachExecutionSocket(io, executionService);

server.listen(port, () => {
  console.log(`BuildKit server listening on http://localhost:${port}`);
});
