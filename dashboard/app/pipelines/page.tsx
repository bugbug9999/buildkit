'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { ExecutionDetail, PipelineRecord } from '@/lib/types';
import { formatRelative } from '@/lib/utils';

export default function PipelinesPage() {
  const router = useRouter();
  const pipelines = useAppStore((state) => state.pipelines);
  const setPipelines = useAppStore((state) => state.setPipelines);
  const setExecutionDetail = useAppStore((state) => state.setExecutionDetail);
  const setCurrentExecution = useAppStore((state) => state.setCurrentExecution);

  const refresh = () =>
    apiGet<PipelineRecord[]>('/pipelines')
      .then((response) => setPipelines(response.data))
      .catch((error) => toast.error(error.message || '파이프라인 목록을 불러오지 못했습니다.'));

  useEffect(() => {
    if (pipelines.length === 0) void refresh();
  }, [pipelines.length]);

  const runPipeline = async (pipelineId: string) => {
    try {
      const execution = await apiPost<{ executionId: string }>(`/executions/pipeline/${pipelineId}`);
      const detail = await apiGet<ExecutionDetail>(`/executions/${execution.data.executionId}`);
      setExecutionDetail(detail.data);
      setCurrentExecution(execution.data.executionId);
      router.push(`/history/${execution.data.executionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '실행 실패');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipelines"
        title="파이프라인"
        description="카드 그리드에서 저장된 파이프라인을 실행, 편집, 복제, 삭제할 수 있습니다."
        actions={
          <>
            <Button asChild>
              <Link href="/pipelines/new">
                <Plus className="mr-2 h-4 w-4" />
                새 파이프라인
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pipelines/new">JSON 가져오기</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id} className="group overflow-hidden">
            <CardHeader>
              <div>
                <p className="panel-title">Pipeline</p>
                <CardTitle className="mt-2">{pipeline.name}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">{pipeline.description || '설명 없음'}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{pipeline.steps.length} steps</span>
                <span>최근: {formatRelative(pipeline.updated_at)}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Array.from(new Set(pipeline.steps.map((step) => String(step.model || '-')))).map((model) => (
                  <span key={model} className="rounded-full bg-muted px-2.5 py-1 font-medium">
                    {model}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                <Button size="icon" variant="secondary" onClick={() => void runPipeline(pipeline.id)}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <Link href={`/pipelines/${pipeline.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => apiPost(`/pipelines/${pipeline.id}/duplicate`).then(refresh).catch((error) => toast.error(error.message))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="danger"
                  onClick={() => apiDelete(`/pipelines/${pipeline.id}`).then(refresh).catch((error) => toast.error(error.message))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardContent className="flex h-full min-h-[220px] items-center justify-center p-8">
            <Button asChild variant="ghost" className="h-full w-full">
              <Link href="/pipelines/new">+ 새 파이프라인</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
