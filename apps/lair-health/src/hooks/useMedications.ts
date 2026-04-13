import { useCallback } from 'react';
import { useMedicationStore } from '../store/medicationStore';

export function useMedications() {
  const medications = useMedicationStore((s) => s.medications);
  const logs = useMedicationStore((s) => s.logs);
  const loading = useMedicationStore((s) => s.loading);
  const error = useMedicationStore((s) => s.error);
  const loadMedications = useMedicationStore((s) => s.loadMedications);
  const upsertLog = useMedicationStore((s) => s.upsertLog);

  const reload = useCallback(() => loadMedications(), [loadMedications]);

  const toggleCheck = useCallback(
    (medicationId: string, scheduleId: string, date: string) => {
      const existing = logs.find(
        (l) => l.scheduleId === scheduleId && l.scheduledDate.startsWith(date)
      );
      const status = existing?.status === 'TAKEN' ? 'MISSED' : 'TAKEN';
      void upsertLog({ scheduleId, scheduledDate: date, status });
    },
    [logs, upsertLog]
  );

  return { medications, logs, loading, error, reload, toggleCheck };
}
