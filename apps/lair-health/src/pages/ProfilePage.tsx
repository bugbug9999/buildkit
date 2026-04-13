import { useEffect, useState } from 'react';
import type { ChangeEvent, CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';
import { fetchMealLogs } from '../services/mealApi';
import type { MealLogData } from '../services/mealApi';
import type { UserProfile } from '../services/userApi';
import { useUserStore } from '../store/userStore';

type DrugOptionValue = 'wegovy' | 'mounjaro' | 'saxenda' | 'other';

interface NotificationPrefs {
  mealReminderEnabled: boolean;
  hydrationReminderEnabled: boolean;
  reminderTime: string;
}

interface SharePrefs {
  showDrugLabel: boolean;
  showProteinGoal: boolean;
  showStreak: boolean;
}

interface ProfileFormState {
  glp1Drug: DrugOptionValue;
  glp1StartDate: string;
  weightKg: string;
}

const NOTIFICATION_PREFS_KEY = 'lair-health-notification-prefs';
const SHARE_PREFS_KEY = 'lair-health-share-prefs';

const DRUG_OPTIONS: DrugOptionValue[] = ['wegovy', 'mounjaro', 'saxenda', 'other'];

const defaultNotificationPrefs: NotificationPrefs = {
  mealReminderEnabled: false,
  hydrationReminderEnabled: false,
  reminderTime: '12:00',
};

const defaultSharePrefs: SharePrefs = {
  showStreak: true,
  showProteinGoal: true,
  showDrugLabel: false,
};

const pageStyle: CSSProperties = {
  minHeight: '100dvh',
  overflowY: 'auto',
  padding: '24px 24px 100px',
  backgroundColor: '#F8FAFC',
  boxSizing: 'border-box',
};

const containerStyle: CSSProperties = {
  maxWidth: 430,
  margin: '0 auto',
  display: 'grid',
  gap: 16,
};

const cardStyle: CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  border: '1px solid #E2E8F0',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  color: '#475569',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 44,
  border: '1px solid #CBD5E1',
  borderRadius: 12,
  padding: '10px 12px',
  boxSizing: 'border-box',
  fontSize: 14,
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 44,
  width: '100%',
  border: 'none',
  borderRadius: 12,
  backgroundColor: '#0F172A',
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

function readPrefs<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writePrefs<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeCsvField(value: string | number | null): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function toDrugOptionValue(value: string | null | undefined): DrugOptionValue {
  if (value === 'wegovy' || value === 'mounjaro' || value === 'saxenda') {
    return value;
  }
  return 'other';
}

function createProfileForm(profile: UserProfile | null): ProfileFormState {
  return {
    weightKg: profile?.weightKg != null ? String(profile.weightKg) : '',
    glp1Drug: toDrugOptionValue(profile?.glp1Drug),
    glp1StartDate: profile?.glp1StartDate ?? '',
  };
}

function SectionTitle(props: { description?: string; title: string }): ReactElement {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#0F172A' }}>{props.title}</h2>
      {props.description ? (
        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: '#64748B' }}>{props.description}</p>
      ) : null}
    </div>
  );
}

function CheckboxRow(props: {
  checked: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}): ReactElement {
  return (
    <label
      style={{
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={props.onChange} />
    </label>
  );
}

export default function ProfilePage(): ReactElement {
  const { t } = useTranslation();
  const profile = useUserStore((state) => state.profile);
  const isLoading = useUserStore((state) => state.isLoading);
  const error = useUserStore((state) => state.error);
  const loadProfile = useUserStore((state) => state.loadProfile);
  const patchProfile = useUserStore((state) => state.patchProfile);
  const logout = useUserStore((state) => state.logout);

  const [form, setForm] = useState<ProfileFormState>(() => createProfileForm(profile));
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() =>
    readPrefs<NotificationPrefs>(NOTIFICATION_PREFS_KEY, defaultNotificationPrefs),
  );
  const [sharePrefs, setSharePrefs] = useState<SharePrefs>(() =>
    readPrefs<SharePrefs>(SHARE_PREFS_KEY, defaultSharePrefs),
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      void loadProfile();
    }
  }, [loadProfile, profile]);

  useEffect(() => {
    setForm(createProfileForm(profile));
  }, [profile]);

  useEffect(() => {
    writePrefs(NOTIFICATION_PREFS_KEY, notificationPrefs);
  }, [notificationPrefs]);

  useEffect(() => {
    writePrefs(SHARE_PREFS_KEY, sharePrefs);
  }, [sharePrefs]);

  const weightValue = Number(form.weightKg);
  const suggestedProteinGoal =
    form.weightKg.trim() && Number.isFinite(weightValue) ? Math.round(weightValue * 1.6) : 0;

  async function handleSave(): Promise<void> {
    const weightKg = form.weightKg.trim() ? Number(form.weightKg) : null;

    await patchProfile({
      weightKg,
      glp1Drug: form.glp1Drug,
      glp1StartDate: form.glp1StartDate || null,
      goalProtein: suggestedProteinGoal || profile?.goalProtein || 0,
    });

    if (!useUserStore.getState().error) {
      setSaveMessage(t('profile.saved'));
      setTimeout(() => setSaveMessage(null), 2000);
    }
  }

  async function handleExportCsv(): Promise<void> {
    setExportError(null);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const logs: MealLogData[] = await fetchMealLogs(today);
      const csvHeader = ['기록시각', '음식명', '칼로리(kcal)', '단백질(g)', '탄수화물(g)', '지방(g)'];
      const csvRows = logs.map((log) =>
        [
          log.loggedAt,
          log.foodName,
          String(log.caloriesKcal),
          String(log.proteinG),
          String(log.carbsG),
          String(log.fatG),
        ]
          .map((value) => escapeCsvField(value))
          .join(','),
      );
      const csv = [csvHeader.join(','), ...csvRows].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `레어헬스_식단_${today}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (csvError) {
      setExportError(csvError instanceof Error ? csvError.message : t('common.error'));
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10B981' }}>{t('nav.profile')}</p>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2, color: '#0F172A' }}>{t('profile.title')}</h1>
        </header>

        {isLoading && !profile ? <Spinner /> : null}
        {error ? <p style={{ margin: 0, fontSize: 14, color: '#B91C1C' }}>{error}</p> : null}
        {saveMessage ? <p style={{ margin: 0, fontSize: 14, color: '#047857' }}>{saveMessage}</p> : null}
        {exportError ? <p style={{ margin: 0, fontSize: 14, color: '#B91C1C' }}>{exportError}</p> : null}

        <section style={cardStyle}>
          <SectionTitle
            title={t('profile.body.title')}
            description={suggestedProteinGoal > 0 ? `권장 단백질 목표 ${suggestedProteinGoal}g` : undefined}
          />
          <label style={labelStyle}>
            <span>{t('profile.weight')}</span>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                inputMode="decimal"
                value={form.weightKg}
                onChange={(event) => {
                  setForm((current) => ({ ...current, weightKg: event.target.value }));
                }}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  fontSize: 14,
                }}
              >
                kg
              </span>
            </div>
          </label>
        </section>

        <section style={cardStyle}>
          <SectionTitle title={t('profile.drug.title')} />
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {DRUG_OPTIONS.map((option) => {
                const isSelected = form.glp1Drug === option;
                return (
                  <button
                    key={option}
                    type="button"
                    style={{
                      minHeight: 44,
                      padding: 12,
                      borderRadius: 12,
                      border: isSelected ? '1px solid #10B981' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                      color: '#0F172A',
                      fontSize: 14,
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setForm((current) => ({ ...current, glp1Drug: option }));
                    }}
                  >
                    {t(`profile.drug.${option}`)}
                  </button>
                );
              })}
            </div>
            <label style={labelStyle}>
              <span>{t('profile.drug.startDate')}</span>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.glp1StartDate}
                onChange={(event) => {
                  setForm((current) => ({ ...current, glp1StartDate: event.target.value }));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </section>

        <section style={cardStyle}>
          <SectionTitle title={t('profile.notification.title')} />
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
              알림을 받으려면 기기의 브라우저 알림 권한을 허용해 주세요.
            </p>
            <CheckboxRow
              checked={notificationPrefs.mealReminderEnabled}
              label={t('profile.notification.meal')}
              onChange={(event) => {
                setNotificationPrefs((current) => ({
                  ...current,
                  mealReminderEnabled: event.target.checked,
                }));
              }}
            />
            <CheckboxRow
              checked={notificationPrefs.hydrationReminderEnabled}
              label={t('profile.notification.hydration')}
              onChange={(event) => {
                setNotificationPrefs((current) => ({
                  ...current,
                  hydrationReminderEnabled: event.target.checked,
                }));
              }}
            />
            <label style={labelStyle}>
              <span>{t('profile.notification.time')}</span>
              <input
                type="time"
                value={notificationPrefs.reminderTime}
                onChange={(event) => {
                  setNotificationPrefs((current) => ({
                    ...current,
                    reminderTime: event.target.value,
                  }));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </section>

        <section style={cardStyle}>
          <SectionTitle title={t('profile.share.title')} />
          <div style={{ display: 'grid', gap: 14 }}>
            <CheckboxRow
              checked={sharePrefs.showStreak}
              label={t('profile.share.streak')}
              onChange={(event) => {
                setSharePrefs((current) => ({ ...current, showStreak: event.target.checked }));
              }}
            />
            <CheckboxRow
              checked={sharePrefs.showProteinGoal}
              label={t('profile.share.protein')}
              onChange={(event) => {
                setSharePrefs((current) => ({ ...current, showProteinGoal: event.target.checked }));
              }}
            />
            <CheckboxRow
              checked={sharePrefs.showDrugLabel}
              label={t('profile.share.drug')}
              onChange={(event) => {
                setSharePrefs((current) => ({ ...current, showDrugLabel: event.target.checked }));
              }}
            />
          </div>
        </section>

        <section style={cardStyle}>
          <SectionTitle title={t('profile.data.title')} />
          <div style={{ display: 'grid', gap: 12 }}>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => {
                void handleExportCsv();
              }}
            >
              오늘 식단 CSV 내보내기
            </button>
            <button
              type="button"
              style={{
                ...primaryButtonStyle,
                backgroundColor: '#FFFFFF',
                color: '#B91C1C',
                border: '1px solid #FECACA',
              }}
              onClick={() => {
                logout();
              }}
            >
              {t('profile.logout')}
            </button>
          </div>
        </section>

        <button
          type="button"
          disabled={isLoading}
          style={{
            ...primaryButtonStyle,
            opacity: isLoading ? 0.7 : 1,
          }}
          onClick={() => {
            void handleSave();
          }}
        >
          {isLoading ? t('common.loading') : t('common.save')}
        </button>
      </div>
      <BottomNav />
    </main>
  );
}
