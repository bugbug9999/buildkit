import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import BottomNav from '../components/BottomNav';
import { ConfirmModal } from '../components/ConfirmModal';
import { Spinner } from '../components/Spinner';
import type { HeatmapDay, PremiumCheckoutParams, ShareCard, WeeklyReport } from '../services/reportApi';
import { useReportStore } from '../store/reportStore';
import { useUserStore } from '../store/userStore';

interface WeeklyReportCardProps {
  report: WeeklyReport;
}

interface HeatmapGridProps {
  days: HeatmapDay[];
  totalWeeks: number;
}

interface ShareCardViewProps {
  isGenerating: boolean;
  isPremium: boolean;
  onGenerate: () => Promise<void>;
  shareCard: ShareCard | null;
}

interface PlanSelectionCardProps {
  isCheckingOut: boolean;
  onCheckout: (planDays: number, amount: number) => void;
  tier: 'free' | 'premium';
}

interface PlanOption {
  amount: number;
  description: string;
  label: string;
  planDays: number;
}

const PLAN_OPTIONS: PlanOption[] = [
  { label: 'Premium 30', description: '30일 프리미엄', amount: 9900, planDays: 30 },
  { label: 'Premium 90', description: '90일 프리미엄', amount: 24900, planDays: 90 },
];

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
  border: '1px solid #E2E8F0',
  padding: 20,
  boxSizing: 'border-box',
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 44,
  width: '100%',
  border: 'none',
  borderRadius: 12,
  backgroundColor: '#10B981',
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

function getHeatmapColor(count: number): string {
  if (count <= 0) {
    return '#E2E8F0';
  }
  if (count === 1) {
    return '#BBF7D0';
  }
  if (count === 2) {
    return '#4ADE80';
  }
  return '#10B981';
}

function createHeatmapCells(days: HeatmapDay[], totalWeeks: number): HeatmapDay[] {
  const safeTotalWeeks = totalWeeks > 0 ? totalWeeks : 12;
  const safeTotalDays = safeTotalWeeks * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - safeTotalDays + 1);

  const dayMap = new Map<string, HeatmapDay>();
  days.forEach((day) => {
    dayMap.set(day.date, day);
  });

  return Array.from({ length: safeTotalDays }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const key = current.toISOString().slice(0, 10);
    return dayMap.get(key) ?? { date: key, count: 0 };
  });
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return weekStart;
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function WeeklyReportCard({ report }: WeeklyReportCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <section style={cardStyle}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10B981' }}>{formatWeekLabel(report.weekStart)}</p>
      <h2 style={{ margin: '8px 0 0', fontSize: 20, color: '#0F172A' }}>{t('report.title')}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginTop: 16,
        }}
      >
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#F8FAFC' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{t('report.weekly.totalLogs')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{report.totalLogs}</p>
        </div>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#F8FAFC' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{t('report.weekly.avgCalories')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
            {Math.round(report.avgCalories)} kcal
          </p>
        </div>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#F8FAFC' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{t('report.weekly.avgProtein')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
            {Math.round(report.avgProtein)} g
          </p>
        </div>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#F8FAFC' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{t('report.weekly.streakLabel')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
            {t('report.weekly.streak', { count: report.streak })}
          </p>
        </div>
      </div>
    </section>
  );
}

function HeatmapGrid({ days, totalWeeks }: HeatmapGridProps): ReactElement {
  const { t } = useTranslation();
  const cells = useMemo(() => createHeatmapCells(days, totalWeeks), [days, totalWeeks]);

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0F172A' }}>{t('report.heatmap.title')}</h2>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
          {t('report.heatmap.weeks', { count: totalWeeks || 12 })}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginTop: 16 }}>
        {cells.map((cell) => (
          <div
            key={cell.date}
            aria-label={`${cell.date}: ${cell.count}개 기록`}
            title={`${cell.date}: ${cell.count}`}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: 8,
              backgroundColor: getHeatmapColor(cell.count),
            }}
          />
        ))}
      </div>
    </section>
  );
}

function ShareCardView({
  isGenerating,
  isPremium,
  onGenerate,
  shareCard,
}: ShareCardViewProps): ReactElement {
  const { t } = useTranslation();

  return (
    <section style={cardStyle}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0F172A' }}>{t('report.shareCard.title')}</h2>
          {!isPremium ? (
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: '#64748B' }}>
              프리미엄 사용자만 공유 카드를 생성할 수 있습니다.
            </p>
          ) : null}
        </div>
        {shareCard?.shareCardUrl ? (
          <img
            src={shareCard.shareCardUrl}
            alt={t('report.shareCard.title')}
            style={{
              width: '100%',
              display: 'block',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
            }}
          />
        ) : null}
        {isGenerating ? <Spinner /> : null}
        {!isGenerating && !shareCard?.shareCardUrl ? (
          <button
            type="button"
            disabled={!isPremium}
            style={{
              ...primaryButtonStyle,
              opacity: isPremium ? 1 : 0.5,
              cursor: isPremium ? 'pointer' : 'not-allowed',
            }}
            onClick={() => {
              void onGenerate();
            }}
          >
            {t('report.shareCard.generate')}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function PlanSelectionCard({
  isCheckingOut,
  onCheckout,
  tier,
}: PlanSelectionCardProps): ReactElement {
  const { t } = useTranslation();
  const [selectedPlanDays, setSelectedPlanDays] = useState<number>(PLAN_OPTIONS[0].planDays);
  const selectedPlan =
    PLAN_OPTIONS.find((option) => option.planDays === selectedPlanDays) ?? PLAN_OPTIONS[0];

  return (
    <section style={cardStyle}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#0F172A' }}>{t('report.plan.title')}</h2>
      {tier === 'premium' ? (
        <p style={{ margin: '10px 0 0', fontSize: 14, color: '#10B981', fontWeight: 700 }}>
          {t('report.plan.current')}
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {PLAN_OPTIONS.map((option) => {
          const isSelected = option.planDays === selectedPlanDays;
          return (
            <button
              key={option.planDays}
              type="button"
              style={{
                minHeight: 44,
                padding: 14,
                borderRadius: 12,
                border: isSelected ? '1px solid #10B981' : '1px solid #CBD5E1',
                backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                color: '#0F172A',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => {
                setSelectedPlanDays(option.planDays);
              }}
            >
              <strong style={{ display: 'block', fontSize: 14 }}>{option.label}</strong>
              <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: '#64748B' }}>
                {option.description} · {option.amount.toLocaleString('ko-KR')}원
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={isCheckingOut || tier === 'premium'}
        style={{
          ...primaryButtonStyle,
          marginTop: 16,
          opacity: isCheckingOut || tier === 'premium' ? 0.6 : 1,
          cursor: isCheckingOut || tier === 'premium' ? 'not-allowed' : 'pointer',
        }}
        onClick={() => {
          void onCheckout(selectedPlan.planDays, selectedPlan.amount);
        }}
      >
        {isCheckingOut ? t('common.loading') : t('report.plan.upgrade')}
      </button>
    </section>
  );
}

export default function ReportPage(): ReactElement {
  const { t } = useTranslation();
  const heatmapData = useReportStore((state) => state.heatmapData);
  const weeklyReport = useReportStore((state) => state.weeklyReport);
  const latestShareCard = useReportStore((state) => state.latestShareCard);
  const latestCheckout = useReportStore((state) => state.latestCheckout);
  const isLoadingHeatmap = useReportStore((state) => state.isLoadingHeatmap);
  const isLoadingWeekly = useReportStore((state) => state.isLoadingWeekly);
  const isGeneratingShareCard = useReportStore((state) => state.isGeneratingShareCard);
  const isCheckingOutPremium = useReportStore((state) => state.isCheckingOutPremium);
  const error = useReportStore((state) => state.error);
  const fetchHeatmap = useReportStore((state) => state.fetchHeatmap);
  const fetchWeekly = useReportStore((state) => state.fetchWeekly);
  const generateShareCard = useReportStore((state) => state.generateShareCard);
  const checkoutPremium = useReportStore((state) => state.checkoutPremium);
  const loadLatestShareCard = useReportStore((state) => state.loadLatestShareCard);
  const loadProfile = useUserStore((state) => state.loadProfile);
  const profile = useUserStore((state) => state.profile);
  const profileError = useUserStore((state) => state.error);
  const [pendingCheckout, setPendingCheckout] = useState<{ planDays: number; amount: number } | null>(null);

  useEffect(() => {
    void fetchHeatmap(12);
    void fetchWeekly();
    void loadLatestShareCard();
  }, [fetchHeatmap, fetchWeekly, loadLatestShareCard]);

  useEffect(() => {
    if (!profile) {
      void loadProfile();
    }
  }, [loadProfile, profile]);

  const tier: 'free' | 'premium' =
    profile?.subscriptionTier === 'premium' || latestCheckout?.tier === 'premium' ? 'premium' : 'free';

  async function handleGenerateShareCard(): Promise<void> {
    if (tier !== 'premium') {
      return;
    }
    await generateShareCard(weeklyReport?.weekStart);
  }

  async function handleCheckout(planDays: number, amount: number): Promise<void> {
    const params: PremiumCheckoutParams = {
      impUid: `imp-${Date.now()}`,
      amount,
      merchantUid: `lair-health-${planDays}-${Date.now()}`,
      planDays,
    };
    await checkoutPremium(params);
  }

  function requestCheckout(planDays: number, amount: number): void {
    setPendingCheckout({ planDays, amount });
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10B981' }}>{t('nav.report')}</p>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2, color: '#0F172A' }}>{t('report.title')}</h1>
        </header>

        {error ? <p style={{ margin: 0, fontSize: 14, color: '#B91C1C' }}>{error}</p> : null}
        {profileError ? <p style={{ margin: 0, fontSize: 14, color: '#B91C1C' }}>{profileError}</p> : null}

        {isLoadingHeatmap || isLoadingWeekly ? <Spinner /> : null}

        {!isLoadingWeekly && weeklyReport ? <WeeklyReportCard report={weeklyReport} /> : null}
        {!isLoadingHeatmap && heatmapData ? (
          <HeatmapGrid days={heatmapData.days} totalWeeks={heatmapData.totalWeeks} />
        ) : null}
        <ShareCardView
          isGenerating={isGeneratingShareCard}
          isPremium={tier === 'premium'}
          onGenerate={handleGenerateShareCard}
          shareCard={latestShareCard}
        />
        <PlanSelectionCard
          isCheckingOut={isCheckingOutPremium}
          onCheckout={requestCheckout}
          tier={tier}
        />
        {pendingCheckout ? (
          <ConfirmModal
            title="결제 확인"
            message={`${pendingCheckout.amount.toLocaleString()}원이 결제됩니다. 계속하시겠어요?`}
            confirmText="결제하기"
            cancelText="취소"
            onConfirm={() => {
              void handleCheckout(pendingCheckout.planDays, pendingCheckout.amount);
              setPendingCheckout(null);
            }}
            onCancel={() => setPendingCheckout(null)}
          />
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}
