'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, CircuitBoard, Gauge, History, PanelsTopLeft, Settings2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '대시보드', icon: Gauge },
  { href: '/pipelines', label: '파이프라인', icon: CircuitBoard },
  { href: '/tasks', label: '빠른 태스크', icon: Zap },
  { href: '/history', label: '실행 이력', icon: History },
  { href: '/settings/providers', label: '설정', icon: Settings2 },
  { href: '/guide', label: '가이드', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-card/65 p-5 backdrop-blur lg:flex lg:flex-col">
      <div className="flex items-center gap-3 rounded-xl border bg-background/80 p-4 shadow-sm">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <PanelsTopLeft className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-semibold">BuildKit</div>
          <div className="text-xs text-muted-foreground">v0.2.0 dashboard</div>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
