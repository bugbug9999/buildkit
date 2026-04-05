'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProviderStatusCard() {
  const providers = useAppStore((state) => state.providers);
  const items = [
    { name: 'Claude', value: providers?.claude },
    { name: 'Gemini', value: providers?.gemini },
    { name: 'OpenAI', value: providers?.openai },
  ];

  return (
    <Card>
      <CardHeader>
        <div>
          <p className="panel-title">AI 프로바이더</p>
          <CardTitle>현재 연결 상태</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-xl border bg-background/70 px-4 py-3">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground uppercase">{item.value?.mode || '미연결'}</div>
            </div>
            <span className={`status-dot ${item.value?.available ? 'bg-success' : 'bg-danger'}`} />
          </div>
        ))}
        <Link href="/settings/providers" className="inline-flex items-center text-sm font-medium text-primary">
          설정으로 이동
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
