'use client';

import { useMemo, useRef, useState } from 'react';
import { Plus, Play, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ExecutionSubscriber } from '@/components/common/execution-subscriber';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiGet, apiPost } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { ExecutionDetail, TaskSetRecord } from '@/lib/types';
import { formatCurrency, formatNumber, statusLabel } from '@/lib/utils';

type TaskRow = {
  id: string;
  file: string;
  do: string;
  model: string;
  line?: number;
  codebase?: string;
  selected: boolean;
};

const emptyTask = {
  file: '',
  do: '',
  model: 'gemini',
  line: undefined as number | undefined,
  codebase: '',
};

export default function TasksPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskSets = useAppStore((state) => state.taskSets);
  const setTaskSets = useAppStore((state) => state.setTaskSets);
  const setExecutionDetail = useAppStore((state) => state.setExecutionDetail);
  const setCurrentExecution = useAppStore((state) => state.setCurrentExecution);
  const executionDetails = useAppStore((state) => state.executionDetails);

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [draftTask, setDraftTask] = useState(emptyTask);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [stepIndexByTaskId, setStepIndexByTaskId] = useState<Record<string, number>>({});

  const activeExecution = activeExecutionId ? executionDetails[activeExecutionId] : null;

  const summary = useMemo(() => {
    if (!activeExecution) return null;
    return {
      completed: activeExecution.steps.filter((step) => step.status === 'completed').length,
      running: activeExecution.steps.filter((step) => step.status === 'running').length,
      pending: activeExecution.steps.filter((step) => step.status === 'pending').length,
      failed: activeExecution.steps.filter((step) => step.status === 'failed').length,
    };
  }, [activeExecution]);

  const importJson = async (file: File) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await apiPost<TaskSetRecord>('/task-sets/import', form);
      setTaskSets([response.data, ...taskSets]);
      setRows(
        response.data.tasks.map((task, index) => ({
          id: `task-${index}-${Date.now()}`,
          file: String(task.file || ''),
          do: String(task.do || ''),
          model: String(task.model || 'gemini'),
          line: typeof task.line === 'number' ? task.line : undefined,
          codebase: String(task.codebase || ''),
          selected: true,
        }))
      );
      toast.success('태스크 JSON을 가져왔습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '가져오기 실패');
    }
  };

  const addTask = () => {
    if (!draftTask.file || !draftTask.do) {
      toast.error('파일 경로와 수정 내용을 입력해 주세요.');
      return;
    }
    setRows((current) => [
      ...current,
      {
        id: `task-${Date.now()}`,
        file: draftTask.file,
        do: draftTask.do,
        model: draftTask.model,
        line: draftTask.line,
        codebase: draftTask.codebase,
        selected: true,
      },
    ]);
    setDraftTask(emptyTask);
  };

  const runSelected = async () => {
    const selectedRows = rows.filter((row) => row.selected);
    if (selectedRows.length === 0) {
      toast.error('실행할 태스크를 선택해 주세요.');
      return;
    }

    try {
      const payload = {
        tasks: selectedRows.map((row) => ({
          file: row.file,
          do: row.do,
          model: row.model,
          line: row.line,
          codebase: row.codebase,
        })),
      };
      const execution = await apiPost<{ executionId: string }>('/executions/file', payload);
      const detail = await apiGet<ExecutionDetail>(`/executions/${execution.data.executionId}`);
      setExecutionDetail(detail.data);
      setCurrentExecution(execution.data.executionId);
      setActiveExecutionId(execution.data.executionId);
      setStepIndexByTaskId(
        Object.fromEntries(selectedRows.map((row, index) => [row.id, index]))
      );
      toast.success('태스크 실행을 시작했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '태스크 실행 실패');
    }
  };

  return (
    <div className="space-y-6">
      {activeExecutionId ? <ExecutionSubscriber executionId={activeExecutionId} /> : null}
      <PageHeader
        eyebrow="Tasks"
        title="빠른 태스크"
        description="JSON import 또는 인라인 편집으로 태스크를 구성하고 선택 실행할 수 있습니다."
        actions={
          <>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              JSON 가져오기
            </Button>
            <Button variant="secondary" onClick={addTask}>
              <Plus className="mr-2 h-4 w-4" />
              태스크 추가
            </Button>
            <Button onClick={() => void runSelected()}>
              <Play className="mr-2 h-4 w-4" />
              선택 실행
            </Button>
          </>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importJson(file);
        }}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">선택</th>
                <th className="px-4 py-3">파일</th>
                <th className="px-4 py-3">수정 내용</th>
                <th className="px-4 py-3">모델</th>
                <th className="px-4 py-3">줄</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-background/60">
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"><Input value={draftTask.file} onChange={(event) => setDraftTask((current) => ({ ...current, file: event.target.value }))} placeholder="src/file.ts" /></td>
                <td className="px-4 py-3"><Input value={draftTask.do} onChange={(event) => setDraftTask((current) => ({ ...current, do: event.target.value }))} placeholder="수정할 내용" /></td>
                <td className="px-4 py-3"><Input value={draftTask.model} onChange={(event) => setDraftTask((current) => ({ ...current, model: event.target.value }))} /></td>
                <td className="px-4 py-3"><Input type="number" value={draftTask.line || ''} onChange={(event) => setDraftTask((current) => ({ ...current, line: Number(event.target.value) || undefined }))} /></td>
                <td className="px-4 py-3 text-muted-foreground">초안</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="secondary" onClick={addTask}>추가</Button>
                </td>
              </tr>

              {rows.map((row) => {
                const stepIndex = stepIndexByTaskId[row.id];
                const liveStep = typeof stepIndex === 'number' ? activeExecution?.steps[stepIndex] : null;
                return (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, selected: event.target.checked } : item))}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.file}</td>
                    <td className="px-4 py-3">{row.do}</td>
                    <td className="px-4 py-3">{row.model}</td>
                    <td className="px-4 py-3">{row.line || '-'}</td>
                    <td className="px-4 py-3">{liveStep ? statusLabel(liveStep.status) : '대기'}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {summary ? (
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-5 text-sm">
            <div>총 {activeExecution?.steps.length || 0}건</div>
            <div>✅ {summary.completed} 완료</div>
            <div>🔄 {summary.running} 실행중</div>
            <div>⏳ {summary.pending} 대기</div>
            <div>❌ {summary.failed} 실패</div>
            <div>토큰: {formatNumber(activeExecution?.total_tokens || 0)}</div>
            <div>비용: {formatCurrency(activeExecution?.total_cost || 0)}</div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
