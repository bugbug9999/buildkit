import { useEffect, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';
import { analyzeMealImage, getAnalyzeUploadUrl } from '../services/mealApi';
import type { AnalyzeResult } from '../services/mealApi';
import { useMealStore } from '../store/mealStore';
import { useUIStore } from '../store/uiStore';

const PRIMARY = '#10B981';

const pageStyle: CSSProperties = {
  minHeight: '100dvh',
  background: '#F8FAFC',
  padding: '20px 16px 100px',
  paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
  boxSizing: 'border-box',
};

const containerStyle: CSSProperties = {
  maxWidth: 430,
  margin: '0 auto',
  display: 'grid',
  gap: 16,
};

const cardStyle: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
};

function getFileExtension(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase().trim();
  if (extension) {
    return extension;
  }

  return file.type.split('/')[1]?.toLowerCase() || 'jpg';
}

function formatValue(value: number): string {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function getPercent(consumed: number, goal: number): number {
  if (goal <= 0) {
    return 0;
  }

  return Math.min(100, (consumed / goal) * 100);
}

interface NutrientBarProps {
  label: string;
  unit: string;
  consumed: number;
  goal: number;
}

function NutrientBar({ label, unit, consumed, goal }: NutrientBarProps) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <strong style={{ fontSize: 14, color: '#111827' }}>{label}</strong>
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          {formatValue(consumed)}
          {unit} / {formatValue(goal)}
          {unit}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 10,
          borderRadius: 999,
          background: '#E5E7EB',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${getPercent(consumed, goal)}%`,
            height: '100%',
            borderRadius: 999,
            background: PRIMARY,
          }}
        />
      </div>
    </div>
  );
}

export default function MealDashboardPage() {
  const { todayLogs, loading, error, loadTodayLogs, addLog } = useMealStore();
  const { goalCalories, goalProtein, goalCarbs, goalFat } = useUIStore();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const todayLabel = new Date().toLocaleDateString('ko-KR');
  const consumedCalories = todayLogs.reduce((sum, log) => sum + log.caloriesKcal, 0);
  const consumedProtein = todayLogs.reduce((sum, log) => sum + log.proteinG, 0);
  const consumedCarbs = todayLogs.reduce((sum, log) => sum + log.carbsG, 0);
  const consumedFat = todayLogs.reduce((sum, log) => sum + log.fatG, 0);

  useEffect(() => {
    void loadTodayLogs();
  }, [loadTodayLogs]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
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
    setUploadedFileUrl(null);
    setAnalysisResult(null);
    setLocalError(null);
    setAnalyzing(true);

    try {
      const ext = getFileExtension(file);
      const { uploadUrl, fileUrl } = await getAnalyzeUploadUrl(ext);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
      });

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const result = await analyzeMealImage(fileUrl);
      setUploadedFileUrl(fileUrl);
      setAnalysisResult(result);
    } catch (caughtError) {
      setLocalError(caughtError instanceof Error ? caughtError.message : 'AI 분석에 실패했습니다.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave(): Promise<void> {
    if (!analysisResult) {
      return;
    }

    setSaving(true);
    setLocalError(null);

    try {
      await addLog({
        loggedAt: new Date().toISOString(),
        foodName: analysisResult.foodName,
        caloriesKcal: analysisResult.caloriesKcal,
        proteinG: analysisResult.proteinG,
        carbsG: analysisResult.carbsG,
        fatG: analysisResult.fatG,
        imageUrl: uploadedFileUrl ?? undefined,
      });

      setUploadedFileUrl(null);
      setAnalysisResult(null);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
    } catch (caughtError) {
      setLocalError(caughtError instanceof Error ? caughtError.message : '기록 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
            borderColor: '#A7F3D0',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>오늘 날짜</div>
          <h1 style={{ margin: '10px 0 0', fontSize: 28, lineHeight: 1.3, color: '#111827' }}>{todayLabel}</h1>
        </section>

        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 20, color: '#111827' }}>영양 요약</h2>
            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: '#ECFDF5',
                color: PRIMARY,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              오늘 {todayLogs.length}건
            </span>
          </div>
          <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            <NutrientBar label="칼로리" unit="kcal" consumed={consumedCalories} goal={goalCalories} />
            <NutrientBar label="단백질" unit="g" consumed={consumedProtein} goal={goalProtein} />
            <NutrientBar label="탄수화물" unit="g" consumed={consumedCarbs} goal={goalCarbs} />
            <NutrientBar label="지방" unit="g" consumed={consumedFat} goal={goalFat} />
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#111827' }}>AI 분석</h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: '#6B7280' }}>
            음식 사진을 올리면 AI가 영양 정보를 추정하고 바로 저장할 수 있습니다.
          </p>

          <label
            style={{
              display: 'grid',
              gap: 10,
              marginTop: 18,
              padding: 16,
              borderRadius: 16,
              border: '1px dashed #A7F3D0',
              background: '#F0FDF4',
              color: '#065F46',
              cursor: 'pointer',
            }}
          >
            <strong style={{ fontSize: 15 }}>식사 사진 선택</strong>
            <span style={{ fontSize: 13, color: '#047857' }}>JPG, PNG 등 이미지 파일을 업로드하세요.</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                void handleFileChange(event);
              }}
              style={{ display: 'none' }}
            />
          </label>

          {analyzing ? <Spinner label="AI가 식사 사진을 분석하는 중입니다." /> : null}

          {analysisResult ? (
            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gap: 14,
                padding: 16,
                borderRadius: 16,
                border: '1px solid #D1FAE5',
                background: '#F9FFFC',
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="업로드한 식사 사진"
                  style={{
                    width: '100%',
                    height: 220,
                    objectFit: 'cover',
                    borderRadius: 14,
                    display: 'block',
                  }}
                />
              ) : null}

              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{analysisResult.foodName}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#6B7280' }}>
                  신뢰도 {Math.round(analysisResult.confidence * 100)}% · 남은 분석 {analysisResult.quotaRemaining}회
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div style={{ padding: 14, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>칼로리</div>
                  <div style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color: '#111827' }}>
                    {formatValue(analysisResult.caloriesKcal)} kcal
                  </div>
                </div>
                <div style={{ padding: 14, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>단백질</div>
                  <div style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color: '#111827' }}>
                    {formatValue(analysisResult.proteinG)} g
                  </div>
                </div>
                <div style={{ padding: 14, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>탄수화물</div>
                  <div style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color: '#111827' }}>
                    {formatValue(analysisResult.carbsG)} g
                  </div>
                </div>
                <div style={{ padding: 14, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>지방</div>
                  <div style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color: '#111827' }}>
                    {formatValue(analysisResult.fatG)} g
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={saving}
                style={{
                  minHeight: 48,
                  border: 'none',
                  borderRadius: 14,
                  background: PRIMARY,
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          ) : null}
        </section>

        {localError || error ? (
          <section
            style={{
              ...cardStyle,
              background: '#FEF2F2',
              borderColor: '#FECACA',
              color: '#B91C1C',
            }}
          >
            {localError || error}
          </section>
        ) : null}

        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#111827' }}>식사 목록</h2>

          {loading ? <Spinner label="오늘 식사 기록을 불러오는 중입니다." /> : null}

          {!loading && todayLogs.length === 0 ? (
            <p style={{ margin: '16px 0 0', fontSize: 14, lineHeight: 1.6, color: '#6B7280' }}>
              아직 저장된 식사 기록이 없습니다.
            </p>
          ) : null}

          {!loading && todayLogs.length > 0 ? (
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {todayLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.foodName}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                      {new Date(log.loggedAt).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <strong style={{ flexShrink: 0, fontSize: 15, color: PRIMARY }}>{formatValue(log.caloriesKcal)} kcal</strong>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
