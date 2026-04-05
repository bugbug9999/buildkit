import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { PipelineRecord } from '@/lib/types';

export type BuilderStepType =
  | 'ux'
  | 'architecture'
  | 'code'
  | 'review'
  | 'security'
  | 'test'
  | 'custom';

export type BuilderStep = {
  id: string;
  type: BuilderStepType;
  step: string;
  role: string;
  model: string;
  prompt: string;
  inputRefs: string[];
  inputFiles: string[];
  useGitDiff: boolean;
  files: string[];
  keywords: string[];
  outputMode: 'document' | 'code' | 'none';
  outputPath: string;
  verify: '' | 'typecheck' | 'lint' | 'build';
  retry: boolean;
  pass: number | null;
  required: boolean;
  maxTokens: number;
  position: { x: number; y: number };
};

export type PipelineDraft = {
  id?: string;
  name: string;
  description: string;
  codebase: string;
  gitCommit: boolean;
  steps: BuilderStep[];
};

export const MODEL_OPTIONS = [
  { value: 'sonnet', label: 'Claude Sonnet', cost: '$0.003 / 1K' },
  { value: 'opus', label: 'Claude Opus', cost: '$0.015 / 1K' },
  { value: 'gemini', label: 'Gemini', cost: '$0.00125 / 1K' },
  { value: 'gpt-4o', label: 'GPT-4o', cost: '$0.0025 / 1K' },
  { value: 'codex', label: 'Codex', cost: '$0.000 / CLI' },
];

export const PALETTE_ITEMS: Array<{
  type: BuilderStepType;
  label: string;
  icon: string;
  role: string;
  model: string;
}> = [
  { type: 'ux', label: 'UX 기획', icon: '📋', role: 'CPO', model: 'sonnet' },
  { type: 'architecture', label: '아키텍처', icon: '🏗️', role: 'Blueprint', model: 'sonnet' },
  { type: 'code', label: '코드 생성', icon: '💻', role: 'Developer', model: 'gemini' },
  { type: 'review', label: '리뷰', icon: '🔍', role: 'Reviewer', model: 'sonnet' },
  { type: 'security', label: '보안 검토', icon: '🛡️', role: 'Security', model: 'sonnet' },
  { type: 'test', label: '테스트 생성', icon: '🧪', role: 'Tester', model: 'gemini' },
  { type: 'custom', label: '커스텀', icon: '📝', role: 'Custom', model: 'sonnet' },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function createStepDraft(
  type: BuilderStepType,
  position = { x: 240, y: 120 }
): BuilderStep {
  const palette = PALETTE_ITEMS.find((item) => item.type === type) || PALETTE_ITEMS[PALETTE_ITEMS.length - 1];
  const baseStep = slugify(`${palette.type}-${Date.now()}`);

  return {
    id: `step-${baseStep}`,
    type,
    step: type === 'architecture' ? 'architecture' : type === 'review' ? 'review' : type === 'code' ? 'code' : baseStep,
    role: palette.role,
    model: palette.model,
    prompt: '',
    inputRefs: [],
    inputFiles: [],
    useGitDiff: false,
    files: [],
    keywords: [],
    outputMode: type === 'code' ? 'code' : 'document',
    outputPath: type === 'code' ? '' : '',
    verify: type === 'code' ? 'typecheck' : '',
    retry: true,
    pass: type === 'review' ? 7 : null,
    required: true,
    maxTokens: 4096,
    position,
  };
}

export function createDraftFromTemplate(template: 'fullstack' | 'quickfix' | 'planning') {
  const base: PipelineDraft = {
    name: template === 'fullstack' ? '새 풀스택 파이프라인' : template === 'quickfix' ? '빠른 수정 파이프라인' : '기획 파이프라인',
    description: '',
    codebase: '',
    gitCommit: true,
    steps: [],
  };

  if (template === 'fullstack') {
    base.steps = [
      { ...createStepDraft('ux', { x: 280, y: 80 }), step: 'ux', prompt: 'UX 명세를 작성해.', outputMode: 'document', outputPath: 'specs/ux.md' },
      { ...createStepDraft('architecture', { x: 280, y: 230 }), step: 'architecture', prompt: '아키텍처/DB 설계를 정리해.', inputRefs: ['ux'], outputMode: 'document', outputPath: 'specs/architecture.md' },
      { ...createStepDraft('code', { x: 280, y: 380 }), step: 'code-backend', prompt: '백엔드 코드를 작성해.', inputRefs: ['architecture'], files: ['src/routes/api.ts'], outputMode: 'code', verify: 'typecheck' },
      { ...createStepDraft('code', { x: 280, y: 530 }), step: 'code-frontend', prompt: '프론트엔드 코드를 작성해.', inputRefs: ['ux', 'architecture'], files: ['app/page.tsx'], outputMode: 'code' },
      { ...createStepDraft('review', { x: 280, y: 680 }), step: 'review', prompt: '변경사항을 리뷰해.', useGitDiff: true, outputMode: 'document', outputPath: 'reviews/review.md', pass: 7 },
    ];
  }

  if (template === 'quickfix') {
    base.steps = [
      { ...createStepDraft('code', { x: 280, y: 150 }), step: 'code', prompt: '코드를 수정해.', files: ['src/index.ts'], outputMode: 'code', verify: 'typecheck' },
      { ...createStepDraft('review', { x: 280, y: 320 }), step: 'review', prompt: '변경사항을 리뷰해.', useGitDiff: true, outputMode: 'document', outputPath: 'reviews/quickfix.md', pass: 7 },
    ];
  }

  if (template === 'planning') {
    base.steps = [
      { ...createStepDraft('ux', { x: 280, y: 120 }), step: 'ux', prompt: '문제 정의와 UX 시나리오를 정리해.', outputMode: 'document', outputPath: 'specs/ux.md' },
      { ...createStepDraft('architecture', { x: 280, y: 290 }), step: 'architecture', prompt: '구현 구조와 API를 정리해.', inputRefs: ['ux'], outputMode: 'document', outputPath: 'specs/architecture.md' },
      { ...createStepDraft('custom', { x: 280, y: 460 }), step: 'documentation', role: 'Documenter', prompt: '최종 문서를 정리해.', inputRefs: ['ux', 'architecture'], outputMode: 'document', outputPath: 'docs/final-plan.md' },
    ];
  }

  return base;
}

export function inferStepType(step: Record<string, unknown>): BuilderStepType {
  if (typeof step.role === 'string' && step.role.toLowerCase().includes('review')) return 'review';
  if (step.output === 'code') return 'code';
  if (typeof step.role === 'string' && step.role.toLowerCase().includes('blueprint')) return 'architecture';
  if (typeof step.role === 'string' && step.role.toLowerCase().includes('security')) return 'security';
  if (typeof step.role === 'string' && step.role.toLowerCase().includes('test')) return 'test';
  if (typeof step.role === 'string' && step.role.toLowerCase().includes('cpo')) return 'ux';
  return 'custom';
}

export function pipelineRecordToDraft(record: {
  id?: string;
  name?: string;
  description?: string | null;
  project?: string;
  codebase: string;
  steps: Array<Record<string, unknown>>;
}): PipelineDraft {
  const stepNames = new Set(record.steps.map((step) => String(step.step || '')));
  return {
    id: record.id,
    name: record.name || record.project || 'Imported Pipeline',
    description: record.description || '',
    codebase: record.codebase,
    gitCommit: true,
    steps: record.steps.map((step, index) => {
      const rawInput = step.input;
      const inputItems = Array.isArray(rawInput) ? rawInput.map(String) : rawInput ? [String(rawInput)] : [];
      const inputRefs = inputItems.filter((item) => stepNames.has(item) && item !== 'git diff');
      const inputFiles = inputItems.filter((item) => !stepNames.has(item) && item !== 'git diff');
      return {
        id: `step-${String(step.step || index)}`,
        type: inferStepType(step),
        step: String(step.step || `step-${index + 1}`),
        role: String(step.role || 'Custom'),
        model: String(step.model || 'sonnet'),
        prompt: String(step.prompt || ''),
        inputRefs,
        inputFiles,
        useGitDiff: rawInput === 'git diff' || inputItems.includes('git diff'),
        files: Array.isArray(step.files) ? step.files.map(String) : [],
        keywords: Array.isArray(step.keywords) ? step.keywords.map(String) : [],
        outputMode: step.output === 'code' ? 'code' : step.output ? 'document' : 'none',
        outputPath: step.output && step.output !== 'code' ? String(step.output) : '',
        verify: (step.verify as '' | 'typecheck' | 'lint' | 'build') || '',
        retry: step.retry !== false,
        pass: typeof step.pass === 'number' ? step.pass : null,
        required: step.required !== false,
        maxTokens: Number((step.options as { maxTokens?: number } | undefined)?.maxTokens || 4096),
        position: { x: 280, y: 80 + index * 150 },
      };
    }),
  };
}

export function draftToPipelinePayload(draft: PipelineDraft) {
  return {
    name: draft.name,
    description: draft.description,
    codebase: draft.codebase,
    steps: draft.steps.map((step) => {
      const inputItems = step.useGitDiff
        ? 'git diff'
        : [...step.inputRefs, ...step.inputFiles].filter(Boolean);
      const input =
        inputItems === 'git diff'
          ? inputItems
          : inputItems.length === 0
            ? undefined
            : inputItems.length === 1
              ? inputItems[0]
              : inputItems;

      return {
        step: step.step,
        role: step.role,
        model: step.model,
        prompt: step.prompt,
        ...(input ? { input } : {}),
        ...(step.files.length ? { files: step.files } : {}),
        ...(step.keywords.length ? { keywords: step.keywords } : {}),
        ...(step.outputMode === 'code'
          ? { output: 'code' }
          : step.outputMode === 'document'
            ? { output: step.outputPath }
            : {}),
        ...(step.verify ? { verify: step.verify } : {}),
        ...(step.pass ? { pass: step.pass } : {}),
        ...(step.required === false ? { required: false } : {}),
        ...(step.retry === false ? { retry: false } : {}),
        ...(step.maxTokens !== 4096 ? { options: { maxTokens: step.maxTokens } } : {}),
      };
    }),
  };
}

export function draftToExportJson(draft: PipelineDraft) {
  return {
    project: draft.name,
    codebase: draft.codebase,
    steps: draftToPipelinePayload(draft).steps,
  };
}

export function buildFlowNodes(draft: PipelineDraft, selectedId?: string | null, invalidStepIds = new Set<string>()): Node[] {
  const startNode: Node = {
    id: 'start',
    type: 'pipelineNode',
    position: { x: 260, y: -120 },
    data: {
      label: draft.name || '프로젝트',
      sublabel: draft.codebase || 'codebase 경로를 입력해 주세요',
      variant: 'start',
      selected: selectedId === 'start',
    },
    draggable: false,
  };

  const endY = draft.steps.length
    ? Math.max(...draft.steps.map((step) => step.position.y)) + 170
    : 120;

  const stepNodes = draft.steps.map((step) => ({
    id: step.id,
    type: 'pipelineNode',
    position: step.position,
    data: {
      label: step.step,
      sublabel: `${step.role} · ${step.model}`,
      variant: 'step',
      selected: selectedId === step.id,
      invalid: invalidStepIds.has(step.id),
      icon: PALETTE_ITEMS.find((item) => item.type === step.type)?.icon || '📝',
    },
  }));

  const endNode: Node = {
    id: 'end',
    type: 'pipelineNode',
    position: { x: 260, y: endY },
    data: {
      label: '끝',
      sublabel: draft.gitCommit ? 'git commit ON' : 'git commit OFF',
      variant: 'end',
      selected: selectedId === 'end',
    },
    draggable: false,
  };

  return [startNode, ...stepNodes, endNode];
}

export function buildFlowEdges(draft: PipelineDraft): Edge[] {
  const edges: Edge[] = [];

  if (draft.steps.length) {
    edges.push({
      id: 'edge-start-first',
      source: 'start',
      target: draft.steps[0].id,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
      style: { stroke: 'hsl(var(--primary))' },
    });
  }

  draft.steps.forEach((step) => {
    step.inputRefs.forEach((ref) => {
      const source = draft.steps.find((item) => item.step === ref);
      if (source) {
        edges.push({
          id: `edge-${source.id}-${step.id}`,
          source: source.id,
          target: step.id,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: 'hsl(var(--primary))' },
        });
      }
    });
  });

  if (draft.steps.length) {
    edges.push({
      id: 'edge-last-end',
      source: draft.steps[draft.steps.length - 1].id,
      target: 'end',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
      style: { stroke: 'hsl(var(--accent))' },
    });
  }

  return edges;
}

export function detectCycle(draft: PipelineDraft) {
  const graph = new Map<string, string[]>();
  draft.steps.forEach((step) => graph.set(step.step, [...step.inputRefs]));

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) || []) {
      if (walk(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return draft.steps.some((step) => walk(step.step));
}

export function validateDraft(draft: PipelineDraft) {
  const invalidStepIds = new Set<string>();
  const messages: string[] = [];

  if (!draft.name.trim()) messages.push('프로젝트 이름이 필요합니다.');
  if (!draft.codebase.trim()) messages.push('codebase 경로가 필요합니다.');
  if (draft.steps.length === 0) messages.push('최소 1개의 스텝이 필요합니다.');

  draft.steps.forEach((step) => {
    if (!step.prompt.trim()) invalidStepIds.add(step.id);
    if (step.outputMode === 'code' && step.files.length === 0) invalidStepIds.add(step.id);
    if (step.outputMode === 'document' && !step.outputPath.trim()) invalidStepIds.add(step.id);
  });

  if (detectCycle(draft)) messages.push('순환 참조가 있습니다.');

  return { invalidStepIds, messages };
}
