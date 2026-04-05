'use client';

'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatNumber, formatRelative, statusLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RecentExecutionsTable() {
  const executions = useAppStore((state) => state.executions);
  const pagination = useAppStore((state) => state.executionsPagination);

  return (
    <Card>
      <CardHeader>
        <div>
          <p className="panel-title">최근 실행</p>
          <CardTitle>마지막 10건</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="px-2 py-3">이름</th>
                <th className="px-2 py-3">모드</th>
                <th className="px-2 py-3">상태</th>
                <th className="px-2 py-3">토큰</th>
                <th className="px-2 py-3">비용</th>
                <th className="px-2 py-3">일시</th>
              </tr>
            </thead>
            <tbody>
              {executions.slice(0, 10).map((execution) => (
                <tr key={execution.id} className="border-b last:border-b-0">
                  <td className="px-2 py-3 font-medium">
                    <Link href={`/history/${execution.id}`} className="hover:text-primary">
                      {execution.pipeline_name || execution.task_set_name || execution.id}
                    </Link>
                  </td>
                  <td className="px-2 py-3">{execution.mode}</td>
                  <td className="px-2 py-3">
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
                  <td className="px-2 py-3">{formatNumber(execution.total_tokens)}</td>
                  <td className="px-2 py-3">{formatCurrency(execution.total_cost)}</td>
                  <td className="px-2 py-3 text-muted-foreground">{formatRelative(execution.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>총 {pagination?.total || executions.length}건</span>
          <Link href="/history" className="font-medium text-primary">
            전체 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
