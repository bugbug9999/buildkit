export function bridgeExecution(io, db, engine) {
  const listeners = [
    ['execution:started', (data) => {
      io.to(`execution:${data.executionId}`).emit('execution:started', data);
    }],
    ['step:started', (data) => {
      db.markExecutionStepStarted(data.executionId, data.stepIndex, data);
      io.to(`execution:${data.executionId}`).emit('step:started', data);
    }],
    ['step:progress', (data) => {
      io.to(`execution:${data.executionId}`).emit('step:progress', data);
    }],
    ['step:token-update', (data) => {
      io.to(`execution:${data.executionId}`).emit('step:token-update', data);
    }],
    ['step:completed', (data) => {
      db.markExecutionStepCompleted(data.executionId, data.stepIndex, data);
      db.syncExecutionTotals(data.executionId);
      io.to(`execution:${data.executionId}`).emit('step:completed', data);
    }],
    ['step:failed', (data) => {
      db.markExecutionStepFailed(data.executionId, data.stepIndex, data);
      io.to(`execution:${data.executionId}`).emit('step:failed', data);
    }],
    ['step:retrying', (data) => {
      db.markExecutionStepRetrying(data.executionId, data.stepIndex, data);
      io.to(`execution:${data.executionId}`).emit('step:retrying', data);
    }],
    ['step:verify-result', (data) => {
      db.markExecutionStepVerify(data.executionId, data.stepIndex, data);
      io.to(`execution:${data.executionId}`).emit('step:verify-result', data);
    }],
    ['step:review-score', (data) => {
      db.markExecutionStepReview(data.executionId, data.stepIndex, data);
      io.to(`execution:${data.executionId}`).emit('step:review-score', data);
    }],
    ['execution:completed', (data) => {
      db.finishExecution(data.executionId, {
        status: data.status || 'completed',
        total_tokens: data.totalTokens,
        total_cost: data.totalCost,
        error_message: data.error || null,
      });
      io.to(`execution:${data.executionId}`).emit('execution:completed', data);
    }],
    ['execution:failed', (data) => {
      db.syncExecutionTotals(data.executionId);
      const current = db.getExecution(data.executionId);
      db.finishExecution(data.executionId, {
        status: 'failed',
        total_tokens: current?.total_tokens || 0,
        total_cost: current?.total_cost || 0,
        error_message: data.error,
      });
      io.to(`execution:${data.executionId}`).emit('execution:failed', data);
    }],
    ['execution:cancelled', (data) => {
      db.syncExecutionTotals(data.executionId);
      const current = db.getExecution(data.executionId);
      db.finishExecution(data.executionId, {
        status: 'cancelled',
        total_tokens: current?.total_tokens || 0,
        total_cost: current?.total_cost || 0,
      });
      io.to(`execution:${data.executionId}`).emit('execution:cancelled', data);
    }],
  ];

  listeners.forEach(([eventName, listener]) => {
    engine.on(eventName, listener);
  });

  return () => {
    listeners.forEach(([eventName, listener]) => {
      engine.off(eventName, listener);
    });
  };
}

export function attachExecutionSocket(io, executionService) {
  io.on('connection', (socket) => {
    socket.on('execution:subscribe', ({ executionId }) => {
      if (!executionId) return;
      socket.join(`execution:${executionId}`);
    });

    socket.on('execution:unsubscribe', ({ executionId }) => {
      if (!executionId) return;
      socket.leave(`execution:${executionId}`);
    });

    socket.on('execution:cancel', ({ executionId }) => {
      if (!executionId) return;
      executionService.cancelExecution(executionId);
    });
  });
}
