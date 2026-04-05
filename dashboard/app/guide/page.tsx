import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function GuidePage() {
  const guidePath = path.resolve(process.cwd(), 'content/guide.md');
  const content = fs.readFileSync(guidePath, 'utf-8');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guide"
        title="BuildKit 가이드"
        description="시작하기, 파이프라인 구조, 모델 선택, CLI 호환 포인트를 빠르게 확인할 수 있습니다."
      />
      <Card>
        <CardContent className="prose prose-slate max-w-none p-8 dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
