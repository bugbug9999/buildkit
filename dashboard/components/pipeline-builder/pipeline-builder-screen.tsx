'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import { Download, FileJson2, Play, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PipelineNode } from '@/components/pipeline-builder/pipeline-node';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import {
  buildFlowEdges,
  buildFlowNodes,
  createDraftFromTemplate,
  createStepDraft,
  draftToExportJson,
  draftToPipelinePayload,
  MODEL_OPTIONS,
  PALETTE_ITEMS,
  pipelineRecordToDraft,
  validateDraft,
  type BuilderStep,
  type BuilderStepType,
  type PipelineDraft,
} from '@/lib/pipeline-builder';
import { useAppStore } from '@/lib/store';
import type { ExecutionDetail, PipelineRecord } from '@/lib/types';

const nodeTypes: NodeTypes = {
  pipelineNode: PipelineNode as ComponentType<any>,
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BuilderInner({ initialDraft }: { initialDraft: PipelineDraft | null }) {
  const router = useRouter();
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const setPipelines = useAppStore((state) => state.setPipelines);
  const setExecutionDetail = useAppStore((state) => state.setExecutionDetail);
  const setCurrentExecution = useAppStore((state) => state.setCurrentExecution);

  const [draft, setDraft] = useState<PipelineDraft>(initialDraft || {
    name: '새 파이프라인',
    description: '',
    codebase: '',
    gitCommit: true,
    steps: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>('start');
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [templateOpen, setTemplateOpen] = useState(!initialDraft);
  const [saving, setSaving] = useState(false);
  const [codebaseValid, setCodebaseValid] = useState<boolean | null>(null);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const nodes = useMemo(() => buildFlowNodes(draft, selectedId, validation.invalidStepIds), [draft, selectedId, validation.invalidStepIds]);
  const edges = useMemo(() => buildFlowEdges(draft), [draft]);

  useEffect(() => {
    if (jsonMode) return;
    setJsonText(JSON.stringify(draftToExportJson(draft), null, 2));
  }, [draft, jsonMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      if (!isMeta) return;
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void savePipeline();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void runPipeline();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    if (!draft.codebase) {
      setCodebaseValid(null);
      return;
    }
    const timer = window.setTimeout(() => {
      apiGet<{ path: string; exists: boolean }>(`/fs/validate?path=${encodeURIComponent(draft.codebase)}`)
        .then((response) => setCodebaseValid(response.data.exists))
        .catch(() => setCodebaseValid(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft.codebase]);

  const selectedStep = useMemo(() => draft.steps.find((step) => step.id === selectedId) || null, [draft, selectedId]);

  const refreshPipelines = async () => {
    const pipelines = await apiGet<PipelineRecord[]>('/pipelines');
    setPipelines(pipelines.data);
  };

  const updateDraft = (updater: (current: PipelineDraft) => PipelineDraft) => {
    setDraft((current) => updater(current));
  };

  const updateStep = (stepId: string, updater: (step: BuilderStep) => BuilderStep) => {
    updateDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === stepId ? updater(step) : step)),
    }));
  };

  const addStep = (type: BuilderStepType, position?: { x: number; y: number }) => {
    setDraft((current) => {
      const nextStep = createStepDraft(type, position || { x: 280, y: 120 + current.steps.length * 150 });
      const previous = current.steps[current.steps.length - 1];
      if (previous) {
        nextStep.inputRefs = [previous.step];
      }
      return {
        ...current,
        steps: [...current.steps, nextStep],
      };
    });
  };

  const savePipeline = async () => {
    const issues = validateDraft(draft);
    if (issues.invalidStepIds.size || issues.messages.length) {
      toast.error([...issues.messages, issues.invalidStepIds.size ? '필수 입력이 비어 있는 스텝이 있습니다.' : ''].filter(Boolean).join(' '));
      return null;
    }

    const codebaseCheck = await apiGet<{ exists: boolean }>(`/fs/validate?path=${encodeURIComponent(draft.codebase)}`);
    if (!codebaseCheck.data.exists) {
      toast.error('codebase 경로가 존재하지 않습니다.');
      return null;
    }

    setSaving(true);
    try {
      const payload = draftToPipelinePayload(draft);
      const response = draft.id
        ? await apiPut<PipelineRecord>(`/pipelines/${draft.id}`, payload)
        : await apiPost<PipelineRecord>('/pipelines', payload);
      const nextDraft = pipelineRecordToDraft(response.data);
      setDraft(nextDraft);
      await refreshPipelines();
      toast.success('파이프라인을 저장했습니다.');
      if (!draft.id) {
        router.replace(`/pipelines/${response.data.id}`);
      }
      return response.data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const runPipeline = async () => {
    const saved = await savePipeline();
    if (!saved) return;
    const execution = await apiPost<{ executionId: string }>(`/executions/pipeline/${saved.id}`);
    const detail = await apiGet<ExecutionDetail>(`/executions/${execution.data.executionId}`);
    setExecutionDetail(detail.data);
    setCurrentExecution(execution.data.executionId);
    router.push(`/history/${execution.data.executionId}`);
  };

  const onConnect = (connection: Connection) => {
    if (!draft || !connection.source || !connection.target || connection.source === 'start' || connection.target === 'end') return;
    const sourceStep = draft.steps.find((step) => step.id === connection.source);
    const targetStep = draft.steps.find((step) => step.id === connection.target);
    if (!sourceStep || !targetStep || sourceStep.id === targetStep.id) return;

    const nextDraft = {
      ...draft,
      steps: draft.steps.map((step) =>
        step.id === targetStep.id
          ? { ...step, inputRefs: [...new Set([...step.inputRefs, sourceStep.step])], useGitDiff: false }
          : step
      ),
    };

    const nextValidation = validateDraft(nextDraft);
    if (nextValidation.messages.includes('순환 참조가 있습니다.')) {
      toast.error('순환 참조는 허용되지 않습니다.');
      return;
    }

    setDraft(nextDraft);
  };

  const onEdgesDelete = (deletedEdges: Edge[]) => {
    if (!draft) return;
    const nextDraft = {
      ...draft,
      steps: draft.steps.map((step) => {
        const deletingSources = deletedEdges
          .filter((edge) => edge.target === step.id)
          .map((edge) => draft.steps.find((item) => item.id === edge.source)?.step)
          .filter(Boolean) as string[];
        return deletingSources.length
          ? { ...step, inputRefs: step.inputRefs.filter((inputRef) => !deletingSources.includes(inputRef)) }
          : step;
      }),
    };
    setDraft(nextDraft);
  };

  const onNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedId(node.id);
  };

  const parseJsonAndApply = (value: string) => {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      const nextDraft = pipelineRecordToDraft({
        project: parsed.project,
        name: parsed.name,
        description: parsed.description,
        codebase: parsed.codebase,
        steps: parsed.steps || [],
      });
      setDraft(nextDraft);
      setJsonError('');
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON 파싱 오류');
    }
  };

  const createFromImport = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    setDraft(
      pipelineRecordToDraft({
        project: parsed.project,
        name: parsed.name,
        description: parsed.description,
        codebase: parsed.codebase,
        steps: parsed.steps || [],
      })
    );
    setSelectedId('start');
    setTemplateOpen(false);
  };

  return (
    <div className="space-y-6">
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen} title="새 파이프라인 만들기">
        <div className="space-y-4">
          <button className="w-full rounded-2xl border p-5 text-left hover:border-primary" onClick={() => { setDraft(createDraftFromTemplate('fullstack')); setTemplateOpen(false); }}>
            <div className="font-semibold">🏗️ 풀스택 개발</div>
            <div className="mt-1 text-sm text-muted-foreground">UX → 설계 → 백엔드 → 프론트 → 리뷰</div>
          </button>
          <button className="w-full rounded-2xl border p-5 text-left hover:border-primary" onClick={() => { setDraft(createDraftFromTemplate('quickfix')); setTemplateOpen(false); }}>
            <div className="font-semibold">🔧 빠른 수정 + 리뷰</div>
            <div className="mt-1 text-sm text-muted-foreground">코드 생성 → 리뷰</div>
          </button>
          <button className="w-full rounded-2xl border p-5 text-left hover:border-primary" onClick={() => { setDraft(createDraftFromTemplate('planning')); setTemplateOpen(false); }}>
            <div className="font-semibold">📋 기획 전용</div>
            <div className="mt-1 text-sm text-muted-foreground">UX → 설계 → 문서화</div>
          </button>
          <button className="w-full rounded-2xl border p-5 text-left hover:border-primary" onClick={() => { setDraft({ name: '새 파이프라인', description: '', codebase: '', gitCommit: true, steps: [] }); setTemplateOpen(false); }}>
            <div className="font-semibold">📄 빈 캔버스에서 시작</div>
            <div className="mt-1 text-sm text-muted-foreground">스텝을 직접 드래그해서 구성</div>
          </button>
          <label className="block cursor-pointer rounded-2xl border p-5 hover:border-primary">
            <div className="font-semibold">📁 JSON 가져오기</div>
            <div className="mt-1 text-sm text-muted-foreground">기존 pipeline.json 파일 불러오기</div>
            <input type="file" accept="application/json" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void createFromImport(file);
            }} />
          </label>
        </div>
      </Dialog>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border bg-card/70 p-5">
        <div className="min-w-[240px] flex-1">
          <div className="mb-2 text-sm text-muted-foreground">프로젝트 이름</div>
          <Input value={draft.name} onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="min-w-[320px] flex-[1.4]">
          <div className="mb-2 text-sm text-muted-foreground">Codebase 경로</div>
          <Input value={draft.codebase} onChange={(event) => updateDraft((current) => ({ ...current, codebase: event.target.value }))} />
          {codebaseValid === false ? <div className="mt-2 text-xs text-danger">경로가 존재하지 않습니다.</div> : null}
        </div>
        <div className="min-w-[240px] flex-1">
          <div className="mb-2 text-sm text-muted-foreground">설명</div>
          <Input value={draft.description} onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))} />
        </div>
      </div>

      {validation.messages.length ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {validation.messages.join(' ')}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[250px_1fr_320px]">
        <Card className="h-[780px] overflow-hidden">
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <div className="panel-title">스텝 팔레트</div>
            {PALETTE_ITEMS.map((item) => (
              <button
                key={item.type}
                draggable
                onDragStart={(event) => event.dataTransfer.setData('application/buildkit-step', item.type)}
                onClick={() => addStep(item.type)}
                className="flex items-center gap-3 rounded-xl border bg-background/70 px-4 py-3 text-left hover:border-primary"
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.role} · {item.model}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="h-[780px] overflow-hidden">
          <CardContent className="h-full p-0">
            {jsonMode ? (
              <div className="h-full p-4">
                <Textarea
                  className="h-[690px] font-mono text-xs"
                  value={jsonText}
                  onChange={(event) => parseJsonAndApply(event.target.value)}
                />
                <div className="mt-3 text-sm">{jsonError ? <span className="text-danger">{jsonError}</span> : <span className="text-success">유효한 JSON</span>}</div>
              </div>
            ) : (
              <div
                ref={reactFlowRef}
                className="h-full"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const type = event.dataTransfer.getData('application/buildkit-step') as BuilderStepType;
                  if (!type) return;
                  const bounds = reactFlowRef.current?.getBoundingClientRect();
                  const position = bounds
                    ? { x: event.clientX - bounds.left - 120, y: event.clientY - bounds.top - 40 }
                    : undefined;
                  addStep(type, position);
                }}
              >
                <ReactFlow
                  fitView
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onConnect={onConnect}
                  onEdgesDelete={onEdgesDelete}
                  onNodeClick={onNodeClick}
                  onNodeDragStop={(_, node) => {
                    if (node.id === 'start' || node.id === 'end') return;
                    updateStep(node.id, (step) => ({
                      ...step,
                      position: node.position,
                    }));
                  }}
                >
                  <MiniMap />
                  <Controls />
                  <Background />
                </ReactFlow>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-[780px] overflow-hidden">
          <CardContent className="h-full overflow-auto p-4">
            {selectedId === 'start' ? (
              <div className="space-y-4">
                <div className="panel-title">시작 노드</div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">프로젝트 이름</div>
                  <Input value={draft.name} onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">Codebase</div>
                  <Input value={draft.codebase} onChange={(event) => updateDraft((current) => ({ ...current, codebase: event.target.value }))} />
                </div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">설명</div>
                  <Textarea value={draft.description} onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))} />
                </div>
              </div>
            ) : selectedId === 'end' ? (
              <div className="space-y-4">
                <div className="panel-title">끝 노드</div>
                <div className="flex items-center justify-between rounded-xl border bg-background/70 px-4 py-3">
                  <div>
                    <div className="font-medium">git commit</div>
                    <div className="text-xs text-muted-foreground">파이프라인 종료 후 commit 시도</div>
                  </div>
                  <Switch checked={draft.gitCommit} onCheckedChange={(checked) => updateDraft((current) => ({ ...current, gitCommit: checked }))} />
                </div>
              </div>
            ) : selectedStep ? (
              <div className="space-y-4">
                <div className="panel-title">속성 패널</div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">스텝 이름</div>
                  <Input
                    value={selectedStep.step}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      updateDraft((current) => ({
                        ...current,
                        steps: current.steps.map((step) => {
                          if (step.id === selectedStep.id) {
                            return { ...step, step: nextName };
                          }
                          if (step.inputRefs.includes(selectedStep.step)) {
                            return {
                              ...step,
                              inputRefs: step.inputRefs.map((inputRef) => (inputRef === selectedStep.step ? nextName : inputRef)),
                            };
                          }
                          return step;
                        }),
                      }));
                    }}
                  />
                </div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">역할</div>
                  <Input value={selectedStep.role} onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, role: event.target.value }))} />
                </div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">AI 모델</div>
                  <Select
                    value={selectedStep.model}
                    onChange={(value) => updateStep(selectedStep.id, (step) => ({ ...step, model: value }))}
                    options={MODEL_OPTIONS.map((item) => ({ value: item.value, label: `${item.label} · ${item.cost}` }))}
                  />
                </div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">maxTokens</div>
                  <Input
                    type="number"
                    min={1024}
                    max={16384}
                    value={selectedStep.maxTokens}
                    onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, maxTokens: Number(event.target.value) || 4096 }))}
                  />
                </div>
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">프롬프트</div>
                  <Textarea value={selectedStep.prompt} onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, prompt: event.target.value }))} />
                  <div className="mt-2 text-xs text-muted-foreground">{selectedStep.prompt.length}자 / 약 {Math.ceil(selectedStep.prompt.length / 4)} tokens</div>
                </div>
                <div className="space-y-3 rounded-xl border bg-background/70 p-4">
                  <div className="text-sm font-medium">입력 설정</div>
                  <div className="space-y-2 text-sm">
                    {draft.steps.filter((step) => step.id !== selectedStep.id).map((step) => (
                      <label key={step.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStep.inputRefs.includes(step.step)}
                          onChange={(event) =>
                            updateStep(selectedStep.id, (current) => ({
                              ...current,
                              inputRefs: event.target.checked
                                ? [...new Set([...current.inputRefs, step.step])]
                                : current.inputRefs.filter((value) => value !== step.step),
                              useGitDiff: false,
                            }))
                          }
                        />
                        이전 스텝 출력: {step.step}
                      </label>
                    ))}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedStep.useGitDiff}
                        onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, useGitDiff: event.target.checked, inputRefs: event.target.checked ? [] : step.inputRefs }))}
                      />
                      Git Diff
                    </label>
                  </div>
                  <Textarea
                    value={selectedStep.inputFiles.join(', ')}
                    onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, inputFiles: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }))}
                    placeholder="추가 파일 경로를 쉼표로 구분"
                  />
                  <Input
                    value={selectedStep.keywords.join(', ')}
                    onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, keywords: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }))}
                    placeholder="키워드 필터 (쉼표 구분)"
                  />
                </div>
                <div className="space-y-3 rounded-xl border bg-background/70 p-4">
                  <div className="text-sm font-medium">출력 설정</div>
                  <Select
                    value={selectedStep.outputMode}
                    onChange={(value) => updateStep(selectedStep.id, (step) => ({ ...step, outputMode: value as BuilderStep['outputMode'] }))}
                    options={[
                      { value: 'document', label: '문서로 저장' },
                      { value: 'code', label: '코드로 적용' },
                      { value: 'none', label: '없음' },
                    ]}
                  />
                  {selectedStep.outputMode === 'document' ? (
                    <Input value={selectedStep.outputPath} onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, outputPath: event.target.value }))} placeholder="specs/output.md" />
                  ) : null}
                  {selectedStep.outputMode === 'code' ? (
                    <Textarea
                      value={selectedStep.files.join(', ')}
                      onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, files: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }))}
                      placeholder="파일 경로를 쉼표로 구분"
                    />
                  ) : null}
                </div>
                {selectedStep.outputMode === 'code' ? (
                  <div className="space-y-3 rounded-xl border bg-background/70 p-4">
                    <div className="text-sm font-medium">검증 설정</div>
                    <Select
                      value={selectedStep.verify}
                      onChange={(value) => updateStep(selectedStep.id, (step) => ({ ...step, verify: value as BuilderStep['verify'] }))}
                      options={[
                        { value: '', label: '검증 없음' },
                        { value: 'typecheck', label: 'TypeCheck' },
                        { value: 'lint', label: 'Lint' },
                        { value: 'build', label: 'Build' },
                      ]}
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-sm">자동 재시도</div>
                      <Switch checked={selectedStep.retry} onCheckedChange={(checked) => updateStep(selectedStep.id, (step) => ({ ...step, retry: checked }))} />
                    </div>
                  </div>
                ) : null}
                {selectedStep.role.toLowerCase().includes('review') ? (
                  <div className="space-y-3 rounded-xl border bg-background/70 p-4">
                    <div className="text-sm font-medium">리뷰 설정</div>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={selectedStep.pass || 7}
                      onChange={(event) => updateStep(selectedStep.id, (step) => ({ ...step, pass: Number(event.target.value) || 7 }))}
                    />
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-xl border bg-background/70 px-4 py-3">
                  <div>
                    <div className="font-medium">필수 여부</div>
                    <div className="text-xs text-muted-foreground">실패 시 파이프라인 중단</div>
                  </div>
                  <Switch checked={selectedStep.required} onCheckedChange={(checked) => updateStep(selectedStep.id, (step) => ({ ...step, required: checked }))} />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">노드를 선택해 설정을 편집하세요.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card/70 p-4">
        <Button variant="secondary" onClick={() => void savePipeline()} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          저장
        </Button>
        <Button variant="outline" onClick={() => downloadJson(`${draft.name || 'pipeline'}.json`, draftToExportJson(draft))}>
          <Download className="mr-2 h-4 w-4" />
          JSON으로 내보내기
        </Button>
        <Button variant="outline" onClick={() => setJsonMode((value) => !value)}>
          <FileJson2 className="mr-2 h-4 w-4" />
          {jsonMode ? '캔버스로 돌아가기' : 'JSON 보기/편집'}
        </Button>
        <Button className="ml-auto" onClick={() => void runPipeline()} disabled={saving}>
          <Play className="mr-2 h-4 w-4" />
          실행
        </Button>
      </div>
    </div>
  );
}

export function PipelineBuilderScreen({ initialDraft }: { initialDraft: PipelineDraft | null }) {
  return (
    <ReactFlowProvider>
      <BuilderInner initialDraft={initialDraft} />
    </ReactFlowProvider>
  );
}
