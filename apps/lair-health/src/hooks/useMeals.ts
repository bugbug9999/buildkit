import { useCallback } from 'react';
import { useMealStore } from '../store/mealStore';
import type { CreateMealLogInput } from '../services/mealApi';

export function useMeals() {
  const todayLogs = useMealStore((s) => s.todayLogs);
  const loading = useMealStore((s) => s.loading);
  const error = useMealStore((s) => s.error);
  const loadTodayLogs = useMealStore((s) => s.loadTodayLogs);
  const addLogFn = useMealStore((s) => s.addLog);
  const removeLogFn = useMealStore((s) => s.removeLog);

  const reload = useCallback(() => loadTodayLogs(), [loadTodayLogs]);
  const addLog = useCallback((input: CreateMealLogInput) => addLogFn(input), [addLogFn]);
  const removeLog = useCallback((id: string) => removeLogFn(id), [removeLogFn]);

  return { todayLogs, loading, error, reload, addLog, removeLog };
}
