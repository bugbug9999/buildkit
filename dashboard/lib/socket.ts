'use client';

import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3100';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function subscribeExecution(executionId: string) {
  const client = getSocket();
  client.emit('execution:subscribe', { executionId });
  return () => {
    client.emit('execution:unsubscribe', { executionId });
  };
}
