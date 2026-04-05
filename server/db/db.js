import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

function now() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapPipeline(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    codebase: row.codebase,
    steps: parseJson(row.steps_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTaskSet(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    tasks: parseJson(row.tasks_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createDb(options = {}) {
  const dbPath = options.dbPath || path.resolve(process.cwd(), 'server/db/buildkit.sqlite');
  const schemaPath = options.schemaPath || path.resolve(process.cwd(), 'server/db/schema.sql');

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(fs.readFileSync(schemaPath, 'utf-8'));

  const api = {
    raw: db,
    dbPath,

    listPipelines() {
      return db.prepare('SELECT * FROM pipelines ORDER BY updated_at DESC').all().map(mapPipeline);
    },

    getPipeline(id) {
      return mapPipeline(db.prepare('SELECT * FROM pipelines WHERE id = ?').get(id));
    },

    createPipeline(input) {
      const id = input.id || randomUUID();
      const timestamp = now();
      db.prepare(`
        INSERT INTO pipelines (id, name, description, codebase, steps_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, input.name, input.description || null, input.codebase, JSON.stringify(input.steps || []), timestamp, timestamp);
      return this.getPipeline(id);
    },

    updatePipeline(id, input) {
      const current = this.getPipeline(id);
      if (!current) return null;
      const next = {
        name: input.name ?? current.name,
        description: input.description ?? current.description,
        codebase: input.codebase ?? current.codebase,
        steps: input.steps ?? current.steps,
      };
      db.prepare(`
        UPDATE pipelines
        SET name = ?, description = ?, codebase = ?, steps_json = ?, updated_at = ?
        WHERE id = ?
      `).run(next.name, next.description, next.codebase, JSON.stringify(next.steps), now(), id);
      return this.getPipeline(id);
    },

    deletePipeline(id) {
      return db.prepare('DELETE FROM pipelines WHERE id = ?').run(id);
    },

    duplicatePipeline(id) {
      const pipeline = this.getPipeline(id);
      if (!pipeline) return null;
      return this.createPipeline({
        name: `${pipeline.name} (Copy)`,
        description: pipeline.description,
        codebase: pipeline.codebase,
        steps: pipeline.steps,
      });
    },

    listTaskSets() {
      return db.prepare('SELECT * FROM task_sets ORDER BY updated_at DESC').all().map(mapTaskSet);
    },

    getTaskSet(id) {
      return mapTaskSet(db.prepare('SELECT * FROM task_sets WHERE id = ?').get(id));
    },

    createTaskSet(input) {
      const id = input.id || randomUUID();
      const timestamp = now();
      db.prepare(`
        INSERT INTO task_sets (id, name, tasks_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, input.name, JSON.stringify(input.tasks || []), timestamp, timestamp);
      return this.getTaskSet(id);
    },

    updateTaskSet(id, input) {
      const current = this.getTaskSet(id);
      if (!current) return null;
      db.prepare(`
        UPDATE task_sets
        SET name = ?, tasks_json = ?, updated_at = ?
        WHERE id = ?
      `).run(input.name ?? current.name, JSON.stringify(input.tasks ?? current.tasks), now(), id);
      return this.getTaskSet(id);
    },

    deleteTaskSet(id) {
      return db.prepare('DELETE FROM task_sets WHERE id = ?').run(id);
    },

    createExecution(input) {
      const timestamp = input.started_at || now();
      db.prepare(`
        INSERT INTO executions (id, pipeline_id, task_set_id, mode, status, total_tokens, total_cost, started_at, finished_at, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.id,
        input.pipeline_id || null,
        input.task_set_id || null,
        input.mode,
        input.status,
        input.total_tokens || 0,
        input.total_cost || 0,
        timestamp,
        input.finished_at || null,
        input.error_message || null
      );
      return this.getExecution(input.id);
    },

    seedExecutionSteps(executionId, steps) {
      const insert = db.prepare(`
        INSERT INTO execution_steps (
          id, execution_id, step_index, step_name, role, model, status,
          input_tokens, output_tokens, cost, elapsed_sec, output_text,
          output_path, error_message, review_score, retry_count, started_at, finished_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL)
      `);
      const tx = db.transaction((items) => {
        items.forEach((step, index) => {
          insert.run(randomUUID(), executionId, index, step.step || step.file || step.do, step.role || 'Task', step.model || 'gemini', 'pending');
        });
      });
      tx(steps);
    },

    markExecutionStepStarted(executionId, stepIndex, data) {
      db.prepare(`
        UPDATE execution_steps
        SET status = 'running', step_name = ?, role = ?, model = ?, started_at = ?, error_message = NULL
        WHERE execution_id = ? AND step_index = ?
      `).run(data.stepName, data.role || null, data.model, now(), executionId, stepIndex);
    },

    markExecutionStepCompleted(executionId, stepIndex, data) {
      db.prepare(`
        UPDATE execution_steps
        SET status = 'completed',
            model = ?,
            input_tokens = ?,
            output_tokens = ?,
            cost = ?,
            elapsed_sec = ?,
            output_text = ?,
            output_path = ?,
            finished_at = ?,
            error_message = NULL
        WHERE execution_id = ? AND step_index = ?
      `).run(
        data.model,
        data.inputTokens || 0,
        data.outputTokens || 0,
        data.cost || 0,
        data.elapsed || 0,
        data.outputText || null,
        data.outputPath || null,
        now(),
        executionId,
        stepIndex
      );
    },

    syncExecutionTotals(executionId) {
      const totals = db.prepare(`
        SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens, COALESCE(SUM(cost), 0) AS total_cost
        FROM execution_steps
        WHERE execution_id = ?
      `).get(executionId);
      db.prepare(`
        UPDATE executions
        SET total_tokens = ?, total_cost = ?
        WHERE id = ?
      `).run(totals.total_tokens || 0, totals.total_cost || 0, executionId);
    },

    markExecutionStepFailed(executionId, stepIndex, data) {
      db.prepare(`
        UPDATE execution_steps
        SET status = 'failed', error_message = ?, finished_at = ?
        WHERE execution_id = ? AND step_index = ?
      `).run(data.error || 'Unknown error', now(), executionId, stepIndex);
    },

    markExecutionStepRetrying(executionId, stepIndex, data) {
      db.prepare(`
        UPDATE execution_steps
        SET status = 'retrying', error_message = ?, retry_count = ?
        WHERE execution_id = ? AND step_index = ?
      `).run(data.reason || null, data.retryCount || 1, executionId, stepIndex);
    },

    markExecutionStepReview(executionId, stepIndex, data) {
      db.prepare(`
        UPDATE execution_steps
        SET review_score = ?
        WHERE execution_id = ? AND step_index = ?
      `).run(data.score, executionId, stepIndex);
    },

    markExecutionStepVerify(executionId, stepIndex, data) {
      if (data.success) return;
      db.prepare(`
        UPDATE execution_steps
        SET error_message = ?
        WHERE execution_id = ? AND step_index = ?
      `).run(data.error || `${data.verifyType} failed`, executionId, stepIndex);
    },

    finishExecution(id, input) {
      db.prepare(`
        UPDATE executions
        SET status = ?, total_tokens = ?, total_cost = ?, finished_at = ?, error_message = ?
        WHERE id = ?
      `).run(
        input.status,
        input.total_tokens || 0,
        input.total_cost || 0,
        input.finished_at || now(),
        input.error_message || null,
        id
      );
    },

    listExecutions({ page = 1, limit = 20, mode = null } = {}) {
      const offset = (page - 1) * limit;
      const where = mode ? 'WHERE mode = ?' : '';
      const params = mode ? [mode, limit, offset] : [limit, offset];
      const countParams = mode ? [mode] : [];
      const rows = db.prepare(`
        SELECT executions.*, pipelines.name AS pipeline_name, task_sets.name AS task_set_name
        FROM executions
        LEFT JOIN pipelines ON pipelines.id = executions.pipeline_id
        LEFT JOIN task_sets ON task_sets.id = executions.task_set_id
        ${where}
        ORDER BY started_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);
      const total = db.prepare(`SELECT COUNT(*) AS count FROM executions ${where}`).get(...countParams).count;
      return {
        data: rows,
        pagination: { page, limit, total },
      };
    },

    getExecution(id) {
      const execution = db.prepare('SELECT * FROM executions WHERE id = ?').get(id);
      if (!execution) return null;
      const steps = db.prepare(`
        SELECT step_index, step_name, role, model, status, input_tokens, output_tokens, cost,
               elapsed_sec, output_text, output_path, error_message, review_score, retry_count,
               started_at, finished_at
        FROM execution_steps
        WHERE execution_id = ?
        ORDER BY step_index ASC
      `).all(id);
      return { ...execution, steps };
    },

    getExecutionStepOutput(executionId, stepIndex) {
      return db.prepare(`
        SELECT step_index, step_name, output_text, output_path
        FROM execution_steps
        WHERE execution_id = ? AND step_index = ?
      `).get(executionId, stepIndex);
    },

    getMonthlyStats({ year, month }) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const execution = db.prepare(`
        SELECT
          COALESCE(SUM(total_tokens), 0) AS total_tokens,
          COALESCE(SUM(total_cost), 0) AS total_cost,
          COUNT(*) AS execution_count
        FROM executions
        WHERE substr(started_at, 1, 7) = ?
      `).get(monthKey);
      const byModel = db.prepare(`
        SELECT model, COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens, COALESCE(SUM(cost), 0) AS cost
        FROM execution_steps
        WHERE substr(COALESCE(started_at, finished_at, ''), 1, 7) = ?
        GROUP BY model
        ORDER BY cost DESC, tokens DESC
      `).all(monthKey);
      return { ...execution, by_model: byModel };
    },

    getModelStats() {
      return db.prepare(`
        SELECT model, COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens, COALESCE(SUM(cost), 0) AS cost, COUNT(*) AS step_count
        FROM execution_steps
        GROUP BY model
        ORDER BY cost DESC, tokens DESC
      `).all();
    },

    getSettings() {
      const rows = db.prepare('SELECT key, value FROM settings ORDER BY key ASC').all();
      return Object.fromEntries(rows.map((row) => [row.key, row.value]));
    },

    upsertSettings(payload) {
      const insert = db.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      const tx = db.transaction((entries) => {
        entries.forEach(([key, value]) => {
          insert.run(key, String(value ?? ''));
        });
      });
      tx(Object.entries(payload));
      return this.getSettings();
    },
  };

  return api;
}
