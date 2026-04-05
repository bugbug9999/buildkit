import { cn } from '@/lib/utils';

export function Badge({
  className,
  children,
  tone = 'default',
}: {
  className?: string;
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'default' && 'bg-primary/10 text-primary',
        tone === 'success' && 'bg-success/10 text-success',
        tone === 'warning' && 'bg-warning/10 text-warning',
        tone === 'danger' && 'bg-danger/10 text-danger',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}
