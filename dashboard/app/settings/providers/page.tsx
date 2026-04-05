'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { useAppStore } from '@/lib/store';

export default function ProvidersSettingsPage() {
  const providers = useAppStore((state) => state.providers);
  const setProviders = useAppStore((state) => state.setProviders);
  const [testing, setTesting] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    apiGet<Record<string, string>>('/settings')
      .then((response) => setSettings(response.data))
      .catch(() => null);
  }, []);

  const items = [
    { key: 'claude', title: 'Claude (Anthropic)', value: providers?.claude, type: 'sdk' },
    { key: 'gemini', title: 'Gemini (Google)', value: providers?.gemini, type: 'cli' },
    { key: 'openai', title: 'OpenAI', value: providers?.openai, type: 'cli' },
  ] as const;

  const runTest = async (name: 'claude' | 'gemini' | 'openai') => {
    setTesting(name);
    try {
      const response = await apiPost(`/providers/test/${name}`);
      setProviders({
        ...(providers || {
          claude: { available: false, mode: null, models: [] },
          gemini: { available: false, mode: null, models: [] },
          openai: { available: false, mode: null, models: [] },
        }),
        [name]: response.data,
      });
      toast.success(`${name} 연결 테스트 성공`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '연결 테스트 실패');
    } finally {
      setTesting(null);
    }
  };

  const saveSettings = async () => {
    try {
      await apiPut('/settings', settings);
      toast.success('프로바이더 설정을 저장했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="AI 프로바이더"
        description="SDK/API Key 또는 CLI 연결 상태를 확인하고 테스트합니다."
      />

      {items.map((item) => (
        <Card key={item.key}>
          <CardHeader>
            <div className="flex w-full items-start justify-between gap-4">
              <div>
                <p className="panel-title">{item.title}</p>
                <CardTitle className="mt-1">{item.value?.mode?.toUpperCase() || '미연결'}</CardTitle>
              </div>
              <Badge tone={item.value?.available ? 'success' : 'danger'}>
                {item.value?.available ? '연결됨' : '연결 안 됨'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm text-muted-foreground">API Key / 연결 방식</div>
                <Input
                  type="password"
                  value={settings[`providers.${item.key}.key`] || ''}
                  onChange={(event) => setSettings((current) => ({ ...current, [`providers.${item.key}.key`]: event.target.value }))}
                  placeholder={item.type === 'sdk' ? 'API Key 입력' : item.value?.mode || ''}
                />
              </div>
              <div>
                <div className="mb-2 text-sm text-muted-foreground">CLI 경로</div>
                <Input
                  value={settings[`providers.${item.key}.cliPath`] || item.value?.cli_path || ''}
                  onChange={(event) => setSettings((current) => ({ ...current, [`providers.${item.key}.cliPath`]: event.target.value }))}
                  placeholder="-"
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">사용 가능 모델: {(item.value?.models || []).join(', ') || '-'}</div>
            <Button variant="secondary" onClick={() => runTest(item.key)} disabled={testing === item.key}>
              연결 테스트
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={() => void saveSettings()}>저장</Button>
      </div>
    </div>
  );
}
