'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { apiGet } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { ExecutionListItem } from '@/lib/types';
import { formatCurrency, formatNumber, formatRelative, statusLabel } from '@/lib/utils';

export function HistoryList() {
  const executions = useAppStore((state) => state.executions);
  const setExecutions = useAppStore((state) => state.setExecutions);
  const pagination = useAppStore((state) => state.executionsPagination);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'all' | 'pipeline' | 'task'>('all');
  const [status, setStatus] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (mode !== 'all') params.set('mode', mode);
    apiGet<ExecutionListItem[]>(`/executions?${params.toString()}`)
      .then((response) => setExecutions(response.data, response.pagination))
      .catch((error) => toast.error(error.message || '실행 목록을 불러오지 못했습니다.'));
  }, [mode, page, setExecutions]);

  const filtered = useMemo(() => {
    return status === 'all' ? executions : executions.filter((item) => item.status === status);
  }, [executions, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="History"
        title="실행 이력"
        description="파이프라인과 태스크 실행 이력을 페이지네이션 테이블로 확인합니다."
        actions={
          <>
            <Select
              value={mode}
              onChange={(value) => setMode(value as 'all' | 'pipeline' | 'task')}
              options={[
                { value: 'all', label: '전체 모드' },
                { value: 'pipeline', label: 'Pipeline' },
                { value: 'task', label: 'Task' },
              ]}
            />
            <Select
              value={status}
              onChange={(value) => setStatus(value as 'all' | 'running' | 'completed' | 'failed')}
              options={[
                { value: 'all', label: '전체 상태' },
                { value: 'running', label: '실행중' },
                { value: 'completed', label: '완료' },
                { value: 'failed', label: '실패' },
              ]}
            />
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">모드</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">토큰</th>
                  <th className="px-4 py-3">비용</th>
                  <th className="px-4 py-3">일시</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((execution) => (
                  <tr key={execution.id} className="border-b last:border-b-0">
                    <td className="px-4 py-4 font-medium">
                      <Link href={`/history/${execution.id}`} className="hover:text-primary">
                        {execution.pipeline_name || execution.task_set_name || execution.id}
                      </Link>
                    </td>
                    <td className="px-4 py-4">{execution.mode}</td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={
                          execution.status === 'completed'
                            ? 'success'
                            : execution.status === 'failed'
                              ? 'danger'
                              : execution.status === 'running'
                                ? 'warning'
                                : 'muted'
                        }
                      >
                        {statusLabel(execution.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">{formatNumber(execution.total_tokens)}</td>
                    <td className="px-4 py-4">{formatCurrency(execution.total_cost)}</td>
                    <td className="px-4 py-4 text-muted-foreground">{formatRelative(execution.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-4 text-sm text-muted-foreground">
            <span>총 {pagination?.total || filtered.length}건</span>
            <div className="flex items-center gap-2">
              <button className="rounded-md border px-3 py-1.5" onClick={() => setPage((value) => Math.max(1, value - 1))}>
                이전
              </button>
              <span>{page}</span>
              <button
                className="rounded-md border px-3 py-1.5"
                onClick={() => setPage((value) => value + 1)}
                disabled={Boolean(pagination && page * pagination.limit >= pagination.total)}
              >
                다음
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
