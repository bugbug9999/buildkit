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

    Promise.all([
      apiGet<ProvidersResponse>('/providers/status'),
      apiGet<MonthlyStats>('/stats/monthly'),
      apiGet<ModelStats>('/stats/by-model'),
      apiGet<ExecutionListItem[]>('/executions?page=1&limit=20'),
      apiGet<PipelineRecord[]>('/pipelines'),
      apiGet<TaskSetRecord[]>('/task-sets'),
    ])
      .then(([providers, stats, modelStats, executions, pipelines, taskSets]) => {
        if (!mounted) return;
        setProviders(providers.data);
        setMonthlyStats(stats.data);
        setModelStats(modelStats.data);
        setExecutions(executions.data, executions.pagination);
        setPipelines(pipelines.data);
        setTaskSets(taskSets.data);

        const running = executions.data.find((item) => item.status === 'running');
        if (running) {
          apiGet<ExecutionDetail>(`/executions/${running.id}`)
            .then((detail) => setExecutionDetail(detail.data))
            .catch(() => null);
        }
      })
      .catch((error) => {
        toast.error(error.message || '초기 데이터를 불러오지 못했습니다.');
      });

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
