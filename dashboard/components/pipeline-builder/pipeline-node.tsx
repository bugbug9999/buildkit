'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export function PipelineNode({ data }: NodeProps<any>) {
  const variant = data.variant;

  return (
    <div
      className={cn(
        'min-w-[220px] rounded-2xl border bg-card/95 p-4 shadow-panel backdrop-blur',
        data.selected && 'border-primary ring-2 ring-primary/25',
        data.invalid && 'border-danger ring-2 ring-danger/20',
        variant === 'start' && 'border-accent/50 bg-accent/10',
        variant === 'end' && 'border-primary/40 bg-primary/10'
      )}
    >
      {variant !== 'start' ? <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-background !bg-primary" /> : null}
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-background text-lg shadow-sm">
          {data.icon || (variant === 'start' ? '📦' : variant === 'end' ? '🏁' : '📝')}
        </div>
        <div className="space-y-1">
          <div className="font-semibold">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.sublabel}</div>
        </div>
        {data.invalid ? <span className="ml-auto mt-1 h-2.5 w-2.5 rounded-full bg-danger" /> : null}
      </div>
      {variant !== 'end' ? <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-background !bg-accent" /> : null}
    </div>
  );
}
