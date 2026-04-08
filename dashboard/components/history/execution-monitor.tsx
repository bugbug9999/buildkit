'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PauseCircle, RotateCcw } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { ExecutionSubscriber } from '@/components/common/execution-subscriber';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet, apiPost } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { ExecutionDetail, ExecutionLogEntry } from '@/lib/types';
import { formatCurrency, formatDuration, formatNumber, statusLabel } from '@/lib/utils';

function useExecutionDetail(executionId: string) {
  const detailRef = useRef<ExecutionDetail | null>(null);
  const logsRef = useRef<ExecutionLogEntry[]>([]);

  const detail = useAppStore((state) => {
    const d = state.executionDetails[executionId];
    if (d !== undefined) detailRef.current = d;
    return detailRef.current;
  });

  const logs = useAppStore((state) => {
    const l = state.executionLogs[executionId];
    if (l !== undefined) logsRef.current = l;
    return logsRef.current;
  });

  return { detail, logs };
}

export function ExecutionMonitor() {
  const params = useParams<{ id: string }>();
  const executionId = params.id;
  const { detail, logs } = useExecutionDetail(executionId);
  const setExecutionDetail = useAppStore((state) => state.setExecutionDetail);
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

  const rerunExecution = async () => {
    if (!detail?.pipeline_id) return;
    try {
      const next = await apiPost<{ executionId: string }>(`/executions/pipeline/${detail.pipeline_id}`);
      window.location.href = `/history/${next.data.executionId}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '재실행 실패');
    }
  };

  useEffect(() => {
    apiGet<ExecutionDetail>(`/executions/${executionId}`)
      .then((response) => setExecutionDetail(response.data))
      .catch((error) => toast.error(error.message || '실행 상세를 불러오지 못했습니다.'));
  }, [executionId, setExecutionDetail]);

  const progress = useMemo(() => {
    if (!detail?.steps.length) return 0;
    return Math.round((detail.steps.filter((step) => step.status === 'completed').length / detail.steps.length) * 100);
  }, [detail]);

  if (!detail) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">실행 정보를 불러오는 중입니다...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ExecutionSubscriber executionId={executionId} />

      <Card>
        <CardHeader>
          <div className="space-y-3">
            <p className="panel-title">실행 모니터</p>
            <CardTitle>{detail.pipeline_name || detail.task_set_name || detail.id}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>시작: {new Date(detail.started_at).toLocaleString('ko-KR')}</span>
              <Badge tone={detail.status === 'completed' ? 'success' : detail.status === 'failed' ? 'danger' : 'warning'}>
                {statusLabel(detail.status)}
              </Badge>
              <span>{formatNumber(detail.total_tokens)} tokens</span>
              <span>{formatCurrency(detail.total_cost)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => apiPost(`/executions/${detail.id}/cancel`).catch(() => null)}>
              <PauseCircle className="mr-2 h-4 w-4" />
              중지
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {detail.steps.map((step) => {
          const stepLogs = logs.filter((entry) => entry.stepIndex === step.step_index);
          const isOpen = openSteps[step.step_index] ?? step.status === 'running';
          return (
            <Card key={step.step_index} className={step.status === 'failed' ? 'border-danger/40' : ''}>
              <CardHeader>
                <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold">Step {step.step_index + 1}: {step.step_name}</span>
                      <Badge
                        tone={
                          step.status === 'completed'
                            ? 'success'
                            : step.status === 'failed'
                              ? 'danger'
                              : step.status === 'running'
                                ? 'warning'
                                : 'muted'
                        }
                      >
                        {statusLabel(step.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {step.role || 'Step'} · {step.model}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatNumber(step.input_tokens + step.output_tokens)}tk · {formatDuration(step.elapsed_sec)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {step.output_path ? (
                  <div className="text-sm">
                    출력: <span className="font-mono">{step.output_path}</span>
                  </div>
                ) : null}

                {step.status === 'running' ? (
                  <div className="rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs text-slate-100">
                    <div className="mb-2 text-slate-400">실시간 로그</div>
                    <div className="max-h-40 space-y-2 overflow-auto">
                      {stepLogs.length ? stepLogs.map((entry, index) => (
                        <div key={`${entry.timestamp}-${index}`}>&gt; {entry.message}</div>
                      )) : <div className="text-slate-500">로그를 기다리는 중입니다...</div>}
                    </div>
                  </div>
                ) : null}

                {step.review_score !== null ? (
                  <div className="rounded-xl border bg-background/70 p-4">
                    <div className="text-sm font-semibold">리뷰 점수</div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="grid h-20 w-20 place-items-center rounded-full border-8 border-danger/25 text-xl font-semibold">
                        {step.review_score}/10
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {step.review_score >= 7 ? '통과 기준 충족' : '통과 기준 미달'}
                      </div>
                    </div>
                  </div>
                ) : null}

                {step.output_text ? (
                  <div className="rounded-xl border bg-background/70">
                    <button
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                      onClick={() => setOpenSteps((current) => ({ ...current, [step.step_index]: !isOpen }))}
                    >
                      <span>출력 내용 미리보기</span>
                      <span>{isOpen ? '접기 ▴' : '펼치기 ▾'}</span>
                    </button>
                    {isOpen ? (
                      <pre className="max-h-64 overflow-auto border-t px-4 py-3 font-mono text-xs whitespace-pre-wrap">
                        {step.output_text}
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                {step.error_message ? (
                  <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    <div>{step.error_message}</div>
                    {detail.pipeline_id ? (
                      <Button className="mt-3" size="sm" variant="secondary" onClick={() => void rerunExecution()}>
                        재시도
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {detail.status !== 'running' ? (
        <Card>
          <CardHeader>
            <div>
              <p className="panel-title">비용 분석</p>
              <CardTitle>스텝별 토큰/비용 테이블</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 rounded-xl border bg-background/70 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detail.steps}>
                  <XAxis dataKey="step_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                  <Bar dataKey="cost" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-2 py-3">스텝</th>
                    <th className="px-2 py-3">모델</th>
                    <th className="px-2 py-3">In</th>
                    <th className="px-2 py-3">Out</th>
                    <th className="px-2 py-3">비용</th>
                    <th className="px-2 py-3">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.steps.map((step) => (
                    <tr key={step.step_index} className="border-b last:border-b-0">
                      <td className="px-2 py-3">{step.step_name}</td>
                      <td className="px-2 py-3">{step.model}</td>
                      <td className="px-2 py-3">{formatNumber(step.input_tokens)}</td>
                      <td className="px-2 py-3">{formatNumber(step.output_tokens)}</td>
                      <td className="px-2 py-3">{formatCurrency(step.cost)}</td>
                      <td className="px-2 py-3">{formatDuration(step.elapsed_sec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" asChild>
                <Link href="/">대시보드로</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
