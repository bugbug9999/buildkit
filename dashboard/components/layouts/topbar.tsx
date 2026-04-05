'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ActivitySquare } from 'lucide-react';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { ProviderDots } from '@/components/common/provider-dots';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export function Topbar() {
  const providers = useAppStore((state) => state.providers);
  const executions = useAppStore((state) => state.executions);

  const activeExecution = useMemo(
    () => executions.find((item) => item.status === 'running') || null,
    [executions]
  );

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="min-w-0 flex-1">
          {activeExecution ? (
            <div className="flex items-center gap-3 rounded-xl border bg-card/80 px-4 py-3">
              <ActivitySquare className="h-4 w-4 text-warning" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">현재 실행 상태</div>
                <div className="truncate text-sm font-medium">
                  {activeExecution.pipeline_name || activeExecution.task_set_name || activeExecution.id} · {activeExecution.status}
                </div>
              </div>
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/history/${activeExecution.id}`}>상세 보기</Link>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">실행중인 작업이 없습니다.</div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ProviderDots providers={providers} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
