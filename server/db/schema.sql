-- 파이프라인 정의
CREATE TABLE IF NOT EXISTS pipelines (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  codebase    TEXT NOT NULL,
  steps_json  TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 태스크 세트
CREATE TABLE IF NOT EXISTS task_sets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tasks_json  TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 실행 이력
CREATE TABLE IF NOT EXISTS executions (
  id            TEXT PRIMARY KEY,
  pipeline_id   TEXT,
  task_set_id   TEXT,
  mode          TEXT NOT NULL,
  status        TEXT NOT NULL,
  total_tokens  INTEGER DEFAULT 0,
  total_cost    REAL DEFAULT 0,
  started_at    TEXT DEFAULT (datetime('now')),
  finished_at   TEXT,
  error_message TEXT,
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
  FOREIGN KEY (task_set_id) REFERENCES task_sets(id)
);

-- 스텝 실행 이력
CREATE TABLE IF NOT EXISTS execution_steps (
  id            TEXT PRIMARY KEY,
  execution_id  TEXT NOT NULL,
  step_index    INTEGER NOT NULL,
  step_name     TEXT NOT NULL,
  role          TEXT,
  model         TEXT NOT NULL,
  status        TEXT NOT NULL,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost          REAL DEFAULT 0,
  elapsed_sec   REAL DEFAULT 0,
  output_text   TEXT,
  output_path   TEXT,
  error_message TEXT,
  review_score  INTEGER,
  retry_count   INTEGER DEFAULT 0,
  started_at    TEXT,
  finished_at   TEXT,
  FOREIGN KEY (execution_id) REFERENCES executions(id)
);

-- 설정 (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
