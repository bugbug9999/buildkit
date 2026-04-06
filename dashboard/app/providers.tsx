'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster, toast } from 'sonner';
import { apiGet } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAppStore } from '@/lib/store';
import type { ExecutionDetail, ExecutionListItem, ModelStats, MonthlyStats, PipelineRecord, ProvidersResponse, TaskSetRecord } from '@/lib/types';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const setProviders = useAppStore((state) => state.setProviders);
  const setMonthlyStats = useAppStore((state) => state.setMonthlyStats);
  const setModelStats = useAppStore((state) => state.setModelStats);
  const setExecutions = useAppStore((state) => state.setExecutions);
  const setPipelines = useAppStore((state) => state.setPipelines);
  const setTaskSets = useAppStore((state) => state.setTaskSets);
  const setExecutionDetail = useAppStore((state) => state.setExecutionDetail);
  const applyExecutionEvent = useAppStore((state) => state.applyExecutionEvent);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      const errors: string[] = [];

      try {
        const providers = await apiGet<ProvidersResponse>('/providers/status');
        if (mounted) setProviders(providers.data);
      } catch (e) { errors.push(`providers: ${e instanceof Error ? e.message : e}`); }

      try {
        const stats = await apiGet<MonthlyStats>('/stats/monthly');
        if (mounted) setMonthlyStats(stats.data);
      } catch (e) { errors.push(`stats: ${e instanceof Error ? e.message : e}`); }

      try {
        const modelStats = await apiGet<ModelStats>('/stats/by-model');
        if (mounted) setModelStats(modelStats.data);
      } catch (e) { errors.push(`modelStats: ${e instanceof Error ? e.message : e}`); }

      try {
        const executions = await apiGet<ExecutionListItem[]>('/executions?page=1&limit=20');
        if (mounted) {
          setExecutions(executions.data, executions.pagination);
          const running = executions.data.find((item) => item.status === 'running');
          if (running) {
            apiGet<ExecutionDetail>(`/executions/${running.id}`)
              .then((detail) => { if (mounted) setExecutionDetail(detail.data); })
              .catch(() => null);
          }
        }
      } catch (e) { errors.push(`executions: ${e instanceof Error ? e.message : e}`); }

      try {
        const pipelines = await apiGet<PipelineRecord[]>('/pipelines');
        if (mounted) setPipelines(pipelines.data);
      } catch (e) { errors.push(`pipelines: ${e instanceof Error ? e.message : e}`); }

      try {
        const taskSets = await apiGet<TaskSetRecord[]>('/task-sets');
        if (mounted) setTaskSets(taskSets.data);
      } catch (e) { errors.push(`taskSets: ${e instanceof Error ? e.message : e}`); }

      if (errors.length > 0) {
        console.error('[BuildKit] Init errors:', errors);
        toast.error(`데이터 로딩 실패 (${errors.length}건): ${errors[0]}`);
      }
    }

    loadInitialData();

    const socket = getSocket();
    const eventNames = [
      'execution:started',
      'step:started',
      'step:progress',
      'step:token-update',
      'step:completed',
      'step:failed',
      'step:retrying',
      'step:verify-result',
      'step:review-score',
      'execution:completed',
      'execution:failed',
      'execution:cancelled',
    ] as const;

    eventNames.forEach((eventName) => {
      socket.on(eventName, (payload) => applyExecutionEvent(eventName, payload));
    });

    return () => {
      mounted = false;
      eventNames.forEach((eventName) => socket.off(eventName));
    };
  }, [applyExecutionEvent, setExecutionDetail, setExecutions, setModelStats, setMonthlyStats, setPipelines, setProviders, setTaskSets]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
