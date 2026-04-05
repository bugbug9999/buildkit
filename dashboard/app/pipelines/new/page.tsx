import { PageHeader } from '@/components/common/page-header';
import { PipelineBuilderScreen } from '@/components/pipeline-builder/pipeline-builder-screen';

export default function NewPipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipelines"
        title="새 파이프라인"
        description="템플릿, 빈 캔버스, JSON import 중 하나로 시작해 빌더에서 편집할 수 있습니다."
      />
      <PipelineBuilderScreen initialDraft={null} />
    </div>
  );
}
