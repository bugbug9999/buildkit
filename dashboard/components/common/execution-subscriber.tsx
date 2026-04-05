'use client';

import { useEffect } from 'react';
import { subscribeExecution } from '@/lib/socket';

export function ExecutionSubscriber({ executionId }: { executionId?: string | null }) {
  useEffect(() => {
    if (!executionId) return;
    return subscribeExecution(executionId);
  }, [executionId]);

  return null;
}
