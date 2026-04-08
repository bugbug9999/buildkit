'use client';

import '@xyflow/react/dist/style.css';

import Link from 'next/link';
import { useMemo, type ComponentType } from 'react';
import {
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { PipelineNode } from '../pipeline-builder/pipeline-node';
import { ExecutionSubscriber } from '@/components/common/execution-subscriber';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiPost } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { ExecutionDetail, ExecutionStep } from '@/lib/types';
import { cn, formatCurrency, formatDuration, formatNumber, statusLabel } from '@/lib/utils';

type FlowStatus = 'pending' | 'running' | 'completed' | 'failed';

type LiveExecutionNodeData = {
  label: string;
  sublabel: string;
  variant: 'start' | 'step' | 'end';
  status?: FlowStatus;
  statusColor?: string;
  statusLabel?: string;
  meta?: string;
  pulse?: boolean;
  icon?: string;
  selected?: boolean;
  invalid?: boolean;
};

function normalizeFlowStatus(status?: string | null): FlowStatus {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'running':
    case 'retrying':
      return 'running';
    case 'failed':
    case 'cancelled':
      return 'failed';
    default:
      return 'pending';
  }
}

function getStatusColor(status: FlowStatus) {
  switch (status) {
    case 'completed':
      return 'hsl(var(--success))';
    case 'running':
      return 'hsl(var(--warning))';
    case 'failed':
      return 'hsl(var(--danger))';
    default:
      return 'hsl(var(--border))';
  }
}

function buildStepMeta(step: ExecutionStep) {
  if (step.status === 'completed') {
    return `${formatNumber(step.input_tokens + step.output_tokens)}tk · ${formatDuration(step.elapsed_sec)}`;
  }

  if (step.status === 'failed') {
    return step.error_message || '오류 발생';
  }

  if (step.status === 'retrying') {
    return step.retry_count > 0 ? `재시도 ${step.retry_count}회` : '재시도 중';
  }

  if (step.status === 'running') {
    return step.elapsed_sec > 0 ? `${formatDuration(step.elapsed_sec)} 경과` : '실행 중';
  }

  return undefined;
}

function getGitCommitState(
  execution: ExecutionDetail,
  gitCommitDone: boolean,
  allStepsCompleted: boolean
): { label: string; status: FlowStatus } {
  if (gitCommitDone) {
    return { label: 'git commit 완료', status: 'completed' };
  }

  if (execution.mode !== 'pipeline') {
    return {
      label: 'git commit 없음',
      status: execution.status === 'completed' ? 'completed' : normalizeFlowStatus(execution.status),
    };
  }

  if (execution.status === 'running') {
    return {
      label: allStepsCompleted ? 'git commit 처리중' : 'git commit 대기',
      status: allStepsCompleted ? 'running' : 'pending',
    };
  }

  if (execution.status === 'completed') {
    return { label: 'git commit 건너뜀', status: 'completed' };
  }

  return { label: 'git commit 생략', status: 'failed' };
}

function getEdgePresentation(sourceStatus: FlowStatus, targetStatus: FlowStatus) {
  if (sourceStatus === 'completed' && targetStatus === 'completed') {
    const color = 'hsl(var(--success))';
    return {
      animated: false,
      color,
      style: { stroke: color, strokeWidth: 2.5 },
    };
  }

  if (targetStatus === 'running') {
    const color = 'hsl(var(--primary))';
    return {
      animated: true,
      color,
      style: { stroke: color, strokeWidth: 2.5, strokeDasharray: '7 6' },
    };
  }

  if (targetStatus === 'failed' || sourceStatus === 'failed') {
    const color = 'hsl(var(--danger))';
    return {
      animated: false,
      color,
      style: { stroke: color, strokeWidth: 2.5 },
    };
  }

  if (sourceStatus === 'running' && targetStatus === 'pending') {
    const color = 'hsl(var(--border))';
    return {
      animated: false,
      color,
      style: { stroke: color, strokeWidth: 2, strokeDasharray: '8 6' },
    };
  }

  if (targetStatus === 'pending') {
    const color = 'hsl(var(--border))';
    return {
      animated: false,
      color,
      style: { stroke: color, strokeWidth: 2, strokeDasharray: '8 6' },
    };
  }

  const color = 'hsl(var(--muted-foreground))';
  return {
    animated: false,
    color,
    style: { stroke: color, strokeWidth: 2 },
  };
}

function LiveExecutionNode(props: NodeProps<LiveExecutionNodeData>) {
  const { data } = props;
  const showStatus = data.variant !== 'start' && Boolean(data.status);
  const status = data.status;

  return (
    <div className="relative">
      {data.pulse && status === 'running' ? (
        <div className="pointer-events-none absolute -inset-2 rounded-[28px] bg-warning/15 blur-md animate-pulse" />
      ) : null}
      <div
        className={cn(
          'relative rounded-[22px] transition-all',
          showStatus && 'p-[2px]'
        )}
        style={showStatus && data.statusColor ? { backgroundColor: data.statusColor } : undefined}
      >
        <div
          className={cn(
            'rounded-[20px]',
            status === 'pending' && data.variant === 'step' && 'opacity-80 text-muted-foreground'
          )}
        >
          <PipelineNode {...(props as NodeProps<any>)} />
        </div>

        {showStatus ? (
          <div
            className={cn(
              'flex items-center gap-2 border-t px-4 py-2 text-xs',
              status === 'running' && 'border-warning/20 text-warning',
              status === 'completed' && 'border-success/20 text-success',
              status === 'failed' && 'border-danger/20 text-danger',
              status === 'pending' && 'border-border/80 text-muted-foreground'
            )}
          >
            <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
              {status === 'running' ? (
                <span className="absolute inset-0 rounded-full bg-warning/40 animate-ping" />
              ) : null}
              <span
                className={cn(
                  'relative inline-flex h-2.5 w-2.5 rounded-full',
                  status === 'pending' && 'bg-muted-foreground/40',
                  status === 'running' && 'bg-warning',
                  status === 'completed' && 'bg-success',
                  status === 'failed' && 'bg-danger'
                )}
              />
            </span>
            <span className="font-medium">{data.statusLabel}</span>
            {data.meta ? <span className="min-w-0 truncate opacity-80">{data.meta}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  pipelineNode: LiveExecutionNode as ComponentType<any>,
};

export function CurrentExecutionCard() {
  const currentExecutionId = useAppStore((state) => state.currentExecutionId);
  const executionDetails = useAppStore((state) => state.executionDetails);
  const executions = useAppStore((state) => state.executions);
  const executionLogs = useAppStore((state) => state.executionLogs);
  const pipelines = useAppStore((state) => state.pipelines);

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
  const logs = executionLogs[activeExecution.id] || [];
  const recentLogs = logs.slice(-10);
  const allStepsCompleted = activeExecution.steps.length > 0 && completedSteps === activeExecution.steps.length;
  const gitCommitDone = logs.some((entry) => entry.message.includes('Git commit 완료'));
  const gitCommitState = getGitCommitState(activeExecution, gitCommitDone, allStepsCompleted);
  const projectName = activeExecution.pipeline_name || activeExecution.task_set_name || activeExecution.id;
  const runtimeCodebase = (activeExecution as ExecutionDetail & { codebase?: string | null }).codebase;
  const pipelineCodebase =
    runtimeCodebase ||
    pipelines.find((item) => item.id === activeExecution.pipeline_id)?.codebase ||
    (activeExecution.mode === 'task' ? 'task set execution' : 'codebase 정보 없음');
  const flowHeight = Math.max(320, (activeExecution.steps.length + 2) * 140);

  const nodes = useMemo<Node<LiveExecutionNodeData>[]>(() => {
    const stepNodes: Node<LiveExecutionNodeData>[] = activeExecution.steps.map((step, index) => {
      const status = normalizeFlowStatus(step.status);

      return {
        id: `step-${step.step_index}`,
        type: 'pipelineNode',
        position: { x: 0, y: (index + 1) * 140 },
        data: {
          label: step.step_name,
          sublabel: `${step.role || 'Step'} · ${step.model}`,
          variant: 'step',
          status,
          statusColor: getStatusColor(status),
          statusLabel: statusLabel(step.status),
          meta: buildStepMeta(step),
          pulse: status === 'running',
        },
        draggable: false,
        selectable: false,
      };
    });

    return [
      {
        id: 'start',
        type: 'pipelineNode',
        position: { x: 0, y: 0 },
        data: {
          label: projectName,
          sublabel: pipelineCodebase,
          variant: 'start',
        },
        draggable: false,
        selectable: false,
      },
      ...stepNodes,
      {
        id: 'end',
        type: 'pipelineNode',
        position: { x: 0, y: (activeExecution.steps.length + 1) * 140 },
        data: {
          label: '끝',
          sublabel: gitCommitState.label,
          variant: 'end',
          status: gitCommitState.status,
          statusColor: getStatusColor(gitCommitState.status),
          statusLabel: statusLabel(activeExecution.status),
          meta: `${completedSteps}/${activeExecution.steps.length} steps`,
          pulse: gitCommitState.status === 'running',
        },
        draggable: false,
        selectable: false,
      },
    ];
  }, [
    activeExecution.status,
    activeExecution.steps,
    completedSteps,
    gitCommitState.label,
    gitCommitState.status,
    pipelineCodebase,
    projectName,
  ]);

  const edges = useMemo<Edge[]>(() => {
    const nodeStatuses = new Map<string, FlowStatus>([['start', 'completed']]);

    activeExecution.steps.forEach((step) => {
      nodeStatuses.set(`step-${step.step_index}`, normalizeFlowStatus(step.status));
    });

    nodeStatuses.set('end', gitCommitState.status);

    const chain = activeExecution.steps.length
      ? ['start', ...activeExecution.steps.map((step) => `step-${step.step_index}`), 'end']
      : ['start', 'end'];

    return chain.slice(0, -1).map((source, index) => {
      const target = chain[index + 1];
      const sourceStatus = nodeStatuses.get(source) || 'pending';
      const targetStatus = nodeStatuses.get(target) || 'pending';
      const presentation = getEdgePresentation(sourceStatus, targetStatus);

      return {
        id: `edge-${source}-${target}`,
        source,
        target,
        animated: presentation.animated,
        markerEnd: { type: MarkerType.ArrowClosed, color: presentation.color },
        style: presentation.style,
        selectable: false,
        focusable: false,
      };
    });
  }, [activeExecution.steps, gitCommitState.status]);

  return (
    <Card className="overflow-hidden">
      <ExecutionSubscriber executionId={activeExecution.id} />
      <CardHeader className="border-b">
        <div className="space-y-2">
          <p className="panel-title">현재 실행</p>
          <CardTitle>{projectName}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone={activeExecution.status === 'running' ? 'warning' : 'default'}>
              {statusLabel(activeExecution.status)}
            </Badge>
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

        <div
          className="overflow-hidden rounded-2xl border bg-background/70"
          style={{ height: `${flowHeight}px`, maxHeight: '50vh' }}
        >
          <ReactFlow
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
          </ReactFlow>
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
