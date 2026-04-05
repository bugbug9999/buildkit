'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiGet, apiPut } from '@/lib/api';

const modelOptions = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'codex', label: 'Codex' },
];

export default function DefaultsSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    apiGet<Record<string, string>>('/settings')
      .then((response) => setSettings(response.data))
      .catch(() => null);
  }, []);

  const save = async () => {
    try {
      await apiPut('/settings', settings);
      toast.success('기본값을 저장했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="기본값"
        description="기본 codebase, 역할별 모델, maxTokens, 리뷰 통과 점수를 저장합니다."
      />
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="mb-2 text-sm text-muted-foreground">기본 codebase</div>
            <Input
              value={settings['defaults.codebase'] || ''}
              onChange={(event) => setSettings((current) => ({ ...current, 'defaults.codebase': event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {['cpo', 'blueprint', 'developer', 'reviewer'].map((role) => (
              <div key={role}>
                <div className="mb-2 text-sm capitalize text-muted-foreground">{role} 기본 모델</div>
                <Select
                  value={settings[`defaults.model.${role}`] || 'sonnet'}
                  onChange={(value) => setSettings((current) => ({ ...current, [`defaults.model.${role}`]: value }))}
                  options={modelOptions}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm text-muted-foreground">기본 maxTokens</div>
              <Input
                type="number"
                value={settings['defaults.maxTokens'] || '4096'}
                onChange={(event) => setSettings((current) => ({ ...current, 'defaults.maxTokens': event.target.value }))}
              />
            </div>
            <div>
              <div className="mb-2 text-sm text-muted-foreground">리뷰 통과 점수</div>
              <Input
                type="number"
                value={settings['defaults.reviewPass'] || '7'}
                onChange={(event) => setSettings((current) => ({ ...current, 'defaults.reviewPass': event.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()}>저장</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
