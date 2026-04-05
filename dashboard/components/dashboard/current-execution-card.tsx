'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { ExecutionSubscriber } from '@/components/common/execution-subscriber';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiPost } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDuration, formatNumber, statusLabel } from '@/lib/utils';

export function CurrentExecutionCard() {
  const currentExecutionId = useAppStore((state) => state.currentExecutionId);
  const executionDetails = useAppStore((state) => state.executionDetails);
  const executions = useAppStore((state) => state.executions);
  const logs = useAppStore((state) => state.executionLogs);

  const activeExecution = useMemo(() => {
    if (currentExecutionId && executionDetails[currentExecutionId]) {
      return executionDetails[currentExecutionId];
    }

    const fallback = executions.find((item) => item.status === 'running');
    return fallback ? executionDetails[fallback.id] || null : null;
  }, [currentExecutionId, executionDetails, executions]);

  if (!activeExecution) {
    return (
      <Card className="min-h-[340px]">
        <CardHeader>
          <div>
            <p className="panel-title">현재 실행</p>
            <CardTitle>실행중인 파이프라인이 없습니다</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
          빠른 실행 패널에서 파이프라인을 시작하면 이 카드에서 실시간 상태를 볼 수 있습니다.
        </CardContent>
      </Card>
    );
  }

  const completedSteps = activeExecution.steps.filter((step) => step.status === 'completed').length;
  const totalSteps = activeExecution.steps.length || 1;
  const progress = Math.round((completedSteps / totalSteps) * 100);
  const recentLogs = (logs[activeExecution.id] || []).slice(-10);

  return (
    <Card className="overflow-hidden">
      <ExecutionSubscriber executionId={activeExecution.id} />
      <CardHeader className="border-b">
        <div className="space-y-2">
          <p className="panel-title">현재 실행</p>
          <CardTitle>{activeExecution.pipeline_name || activeExecution.task_set_name || activeExecution.id}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone={activeExecution.status === 'running' ? 'warning' : 'default'}>{statusLabel(activeExecution.status)}</Badge>
            <span>{completedSteps}/{totalSteps} steps</span>
            <span>{formatNumber(activeExecution.total_tokens)} tokens</span>
            <span>{formatCurrency(activeExecution.total_cost)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">{progress}% 진행중</p>
        </div>

        <div className="grid gap-3">
          {activeExecution.steps.map((step) => (
            <div key={step.step_index} className="flex items-center justify-between rounded-xl border bg-background/70 px-4 py-3">
              <div className="space-y-1">
                <div className="font-medium">{step.step_name}</div>
                <div className="text-xs text-muted-foreground">
                  {step.role || 'Step'} · {step.model}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{statusLabel(step.status)}</div>
                <div>{step.status === 'completed' ? `${formatNumber(step.input_tokens + step.output_tokens)}tk · ${formatDuration(step.elapsed_sec)}` : '-'}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs text-slate-100">
          <div className="mb-2 flex items-center gap-2 text-slate-400">
            <PlayCircle className="h-4 w-4" />
            실시간 로그
          </div>
          <div className="max-h-44 space-y-2 overflow-auto">
            {recentLogs.length ? recentLogs.map((entry, index) => (
              <div key={`${entry.timestamp}-${index}`} className="whitespace-pre-wrap">
                &gt; {entry.message}
              </div>
            )) : <div className="text-slate-500">아직 수신된 로그가 없습니다.</div>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => apiPost(`/executions/${activeExecution.id}/cancel`).catch(() => null)}
          >
            <PauseCircle className="mr-2 h-4 w-4" />
            중지
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/history/${activeExecution.id}`}>상세보기</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
