import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const API = 'http://localhost:3100/api';
  const endpoints = [
    '/providers/status',
    '/stats/monthly',
    '/stats/by-model',
    '/executions?page=1&limit=20',
    '/pipelines',
    '/task-sets',
  ];

  const results: Record<string, unknown> = {};

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${API}${ep}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      const json = await res.json();
      results[ep] = {
        status: res.status,
        success: json.success,
        dataType: typeof json.data,
        isArray: Array.isArray(json.data),
        dataKeys: json.data && typeof json.data === 'object' && !Array.isArray(json.data) ? Object.keys(json.data) : undefined,
        arrayLength: Array.isArray(json.data) ? json.data.length : undefined,
        hasPagination: !!json.pagination,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results[ep] = { error: msg };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
