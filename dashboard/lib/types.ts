export type ProviderStatus = {
  available: boolean;
  mode: string | null;
  cli_path?: string | null;
  models: string[];
};

export type ProvidersResponse = {
  claude: ProviderStatus;
  gemini: ProviderStatus;
  openai: ProviderStatus;
};

export type ExecutionListItem = {
  id: string;
  pipeline_id: string | null;
  task_set_id: string | null;
  mode: 'pipeline' | 'task';
  status: string;
  total_tokens: number;
  total_cost: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  pipeline_name?: string | null;
  task_set_name?: string | null;
};

export type ExecutionStep = {
  step_index: number;
  step_name: string;
  role: string | null;
  model: string;
  status: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  elapsed_sec: number;
  output_text: string | null;
  output_path: string | null;
  error_message: string | null;
  review_score: number | null;
  retry_count: number;
  started_at: string | null;
  finished_at: string | null;
};

export type ExecutionDetail = ExecutionListItem & {
  steps: ExecutionStep[];
};

export type MonthlyStats = {
  total_tokens: number;
  total_cost: number;
  execution_count: number;
  by_model: Array<{ model: string; tokens: number; cost: number }>;
};

export type ModelStats = Array<{ model: string; tokens: number; cost: number; step_count: number }>;

export type PipelineRecord = {
  id: string;
  name: string;
  description: string | null;
  codebase: string;
  steps: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
};

export type TaskSetRecord = {
  id: string;
  name: string;
  tasks: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
};

export type ExecutionLogEntry = {
  stepIndex: number;
  message: string;
  timestamp: string;
};
