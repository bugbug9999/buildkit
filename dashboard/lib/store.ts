'use client';

import { create } from 'zustand';
import type {
  ExecutionDetail,
  ExecutionListItem,
  ExecutionLogEntry,
  ExecutionStep,
  ModelStats,
  MonthlyStats,
  PipelineRecord,
  ProvidersResponse,
  TaskSetRecord,
} from '@/lib/types';

type ExecutionEventPayload = Record<string, unknown> & {
  executionId: string;
  stepIndex?: number;
  stepName?: string;
  role?: string;
  model?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  elapsed?: number;
  outputText?: string;
  outputPath?: string | null;
  error?: string;
  status?: string;
  totalTokens?: number;
  totalCost?: number;
  message?: string;
  score?: number;
  retryCount?: number;
};

type AppState = {
  providers: ProvidersResponse | null;
  monthlyStats: MonthlyStats | null;
  modelStats: ModelStats;
  executions: ExecutionListItem[];
  executionsPagination: { page: number; limit: number; total: number } | null;
  executionDetails: Record<string, ExecutionDetail>;
  executionLogs: Record<string, ExecutionLogEntry[]>;
  currentExecutionId: string | null;
  pipelines: PipelineRecord[];
  taskSets: TaskSetRecord[];
  setProviders: (providers: ProvidersResponse) => void;
  setMonthlyStats: (stats: MonthlyStats) => void;
  setModelStats: (stats: ModelStats) => void;
  setExecutions: (items: ExecutionListItem[], pagination?: { page: number; limit: number; total: number }) => void;
  upsertExecution: (item: ExecutionListItem) => void;
  setExecutionDetail: (item: ExecutionDetail) => void;
  setCurrentExecution: (executionId: string | null) => void;
  appendLog: (executionId: string, entry: ExecutionLogEntry) => void;
  applyExecutionEvent: (type: string, payload: ExecutionEventPayload) => void;
  setPipelines: (items: PipelineRecord[]) => void;
  setTaskSets: (items: TaskSetRecord[]) => void;
};

function mergeStep(step: ExecutionStep, payload: ExecutionEventPayload): ExecutionStep {
  return {
    ...step,
    step_name: (payload.stepName as string) || step.step_name,
    role: (payload.role as string) || step.role,
    model: (payload.model as string) || step.model,
    status: (payload.status as string) || step.status,
    input_tokens: Number(payload.inputTokens ?? step.input_tokens),
    output_tokens: Number(payload.outputTokens ?? step.output_tokens),
    cost: Number(payload.cost ?? step.cost),
    elapsed_sec: Number(payload.elapsed ?? step.elapsed_sec),
    output_text: (payload.outputText as string) ?? step.output_text,
    output_path: (payload.outputPath as string | null) ?? step.output_path,
    error_message: (payload.error as string) ?? step.error_message,
    review_score: typeof payload.score === 'number' ? payload.score : step.review_score,
    retry_count: typeof payload.retryCount === 'number' ? payload.retryCount : step.retry_count,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  providers: null,
  monthlyStats: null,
  modelStats: [],
  executions: [],
  executionsPagination: null,
  executionDetails: {},
  executionLogs: {},
  currentExecutionId: null,
  pipelines: [],
  taskSets: [],
  setProviders: (providers) => set({ providers }),
  setMonthlyStats: (monthlyStats) => set({ monthlyStats }),
  setModelStats: (modelStats) => set({ modelStats }),
  setExecutions: (executions, executionsPagination) =>
    set({
      executions,
      executionsPagination: executionsPagination || null,
      currentExecutionId:
        executions.find((item) => item.status === 'running')?.id ||
        get().currentExecutionId,
    }),
  upsertExecution: (item) =>
    set((state) => {
      const existing = state.executions.filter((execution) => execution.id !== item.id);
      return { executions: [item, ...existing] };
    }),
  setExecutionDetail: (item) =>
    set((state) => ({
      executionDetails: {
        ...state.executionDetails,
        [item.id]: item,
      },
    })),
  setCurrentExecution: (currentExecutionId) => set({ currentExecutionId }),
  appendLog: (executionId, entry) =>
    set((state) => ({
      executionLogs: {
        ...state.executionLogs,
        [executionId]: [...(state.executionLogs[executionId] || []), entry].slice(-200),
      },
    })),
  applyExecutionEvent: (type, payload) =>
    set((state) => {
      const executionId = payload.executionId;
      const detail = state.executionDetails[executionId];
      const nextDetails = { ...state.executionDetails };
      const nextExecutions = [...state.executions];
      const executionIndex = nextExecutions.findIndex((item) => item.id === executionId);

      const touchExecution = (partial: Partial<ExecutionDetail>) => {
        if (!detail) return;
        nextDetails[executionId] = { ...detail, ...partial };
        if (executionIndex >= 0) {
          nextExecutions[executionIndex] = { ...nextExecutions[executionIndex], ...partial };
        }
      };

      if (type === 'step:progress' && typeof payload.stepIndex === 'number' && typeof payload.message === 'string') {
        const logs = [...(state.executionLogs[executionId] || []), {
          stepIndex: payload.stepIndex,
          message: payload.message,
          timestamp: new Date().toISOString(),
        }];
        return {
          executionLogs: {
            ...state.executionLogs,
            [executionId]: logs.slice(-200),
          },
        };
      }

      if (detail && typeof payload.stepIndex === 'number') {
        const stepIndex = payload.stepIndex;
        const steps = [...detail.steps];
        const current = steps[stepIndex];
        if (current) {
          steps[stepIndex] = mergeStep(current, payload);
        }

        if (type === 'step:started') {
          steps[stepIndex] = mergeStep(current, { ...payload, status: 'running' });
        }
        if (type === 'step:completed') {
          steps[stepIndex] = mergeStep(current, { ...payload, status: 'completed' });
        }
        if (type === 'step:failed') {
          steps[stepIndex] = mergeStep(current, { ...payload, status: 'failed' });
        }
        if (type === 'step:retrying') {
          steps[stepIndex] = mergeStep(current, { ...payload, status: 'retrying' });
        }

        touchExecution({
          steps,
          total_tokens: Number(payload.totalTokens ?? detail.total_tokens),
          total_cost: Number(payload.totalCost ?? detail.total_cost),
        });
      }

      if (type === 'execution:completed' || type === 'execution:failed' || type === 'execution:cancelled') {
        const status = type === 'execution:completed'
          ? String(payload.status || 'completed')
          : type === 'execution:failed'
            ? 'failed'
            : 'cancelled';
        touchExecution({
          status,
          total_tokens: Number(payload.totalTokens ?? detail?.total_tokens ?? 0),
          total_cost: Number(payload.totalCost ?? detail?.total_cost ?? 0),
          error_message: (payload.error as string) ?? detail?.error_message ?? null,
          finished_at: new Date().toISOString(),
        });
      }

      return {
        executionDetails: nextDetails,
        executions: nextExecutions,
      };
    }),
  setPipelines: (pipelines) => set({ pipelines }),
  setTaskSets: (taskSets) => set({ taskSets }),
}));
