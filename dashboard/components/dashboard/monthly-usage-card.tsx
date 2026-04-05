'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatNumber } from '@/lib/utils';

export function MonthlyUsageCard() {
  const monthlyStats = useAppStore((state) => state.monthlyStats);
  const modelStats = useAppStore((state) => state.modelStats);
  const totalCost = monthlyStats?.total_cost || 0;
  const pieData = (modelStats.length ? modelStats : monthlyStats?.by_model || []).map((item, index) => ({
    ...item,
    fill: ['#0f766e', '#f59e0b', '#2563eb', '#ef4444', '#7c3aed'][index % 5],
  }));

  return (
    <Card>
      <CardHeader>
        <div>
          <p className="panel-title">이번 달 사용량</p>
          <CardTitle>토큰과 비용</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-background/70 p-3">
            <div className="text-xs text-muted-foreground">총 토큰</div>
            <div className="mt-2 text-xl font-semibold">{formatNumber(monthlyStats?.total_tokens || 0)}</div>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <div className="text-xs text-muted-foreground">총 비용</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrency(totalCost)}</div>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <div className="text-xs text-muted-foreground">실행 수</div>
            <div className="mt-2 text-xl font-semibold">{formatNumber(monthlyStats?.execution_count || 0)}</div>
          </div>
        </div>

        <div className="grid grid-cols-[180px_1fr] gap-4 rounded-2xl border bg-background/70 p-4">
          <div className="grid place-items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="cost" nameKey="model" innerRadius={46} outerRadius={72} paddingAngle={4}>
                  {pieData.map((entry) => (
                    <Cell key={entry.model} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {pieData.map((entry) => (
              <div key={entry.model} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                  {entry.model}
                </div>
                <div className="text-muted-foreground">
                  {formatNumber(entry.tokens)}tk · {formatCurrency(entry.cost)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
