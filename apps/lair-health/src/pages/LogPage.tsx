import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '../components/BottomNav';
import { Spinner } from '../components/Spinner';
import { updateMealLog } from '../services/mealApi';
import type { MealLogData } from '../services/mealApi';
import type { UpdateMealLogInput } from '../services/mealApi';
import { useMealStore } from '../store/mealStore';

type MealLogDraft = {
  foodName: string;
  caloriesKcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
};

type DraftMap = Record<string, MealLogDraft>;
type SavingMap = Record<string, boolean>;

const pageStyle = { minHeight: '100dvh', background: '#F8FAFC', paddingBottom: 80 } as const;
const containerStyle = { maxWidth: 430, margin: '0 auto', padding: 24 } as const;
const titleStyle = { fontSize: 28, fontWeight: 700, color: '#0F172A', marginBottom: 8 } as const;
const cardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
} as const;

function createDraft(log: MealLogData): MealLogDraft {
  return {
    foodName: log.foodName,
    caloriesKcal: String(log.caloriesKcal),
    proteinG: String(log.proteinG),
    carbsG: String(log.carbsG),
    fatG: String(log.fatG),
  };
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function LogPage() {
  const { t } = useTranslation();
  const todayLogs = useMealStore((state) => state.todayLogs);
  const loading = useMealStore((state) => state.loading);
  const error = useMealStore((state) => state.error);
  const loadTodayLogs = useMealStore((state) => state.loadTodayLogs);
  const removeLog = useMealStore((state) => state.removeLog);
  const selectedDate = useMealStore((state) => state.selectedDate);
  const setSelectedDate = useMealStore((state) => state.setSelectedDate);

  const [drafts, setDrafts] = useState<DraftMap>({});
  const [savingMap, setSavingMap] = useState<SavingMap>({});
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void loadTodayLogs();
  }, [loadTodayLogs]);

  useEffect(() => {
    const nextDrafts: DraftMap = {};
    for (const log of todayLogs) {
      nextDrafts[log.id] = createDraft(log);
    }
    setDrafts(nextDrafts);
  }, [todayLogs]);

  async function handleDateChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const nextDate = event.target.value;
    setActionError(null);
    setSelectedDate(nextDate);
    await loadTodayLogs();
  }

  function handleDraftChange(
    id: string,
    field: keyof MealLogDraft,
    value: string,
  ): void {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          foodName: '',
          caloriesKcal: '0',
          proteinG: '0',
          carbsG: '0',
          fatG: '0',
        }),
        [field]: value,
      },
    }));
  }

  async function handleSave(id: string): Promise<void> {
    const draft = drafts[id];
    if (!draft) {
      return;
    }

    const foodName = draft.foodName.trim();
    if (!foodName) {
      setActionError(t('meal.foodName'));
      return;
    }

    const payload: Partial<UpdateMealLogInput> = {
      foodName,
      caloriesKcal: parseNumber(draft.caloriesKcal),
      proteinG: parseNumber(draft.proteinG),
      carbsG: parseNumber(draft.carbsG),
      fatG: parseNumber(draft.fatG),
      isManuallyEdited: true,
    };

    setActionError(null);
    setSavingMap((current) => ({ ...current, [id]: true }));

    try {
      await updateMealLog(id, payload);
      await loadTodayLogs();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : t('common.error'));
    } finally {
      setSavingMap((current) => ({ ...current, [id]: false }));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    const confirmed = window.confirm(t('log.deleteConfirm'));
    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      await removeLog(id);
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : t('common.error'));
    }
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>{t('log.title')}</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: 14, marginBottom: 20 }}>
          {selectedDate}
        </p>

        <div style={cardStyle}>
          <label
            style={{
              display: 'block',
              color: '#334155',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'block', marginBottom: 8 }}>{t('meal.loggedAt')}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                void handleDateChange(event);
              }}
              style={{
                width: '100%',
                minHeight: 44,
                border: '1px solid #CBD5E1',
                borderRadius: 12,
                padding: '0 12px',
                background: '#fff',
                color: '#0F172A',
                boxSizing: 'border-box',
              }}
            />
          </label>
        </div>

        {actionError ? (
          <p style={{ margin: '0 0 12px', color: '#DC2626', fontSize: 14 }}>{actionError}</p>
        ) : null}
        {error ? <p style={{ margin: '0 0 12px', color: '#DC2626', fontSize: 14 }}>{error}</p> : null}

        {loading ? <Spinner /> : null}

        {!loading && todayLogs.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#0F172A', fontSize: 16, fontWeight: 600 }}>
              오늘 기록이 없습니다
            </p>
          </div>
        ) : null}

        {!loading &&
          todayLogs.map((log) => {
            const draft = drafts[log.id] ?? createDraft(log);
            const isSaving = savingMap[log.id] === true;

            return (
              <div key={log.id} style={cardStyle}>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: 0, color: '#0F172A', fontSize: 16, fontWeight: 700 }}>
                    {log.foodName}
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>
                    {new Date(log.loggedAt).toLocaleString()}
                  </p>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    type="text"
                    value={draft.foodName}
                    onChange={(event) => {
                      handleDraftChange(log.id, 'foodName', event.target.value);
                    }}
                    placeholder={t('meal.foodName')}
                    style={{
                      width: '100%',
                      minHeight: 44,
                      border: '1px solid #CBD5E1',
                      borderRadius: 12,
                      padding: '0 12px',
                      background: '#fff',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      type="number"
                      value={draft.caloriesKcal}
                      onChange={(event) => {
                        handleDraftChange(log.id, 'caloriesKcal', event.target.value);
                      }}
                      placeholder={t('meal.calories')}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        padding: '0 12px',
                        background: '#fff',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="number"
                      value={draft.proteinG}
                      onChange={(event) => {
                        handleDraftChange(log.id, 'proteinG', event.target.value);
                      }}
                      placeholder={t('meal.protein')}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        padding: '0 12px',
                        background: '#fff',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="number"
                      value={draft.carbsG}
                      onChange={(event) => {
                        handleDraftChange(log.id, 'carbsG', event.target.value);
                      }}
                      placeholder={t('meal.carbs')}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        padding: '0 12px',
                        background: '#fff',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="number"
                      value={draft.fatG}
                      onChange={(event) => {
                        handleDraftChange(log.id, 'fatG', event.target.value);
                      }}
                      placeholder={t('meal.fat')}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        padding: '0 12px',
                        background: '#fff',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSave(log.id);
                      }}
                      disabled={isSaving}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        border: 'none',
                        borderRadius: 12,
                        background: '#0F172A',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {isSaving ? t('common.loading') : t('common.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete(log.id);
                      }}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        border: '1px solid #FCA5A5',
                        borderRadius: 12,
                        background: '#fff',
                        color: '#DC2626',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <BottomNav />
    </div>
  );
}
