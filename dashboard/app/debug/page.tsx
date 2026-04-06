'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [results, setResults] = useState<string>('Loading...');

  useEffect(() => {
    const API = '/backend-api';
    const endpoints = [
      '/providers/status',
      '/stats/monthly',
      '/stats/by-model',
      '/executions?page=1&limit=20',
      '/pipelines',
      '/task-sets',
    ];

    const lines: string[] = [];

    async function testEndpoint(ep: string) {
      try {
        const res = await fetch(`${API}${ep}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        const json = await res.json();
        return `✅ ${ep} → status=${res.status}, success=${json.success}, dataType=${typeof json.data}, isArray=${Array.isArray(json.data)}`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return `❌ ${ep} → ERROR: ${msg}`;
      }
    }

    async function testSocket() {
      try {
        const { io } = await import('socket.io-client');
        return new Promise<string>((resolve) => {
          const socket = io('http://localhost:3100', {
            autoConnect: true,
            transports: ['websocket'],
            timeout: 3000,
          });
          socket.on('connect', () => {
            socket.disconnect();
            resolve('✅ Socket.IO connected');
          });
          socket.on('connect_error', (e: Error) => {
            resolve(`❌ Socket.IO error: ${e.message}`);
          });
          setTimeout(() => resolve('⚠️ Socket.IO timeout (3s)'), 3500);
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return `❌ Socket.IO import error: ${msg}`;
      }
    }

    async function testProvidersTsx() {
      try {
        const { apiGet } = await import('@/lib/api');
        const res = await apiGet('/providers/status');
        return `✅ apiGet('/providers/status') → success=${(res as Record<string, unknown>).success}, data keys=${Object.keys((res as Record<string, unknown>).data as object).join(',')}`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return `❌ apiGet failed: ${msg}`;
      }
    }

    (async () => {
      lines.push('=== Direct Fetch Tests ===');
      for (const ep of endpoints) {
        lines.push(await testEndpoint(ep));
      }
      lines.push('');
      lines.push('=== Socket.IO Test ===');
      lines.push(await testSocket());
      lines.push('');
      lines.push('=== apiGet Wrapper Test ===');
      lines.push(await testProvidersTsx());
      lines.push('');
      lines.push('=== Store State ===');
      try {
        const { useAppStore } = await import('@/lib/store');
        const state = useAppStore.getState();
        lines.push(`providers: ${state.providers ? 'SET' : 'null'}`);
        lines.push(`executions: ${state.executions.length} items`);
        lines.push(`monthlyStats: ${state.monthlyStats ? 'SET' : 'null'}`);
        lines.push(`pipelines: ${state.pipelines.length} items`);
        lines.push(`taskSets: ${state.taskSets.length} items`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        lines.push(`❌ Store error: ${msg}`);
      }

      setResults(lines.join('\n'));
    })();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">BuildKit Debug Page</h1>
      <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm font-mono">
        {results}
      </pre>
    </div>
  );
}
