'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { PipelineBuilderScreen } from '@/components/pipeline-builder/pipeline-builder-screen';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api';
import { pipelineRecordToDraft, type PipelineDraft } from '@/lib/pipeline-builder';
import type { PipelineRecord } from '@/lib/types';

export default function PipelineDetailPage() {
  const params = useParams<{ id: string }>();
  const [draft, setDraft] = useState<PipelineDraft | null>(null);

  useEffect(() => {
    apiGet<PipelineRecord>(`/pipelines/${params.id}`)
      .then((response) => setDraft(pipelineRecordToDraft(response.data)))
      .catch((error) => toast.error(error.message || '파이프라인을 불러오지 못했습니다.'));
  }, [params.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipelines"
        title="파이프라인 편집"
        description="드래그 앤 드롭, 속성 패널, JSON 양방향 동기화로 파이프라인을 편집합니다."
      />
      {draft ? <PipelineBuilderScreen initialDraft={draft} /> : (
        <Card>
          <CardContent className="p-8 text-muted-foreground">파이프라인을 불러오는 중입니다...</CardContent>
        </Card>
      )}
    </div>
  );
}
