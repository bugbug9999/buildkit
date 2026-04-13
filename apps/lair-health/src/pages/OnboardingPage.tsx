import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import type { OnboardingData } from '../store/uiStore';

const PRIMARY = '#10B981';
const TOTAL_STEPS = 3;

const drugOptions = [
  { value: 'wegovy', label: '위고비' },
  { value: 'mounjaro', label: '마운자로' },
  { value: 'saxenda', label: '삭센다' },
  { value: 'other', label: '기타' },
] as const;

const frequencyOptions = [
  { value: 'weekly', label: '주1회' },
  { value: 'daily', label: '매일' },
  { value: 'other', label: '기타' },
] as const;

const sexOptions = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
] as const;

const periodOptions = [
  { value: 60, label: '2개월60일' },
  { value: 90, label: '3개월90일' },
  { value: 180, label: '6개월180일' },
  { value: 365, label: '1년365일' },
  { value: 0, label: '직접입력' },
] as const;

const activityOptions = [
  { value: 1.2, title: '거의안움직여요', subtitle: '활동계수 1.2' },
  { value: 1.375, title: '가벼운활동', subtitle: '활동계수 1.375' },
  { value: 1.55, title: '적당한운동', subtitle: '활동계수 1.55' },
  { value: 1.725, title: '활발한운동', subtitle: '활동계수 1.725' },
] as const;

type Sex = OnboardingData['sex'];
type DrugValue = (typeof drugOptions)[number]['value'];
type FrequencyValue = (typeof frequencyOptions)[number]['value'];
type ActivityValue = (typeof activityOptions)[number]['value'];

interface Suggestion {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundToTens(value: number): number {
  return Math.round(value / 10) * 10;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function bigButtonStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: '72px',
    padding: '18px 16px',
    border: `2px solid ${active ? PRIMARY : '#E2E8F0'}`,
    borderRadius: '14px',
    backgroundColor: active ? '#F0FDFA' : '#FFFFFF',
    color: '#0F172A',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  };
}

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '10px 16px',
    border: `1.5px solid ${active ? PRIMARY : '#E2E8F0'}`,
    borderRadius: '20px',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '1rem',
    color: '#0F172A',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  };
}

function actionButtonStyle(disabled = false): CSSProperties {
  return {
    width: '100%',
    backgroundColor: PRIMARY,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

function secondaryButtonStyle(): CSSProperties {
  return {
    width: '100%',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    border: '1.5px solid #E2E8F0',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: 0,
    fontSize: '1.75rem',
    lineHeight: 1.3,
    fontWeight: 800,
    color: '#0F172A',
  };
}

function labelStyle(): CSSProperties {
  return {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#0F172A',
  };
}

function cardStyle(active: boolean): CSSProperties {
  return {
    padding: '18px',
    borderRadius: '18px',
    border: `1.5px solid ${active ? PRIMARY : '#E2E8F0'}`,
    backgroundColor: active ? '#F0FDFA' : '#FFFFFF',
    cursor: 'pointer',
    textAlign: 'left',
  };
}

export default function OnboardingPage(): ReactElement {
  const navigate = useNavigate();
  const completeOnboarding = useUIStore().completeOnboarding;

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [isTakingMedication, setIsTakingMedication] = useState<boolean | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<DrugValue | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dosingFrequency, setDosingFrequency] = useState<FrequencyValue | null>(null);

  const [currentWeight, setCurrentWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [muscleMass, setMuscleMass] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const [goalWeight, setGoalWeight] = useState('');
  const [goalPeriod, setGoalPeriod] = useState<number>(90);
  const [customPeriod, setCustomPeriod] = useState('');
  const [activityMultiplier, setActivityMultiplier] = useState<ActivityValue | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);

  const currentKg = parseNumber(currentWeight);
  const heightCm = parseNumber(height);
  const ageValue = parseNumber(age);
  const goalKg = parseNumber(goalWeight);
  const periodDays = goalPeriod === 0 ? parseNumber(customPeriod) : goalPeriod;

  const suggestion = useMemo<Suggestion | null>(() => {
    if (!sex || currentKg <= 0 || heightCm <= 0 || ageValue <= 0 || goalKg <= 0 || periodDays <= 0 || !activityMultiplier) {
      return null;
    }

    const bmr =
      sex === 'female'
        ? 10 * currentKg + 6.25 * heightCm - 5 * ageValue - 161
        : 10 * currentKg + 6.25 * heightCm - 5 * ageValue + 5;
    const tdee = bmr * activityMultiplier;
    const dailyDeficit = ((currentKg - goalKg) * 7700) / periodDays;
    const dailyCalories = Math.max(1200, roundToTens(tdee - dailyDeficit));
    const proteinG = Math.round(currentKg * 1.6);
    const carbsG = Math.round((dailyCalories * 0.45) / 4);
    const fatG = Math.round((dailyCalories * 0.25) / 9);

    return {
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
    };
  }, [activityMultiplier, ageValue, currentKg, goalKg, heightCm, periodDays, sex]);

  function resetGoalPreview(): void {
    setShowSuggestion(false);
    setEditingGoal(false);
  }

  function validateCurrentStep(): string {
    if (step === 1) {
      if (isTakingMedication === null) {
        return '복용 여부를 선택해 주세요.';
      }
      if (isTakingMedication) {
        if (!selectedDrug) {
          return '약물을 선택해 주세요.';
        }
        if (!isIsoDate(startDate)) {
          return '복용 시작일을 YYYY-MM-DD 형식으로 입력해 주세요.';
        }
        if (!dosingFrequency) {
          return '투약 주기를 선택해 주세요.';
        }
      }
    }

    if (step === 2) {
      if (currentKg <= 0) {
        return '현재 체중을 입력해 주세요.';
      }
      if (heightCm <= 0) {
        return '키를 입력해 주세요.';
      }
      if (ageValue <= 0) {
        return '나이를 입력해 주세요.';
      }
      if (!sex) {
        return '성별을 선택해 주세요.';
      }
    }

    if (step === 3) {
      if (goalKg <= 0) {
        return '목표 체중을 입력해 주세요.';
      }
      if (goalKg >= currentKg) {
        return '목표 체중은 현재 체중보다 낮게 입력해 주세요.';
      }
      if (periodDays <= 0) {
        return '목표 기간을 입력해 주세요.';
      }
      if (!activityMultiplier) {
        return '운동강도를 선택해 주세요.';
      }
      if (!suggestion) {
        return '입력값을 다시 확인해 주세요.';
      }
    }

    return '';
  }

  function handleNext(): void {
    const nextError = validateCurrentStep();
    if (nextError) {
      setError(nextError);
      return;
    }

    setError('');

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
      return;
    }

    setShowSuggestion(true);
    setEditingGoal(false);
  }

  function handleBack(): void {
    setError('');

    if (step > 1) {
      if (step === 3) {
        resetGoalPreview();
      }
      setStep((prev) => prev - 1);
    }
  }

  function handleComplete(): void {
    if (!sex || !suggestion) {
      setError('제안 플랜을 다시 계산해 주세요.');
      return;
    }

    const data: OnboardingData = {
      glp1Drug: isTakingMedication ? selectedDrug ?? 'other' : 'other',
      glp1StartDate: isTakingMedication ? startDate.trim() : '',
      weightKg: currentKg,
      heightCm,
      age: ageValue,
      sex,
      goalCalories: suggestion.dailyCalories,
      goalProtein: suggestion.proteinG,
      goalCarbs: suggestion.carbsG,
      goalFat: suggestion.fatG,
    };

    completeOnboarding(data);
    navigate('/');
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: '#FFFFFF',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: PRIMARY }}>온보딩</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B' }}>
              {step}/{TOTAL_STEPS}
            </span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(step / TOTAL_STEPS) * 100}%`,
                height: '100%',
                backgroundColor: PRIMARY,
                borderRadius: '999px',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>

        {step === 1 && (
          <section style={{ display: 'grid', gap: '20px' }}>
            <div>
              <h1 style={sectionTitleStyle()}>다이어트 주사나 약을 복용하고 있나요?</h1>
              <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>
                현재 복용 중인 GLP-1 약물이 있다면 기본 정보부터 입력해 주세요.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" style={bigButtonStyle(isTakingMedication === true)} onClick={() => setIsTakingMedication(true)}>
                네
              </button>
              <button
                type="button"
                style={bigButtonStyle(isTakingMedication === false)}
                onClick={() => {
                  setIsTakingMedication(false);
                  setSelectedDrug(null);
                  setStartDate('');
                  setDosingFrequency(null);
                }}
              >
                아니요
              </button>
            </div>

            {isTakingMedication === true && (
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={labelStyle()}>약물 선택</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {drugOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        style={chipStyle(selectedDrug === option.value)}
                        onClick={() => setSelectedDrug(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="glp1-start-date" style={labelStyle()}>
                    복용 시작일
                  </label>
                  <input
                    id="glp1-start-date"
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <label style={labelStyle()}>투약 주기</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {frequencyOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        style={chipStyle(dosingFrequency === option.value)}
                        onClick={() => setDosingFrequency(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section style={{ display: 'grid', gap: '20px' }}>
            <div>
              <h1 style={sectionTitleStyle()}>신체정보를 입력해 주세요</h1>
              <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>
                필수 정보로 칼로리와 영양 목표를 계산합니다.
              </p>
            </div>

            <div>
              <label htmlFor="current-weight" style={labelStyle()}>
                현재 체중(kg)
              </label>
              <input
                id="current-weight"
                type="number"
                inputMode="decimal"
                value={currentWeight}
                onChange={(event) => setCurrentWeight(event.target.value)}
                style={inputStyle()}
              />
            </div>

            <div>
              <label htmlFor="height" style={labelStyle()}>
                키(cm)
              </label>
              <input
                id="height"
                type="number"
                inputMode="decimal"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                style={inputStyle()}
              />
            </div>

            <div>
              <label htmlFor="age" style={labelStyle()}>
                나이
              </label>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                style={inputStyle()}
              />
            </div>

            <div>
              <label style={labelStyle()}>성별</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {sexOptions.map((option) => (
                  <button key={option.value} type="button" style={bigButtonStyle(sex === option.value)} onClick={() => setSex(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#E2E8F0' }} />

            <div>
              <label htmlFor="muscle-mass" style={labelStyle()}>
                근육량(kg)
              </label>
              <input
                id="muscle-mass"
                type="number"
                inputMode="decimal"
                value={muscleMass}
                onChange={(event) => setMuscleMass(event.target.value)}
                style={inputStyle()}
              />
            </div>

            <div>
              <label htmlFor="body-fat" style={labelStyle()}>
                체지방률(%)
              </label>
              <input
                id="body-fat"
                type="number"
                inputMode="decimal"
                value={bodyFat}
                onChange={(event) => setBodyFat(event.target.value)}
                style={inputStyle()}
              />
            </div>
          </section>
        )}

        {step === 3 && (
          <section style={{ display: 'grid', gap: '20px' }}>
            <div>
              <h1 style={sectionTitleStyle()}>목표와 영양 플랜</h1>
              <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>
                목표 체중과 기간, 운동강도를 바탕으로 시작 플랜을 제안합니다.
              </p>
            </div>

            {(!showSuggestion || editingGoal) && (
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label htmlFor="goal-weight" style={labelStyle()}>
                    목표 체중(kg)
                  </label>
                  <input
                    id="goal-weight"
                    type="number"
                    inputMode="decimal"
                    value={goalWeight}
                    onChange={(event) => {
                      setGoalWeight(event.target.value);
                      resetGoalPreview();
                    }}
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <label style={labelStyle()}>목표 기간</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {periodOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        style={chipStyle(goalPeriod === option.value)}
                        onClick={() => {
                          setGoalPeriod(option.value);
                          if (option.value !== 0) {
                            setCustomPeriod('');
                          }
                          resetGoalPreview();
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {goalPeriod === 0 && (
                  <div>
                    <label htmlFor="custom-period" style={labelStyle()}>
                      직접 입력(일)
                    </label>
                    <input
                      id="custom-period"
                      type="number"
                      inputMode="numeric"
                      value={customPeriod}
                      onChange={(event) => {
                        setCustomPeriod(event.target.value);
                        resetGoalPreview();
                      }}
                      style={inputStyle()}
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle()}>운동강도</label>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {activityOptions.map((option) => (
                      <button
                        key={option.title}
                        type="button"
                        style={cardStyle(activityMultiplier === option.value)}
                        onClick={() => {
                          setActivityMultiplier(option.value);
                          resetGoalPreview();
                        }}
                      >
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>{option.title}</div>
                        <div style={{ marginTop: '6px', fontSize: '0.92rem', color: '#64748B' }}>{option.subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showSuggestion && !editingGoal && suggestion && (
              <div
                style={{
                  backgroundColor: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  borderRadius: '20px',
                  padding: '20px',
                  display: 'grid',
                  gap: '18px',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065F46' }}>추천 시작 플랜</div>
                  <p style={{ margin: '8px 0 0', color: '#047857', lineHeight: 1.6 }}>
                    현재 {currentKg}kg에서 목표 {goalKg}kg, {periodDays}일 기준으로 계산했어요.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>일일칼로리</div>
                    <div style={{ marginTop: '6px', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                      {suggestion.dailyCalories} kcal
                    </div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>단백질</div>
                    <div style={{ marginTop: '6px', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                      {suggestion.proteinG} g
                    </div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>탄수화물</div>
                    <div style={{ marginTop: '6px', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                      {suggestion.carbsG} g
                    </div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>지방</div>
                    <div style={{ marginTop: '6px', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                      {suggestion.fatG} g
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <button type="button" style={actionButtonStyle()} onClick={handleComplete}>
                    이대로 시작!
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle()}
                    onClick={() => {
                      setEditingGoal(true);
                      setError('');
                    }}
                  >
                    수정할게요
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {error && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px 16px',
              borderRadius: '14px',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
          {step > 1 && (
            <button type="button" style={{ ...secondaryButtonStyle(), flex: 1 }} onClick={handleBack}>
              이전
            </button>
          )}
          {!(step === 3 && showSuggestion && !editingGoal) && (
            <button type="button" style={{ ...actionButtonStyle(), flex: 1 }} onClick={handleNext}>
              다음
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
