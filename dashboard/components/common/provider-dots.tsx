import { cn } from '@/lib/utils';
import type { ProvidersResponse } from '@/lib/types';

export function ProviderDots({ providers, showLabels = false }: { providers: ProvidersResponse | null; showLabels?: boolean }) {
  const items = [
    { key: 'claude', label: 'Claude', active: providers?.claude.available },
    { key: 'gemini', label: 'Gemini', active: providers?.gemini.available },
    { key: 'openai', label: 'OpenAI', active: providers?.openai.available },
  ];

  return (
    <div className="flex items-center gap-3">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className={cn('status-dot', item.active ? 'bg-success shadow-[0_0_0_4px_rgba(34,197,94,0.12)]' : 'bg-danger/80')} />
          {showLabels ? <span className="text-sm text-muted-foreground">{item.label}</span> : null}
        </div>
      ))}
    </div>
  );
}
