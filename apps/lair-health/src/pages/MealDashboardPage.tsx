import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import BottomNav from '../components/BottomNav';
import { Spinner } from '../components/Spinner';
import {
  analyzeMealImage,
  getAnalyzeUploadUrl,
} from '../services/mealApi';
import type { AnalyzeResult } from '../services/mealApi';
import { useMealStore } from '../store/mealStore';
import { useUIStore } from '../store/uiStore';

interface SummaryMetricProps {
  label: string;
  unit: string;
  value: number;
  goal: number;
  color: string;
}

const pageStyle: CSSProperties = {
  minHeight: '100dvh',
  padding: '24px 20px 100px',
  paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
  background:
    'radial-gradient(circle at top, rgba(16, 185, 129, 0.16) 0, rgba(16, 185, 129, 0) 34%), #F8FAFC',
  color: '#0F172A',
  fontFamily: '"Noto Sans KR", sans-serif',
  boxSizing: 'border-box',
};

const containerStyle: CSSProperties = {
  maxWidth: 430,
  margin: '0 auto',
  display: 'grid',
  gap: 16,
};

const cardStyle: CSSProperties = {
  padding: 20,
  borderRadius: 20,
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(148, 163, 184, 0.16)',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 46,
  border: 'none',
  borderRadius: 14,
  backgroundColor: '#10B981',
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getFileExtension(file: File): string {
  const matchedExtension = file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (matchedExtension) {
    return matchedExtension.toLowerCase();
  }

  const mimeExtension = file.type.split('/')[1];
  return mimeExtension ? mimeExtension.toLowerCase() : 'jpg';
}

function formatDateLabel(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(parsedDate);
}

function formatMetricValue(value: number): string {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function getProgressPercent(value: number, goal: number): number {
  if (goal <= 0) {
    return 0;
  }

  return Math.min((value / goal) * 100, 100);
}

function SummaryMetric({ label, unit, value, goal, color }: SummaryMetricProps): ReactElement {
  const percent = getProgressPercent(value, goal);

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#64748B' }}>
          {formatMetricValue(value)}
          {unit} / {formatMetricValue(goal)}
          {unit}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 10,
          borderRadius: 999,
          backgroundColor: '#E2E8F0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{Math.round(percent)}%</span>
    </div>
  );
}

export function MealDashboardPage(): ReactElement {
  const { t } = useTranslation();
  const todayLogs = useMealStore((state) => state.todayLogs);
  const loading = useMealStore((state) => state.loading);
  const error = useMealStore((state) => state.error);
  const selectedDate = useMealStore((state) => state.selectedDate);
  const loadTodayLogs = useMealStore((state) => state.loadTodayLogs);
  const setSelectedDate = useMealStore((state) => state.setSelectedDate);
  const addLog = useMealStore((state) => state.addLog);
  const removeLog = useMealStore((state) => state.removeLog);

  const goalCalories = useUIStore((state) => state.goalCalories);
  const goalProtein = useUIStore((state) => state.goalProtein);
  const goalCarbs = useUIStore((state) => state.goalCarbs);
  const goalFat = useUIStore((state) => state.goalFat);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const todayDate = useMemo(() => todayKey(), []);
  const dateLabel = useMemo(() => formatDateLabel(selectedDate || todayDate), [selectedDate, todayDate]);

  const totalCalories = useMemo(
    () => todayLogs.reduce((sum, log) => sum + log.caloriesKcal, 0),
    [todayLogs],
  );
  const totalProtein = useMemo(
    () => todayLogs.reduce((sum, log) => sum + log.proteinG, 0),
    [todayLogs],
  );
  const totalCarbs = useMemo(
    () => todayLogs.reduce((sum, log) => sum + log.carbsG, 0),
    [todayLogs],
  );
  const totalFat = useMemo(
    () => todayLogs.reduce((sum, log) => sum + log.fatG, 0),
    [todayLogs],
  );

  useEffect(() => {
    setSelectedDate(todayDate);
    void loadTodayLogs();
  }, [loadTodayLogs, setSelectedDate, todayDate]);

  useEffect(() => {
    if (!previewUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return nextPreviewUrl;
    });
    setSelectedFileName(file.name);
    setUploadedImageUrl(null);
    setAnalysisResult(null);
    setLocalError(null);
    setNoticeMessage(null);
    setIsAnalyzing(true);

    try {
      const extension = getFileExtension(file);
      const { uploadUrl, fileUrl } = await getAnalyzeUploadUrl(extension);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: file.type ? { 'Content-Type': file.type } : undefined,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const analyzed = await analyzeMealImage(fileUrl);
      setUploadedImageUrl(fileUrl);
      setAnalysisResult(analyzed);
    } catch (uploadError) {
      setLocalError(uploadError instanceof Error ? uploadError.message : '식사 분석에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSaveAnalysis(): Promise<void> {
    if (!analysisResult) {
      return;
    }

    setIsSaving(true);
    setLocalError(null);
    setNoticeMessage(null);

    try {
      await addLog({
        loggedAt: new Date().toISOString(),
        foodName: analysisResult.foodName,
        caloriesKcal: analysisResult.caloriesKcal,
        proteinG: analysisResult.proteinG,
        carbsG: analysisResult.carbsG,
        fatG: analysisResult.fatG,
        imageUrl: uploadedImageUrl ?? undefined,
      });
      setSelectedFileName('');
      setUploadedImageUrl(null);
      setAnalysisResult(null);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setNoticeMessage('분석 결과를 오늘 식사 기록에 저장했습니다.');
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : '식사 기록 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLog(id: string): Promise<void> {
    const confirmed = window.confirm('이 식사 기록을 삭제할까요?');
    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setLocalError(null);
    setNoticeMessage(null);

    try {
      await removeLog(id);
      setNoticeMessage('식사 기록을 삭제했습니다.');
    } catch (deleteError) {
      setLocalError(deleteError instanceof Error ? deleteError.message : '식사 기록 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header
          style={{
            ...cardStyle,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.16)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.72)' }}>
            {t('nav.home')}
          </p>
          <h1 style={{ margin: '8px 0 0', fontSize: 30, lineHeight: 1.2 }}>식단 대시보드</h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.82)' }}>
            {dateLabel}
          </p>
          <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.74)' }}>
            오늘 기록 {todayLogs.length}건, 목표 대비 섭취량과 AI 분석 결과를 한 번에 확인하세요.
          </p>
        </header>

        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10B981' }}>오늘의 영양 요약</p>
              <h2 style={{ margin: '6px 0 0', fontSize: 20, color: '#0F172A' }}>목표 대비 섭취량</h2>
            </div>
            <div
              style={{
                minWidth: 88,
                padding: '10px 12px',
                borderRadius: 14,
                backgroundColor: '#ECFDF5',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: '#047857' }}>총 칼로리</p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#047857' }}>
                {formatMetricValue(totalCalories)} kcal
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            <SummaryMetric label="칼로리" unit="kcal" value={totalCalories} goal={goalCalories} color="#10B981" />
            <SummaryMetric label="단백질" unit="g" value={totalProtein} goal={goalProtein} color="#0EA5E9" />
            <SummaryMetric label="탄수화물" unit="g" value={totalCarbs} goal={goalCarbs} color="#F59E0B" />
            <SummaryMetric label="지방" unit="g" value={totalFat} goal={goalFat} color="#F97316" />
          </div>
        </section>

        <section style={cardStyle}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10B981' }}>AI 식사 분석</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 20, color: '#0F172A' }}>사진으로 영양소 추정</h2>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7, color: '#64748B' }}>
              음식 사진을 올리면 업로드 후 자동으로 분석하고, 결과를 오늘 식사 기록으로 저장할 수 있습니다.
            </p>
          </div>

          <div style={{ marginTop: 18 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                void handleFileChange(event);
              }}
              style={{
                width: '100%',
                minHeight: 46,
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                color: '#334155',
              }}
            />
            {selectedFileName ? (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748B' }}>선택한 파일: {selectedFileName}</p>
            ) : null}
          </div>

          {isAnalyzing ? <Spinner label="식사 이미지를 분석하고 있습니다..." /> : null}

          {analysisResult ? (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 18,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'grid',
                gap: 14,
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="업로드한 식사 이미지 미리보기"
                  style={{
                    width: '100%',
                    display: 'block',
                    borderRadius: 16,
                    objectFit: 'cover',
                    maxHeight: 220,
                    border: '1px solid #E2E8F0',
                  }}
                />
              ) : null}

              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#10B981' }}>분석 결과</p>
                <h3 style={{ margin: '6px 0 0', fontSize: 22, color: '#0F172A' }}>{analysisResult.foodName}</h3>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748B' }}>
                  신뢰도 {Math.round(analysisResult.confidence * 100)}% · 남은 분석 횟수 {analysisResult.quotaRemaining}회
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                <div style={{ padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>칼로리</p>
                  <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                    {formatMetricValue(analysisResult.caloriesKcal)} kcal
                  </p>
                </div>
                <div style={{ padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>단백질</p>
                  <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                    {formatMetricValue(analysisResult.proteinG)} g
                  </p>
                </div>
                <div style={{ padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>탄수화물</p>
                  <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                    {formatMetricValue(analysisResult.carbsG)} g
                  </p>
                </div>
                <div style={{ padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>지방</p>
                  <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                    {formatMetricValue(analysisResult.fatG)} g
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSaving}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  void handleSaveAnalysis();
                }}
              >
                {isSaving ? '저장 중...' : '기록 저장'}
              </button>
            </div>
          ) : null}
        </section>

        {localError ? (
          <p style={{ margin: 0, color: '#DC2626', fontSize: 14, lineHeight: 1.6 }}>{localError}</p>
        ) : null}
        {error ? <p style={{ margin: 0, color: '#DC2626', fontSize: 14, lineHeight: 1.6 }}>{error}</p> : null}
        {noticeMessage ? (
          <p style={{ margin: 0, color: '#047857', fontSize: 14, lineHeight: 1.6 }}>{noticeMessage}</p>
        ) : null}

        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10B981' }}>오늘의 식사 기록</p>
              <h2 style={{ margin: '6px 0 0', fontSize: 20, color: '#0F172A' }}>기록 목록</h2>
            </div>
            <span
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                backgroundColor: '#ECFDF5',
                color: '#047857',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {todayLogs.length}건
            </span>
          </div>

          {loading ? <Spinner label={t('common.loading')} /> : null}

          {!loading && todayLogs.length === 0 ? (
            <div
              style={{
                marginTop: 18,
                padding: 18,
                borderRadius: 16,
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                lineHeight: 1.7,
              }}
            >
              오늘 저장된 식사 기록이 없습니다. 위에서 사진을 업로드해 첫 기록을 남겨 보세요.
            </div>
          ) : null}

          {!loading ? (
            <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              {todayLogs.map((log) => {
                const isDeleting = deletingId === log.id;

                return (
                  <article
                    key={log.id}
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 17, color: '#0F172A' }}>{log.foodName}</h3>
                        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>
                          {new Date(log.loggedAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isDeleting}
                        style={{
                          minHeight: 36,
                          padding: '0 12px',
                          borderRadius: 12,
                          border: '1px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          opacity: isDeleting ? 0.7 : 1,
                        }}
                        onClick={() => {
                          void handleDeleteLog(log.id);
                        }}
                      >
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 10,
                        marginTop: 14,
                      }}
                    >
                      <div style={{ padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>칼로리</p>
                        <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                          {formatMetricValue(log.caloriesKcal)} kcal
                        </p>
                      </div>
                      <div style={{ padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>단백질</p>
                        <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                          {formatMetricValue(log.proteinG)} g
                        </p>
                      </div>
                      <div style={{ padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>탄수화물</p>
                        <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                          {formatMetricValue(log.carbsG)} g
                        </p>
                      </div>
                      <div style={{ padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>지방</p>
                        <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                          {formatMetricValue(log.fatG)} g
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

export default MealDashboardPage;
