'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { apiGet, apiPost } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { ExecutionDetail } from '@/lib/types';

export function QuickRunPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const pipelines = useAppStore((state) => state.pipelines);
  const setExecutionDetail = useAppStore((state) => state.setExecutionDetail);
  const setCurrentExecution = useAppStore((state) => state.setCurrentExecution);
  const [selectedId, setSelectedId] = useState<string>(pipelines[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const startExecution = async (executionId: string) => {
    const detail = await apiGet<ExecutionDetail>(`/executions/${executionId}`);
    setExecutionDetail(detail.data);
    setCurrentExecution(executionId);
    router.push(`/history/${executionId}`);
  };

  const runSelected = async () => {
    if (!selectedId) {
      toast.error('실행할 파이프라인을 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost<{ executionId: string }>(`/executions/pipeline/${selectedId}`);
      await startExecution(response.data.executionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '실행을 시작하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const runImportedFile = async (file: File) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await apiPost<{ executionId: string }>('/executions/file', form);
      await startExecution(response.data.executionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '파일 실행에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <p className="panel-title">빠른 실행</p>
          <CardTitle>파이프라인 또는 JSON 실행</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedId}
          onChange={setSelectedId}
          options={pipelines.map((pipeline) => ({ value: pipeline.id, label: pipeline.name }))}
        />
        <Button className="w-full" onClick={runSelected} disabled={loading}>
          <Play className="mr-2 h-4 w-4" />
          실행
        </Button>
        <Button className="w-full" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
          <FileUp className="mr-2 h-4 w-4" />
          JSON 파일 열기
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void runImportedFile(file);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
