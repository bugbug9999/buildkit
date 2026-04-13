import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import type { MedicationData, ScheduleInput } from '../services/medicationApi';
import { useMedicationStore } from '../store/medicationStore';

const PRIMARY = '#10B981';

type MedicationForm = MedicationData['form'];

const formOptions: Array<{ label: string; value: MedicationForm }> = [
  { label: '경구', value: 'ORAL' },
  { label: '주사', value: 'INJECTION' },
  { label: '기타', value: 'OTHER' },
];

const timeSlotOptions: Array<{ label: string; value: ScheduleInput['timeSlot'] }> = [
  { label: '아침', value: 'MORNING' },
  { label: '점심', value: 'LUNCH' },
  { label: '저녁', value: 'EVENING' },
  { label: '취침 전', value: 'BEDTIME' },
];

const conditionOptions: Array<{ label: string; value: NonNullable<ScheduleInput['condition']> }> = [
  { label: '상관없음', value: 'ANY' },
  { label: '공복', value: 'FASTING' },
  { label: '식전', value: 'BEFORE_MEAL' },
  { label: '식후', value: 'AFTER_MEAL' },
];

function getCurrentDosage(medication: MedicationData) {
  const current = [...medication.dosageHistory]
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
    .find((entry) => entry.effectiveTo == null);

  if (current?.dosage?.trim()) {
    return current.dosage.trim();
  }

  return [...medication.dosageHistory]
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
    ?.dosage?.trim();
}

function toScheduleInputs(medication: MedicationData): ScheduleInput[] {
  const dosage = getCurrentDosage(medication);

  return medication.schedules.map((schedule) => ({
    dayOfWeek: schedule.dayOfWeek ?? undefined,
    timeSlot: schedule.timeSlot,
    timeDetail: schedule.timeDetail,
    condition: schedule.condition ?? 'ANY',
    dosage: dosage || undefined,
  }));
}

function MedicationEditPage() {
  const { id } = useParams<{ id: string }>();
  const { medications, loadMedications, updateMedication, removeMedication } = useMedicationStore();
  const navigate = useNavigate();

  const med = medications.find((item) => item.id === id);

  const [name, setName] = useState('');
  const [form, setForm] = useState<MedicationForm>('ORAL');
  const [memo, setMemo] = useState('');
  const [schedules, setSchedules] = useState<ScheduleInput[]>([]);
  const [showDelete, setShowDelete] = useState(false);

  const [timeSlot, setTimeSlot] = useState<ScheduleInput['timeSlot']>('MORNING');
  const [timeDetail, setTimeDetail] = useState('08:00');
  const [condition, setCondition] = useState<NonNullable<ScheduleInput['condition']>>('ANY');
  const [dosage, setDosage] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void loadMedications();
  }, [loadMedications]);

  useEffect(() => {
    if (!med) {
      return;
    }

    setName(med.name);
    setForm(med.form);
    setMemo(med.memo ?? '');
    setSchedules(toScheduleInputs(med));
  }, [med]);

  const pageStyle = {
    minHeight: '100dvh',
    padding: '24px 20px 40px',
    paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
    background:
      'linear-gradient(180deg, rgba(16, 185, 129, 0.10) 0%, rgba(255, 255, 255, 0) 220px), #F8FAFC',
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#111827',
    boxSizing: 'border-box' as const,
  };

  const containerStyle = {
    maxWidth: 430,
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
    marginBottom: 16,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
    color: '#374151',
  };

  const inputStyle = {
    width: '100%',
    height: 48,
    border: '1px solid #D1D5DB',
    borderRadius: 14,
    padding: '0 14px',
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    boxSizing: 'border-box' as const,
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: 110,
    height: 110,
    padding: '14px',
    resize: 'none' as const,
  };

  const primaryButtonStyle = {
    height: 50,
    border: 'none',
    borderRadius: 14,
    backgroundColor: PRIMARY,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  };

  const secondaryButtonStyle = {
    ...primaryButtonStyle,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    border: '1px solid #D1D5DB',
  };

  const dangerButtonStyle = {
    ...primaryButtonStyle,
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    border: '1px solid #FECACA',
  };

  const chipStyle = (active: boolean) => ({
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    border: `1px solid ${active ? PRIMARY : '#D1D5DB'}`,
    backgroundColor: active ? '#ECFDF5' : '#FFFFFF',
    color: active ? '#047857' : '#374151',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  });

  function resetScheduleDraft() {
    setTimeSlot('MORNING');
    setTimeDetail('08:00');
    setCondition('ANY');
    setDosage('');
  }

  function handleAddSchedule() {
    if (!timeDetail.trim()) {
      setError('상세 시간을 입력해 주세요.');
      return;
    }

    const nextSchedule: ScheduleInput = {
      timeSlot,
      timeDetail: timeDetail.trim(),
      condition,
      dosage: dosage.trim() || undefined,
    };

    setSchedules((current) => [...current, nextSchedule]);
    setError('');
    resetScheduleDraft();
  }

  function handleRemoveSchedule(index: number) {
    setSchedules((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id || !med) {
      setError('약 정보를 찾을 수 없습니다');
      return;
    }

    if (!name.trim()) {
      setError('약 이름을 입력해 주세요.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await updateMedication(id, {
        name: name.trim(),
        form,
        memo: memo.trim(),
        schedules: schedules.map((schedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          timeSlot: schedule.timeSlot,
          timeDetail: schedule.timeDetail.trim(),
          condition: schedule.condition ?? 'ANY',
          dosage: schedule.dosage?.trim() || undefined,
        })),
      });
      navigate('/medication');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) {
      setError('약 정보를 찾을 수 없습니다');
      setShowDelete(false);
      return;
    }

    setDeleting(true);

    try {
      await removeMedication(id);
      navigate('/medication');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '삭제 중 오류가 발생했습니다.');
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!med) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <section style={sectionStyle}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>약 정보를 찾을 수 없습니다</div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: PRIMARY, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>약 수정</div>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.25, color: '#111827' }}>
            복약 정보를 수정하세요
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#6B7280' }}>
            약 이름, 제형, 복용 스케줄을 수정하면 약 목록에 바로 반영됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <section style={sectionStyle}>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="medication-name" style={labelStyle}>
                약 이름
              </label>
              <input
                id="medication-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 타이레놀"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>제형</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {formOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm(option.value)}
                    style={chipStyle(form === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="medication-memo" style={labelStyle}>
                메모
              </label>
              <textarea
                id="medication-memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="복용 시 참고할 내용을 적어 주세요."
                style={textareaStyle}
              />
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: '#111827' }}>스케줄 추가</h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
                시간대와 상세 시간, 복용 조건을 입력한 뒤 스케줄을 추가하세요.
              </p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="schedule-time-slot" style={labelStyle}>
                시간대
              </label>
              <select
                id="schedule-time-slot"
                value={timeSlot}
                onChange={(event) => setTimeSlot(event.target.value as ScheduleInput['timeSlot'])}
                style={inputStyle}
              >
                {timeSlotOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="schedule-time-detail" style={labelStyle}>
                상세 시간
              </label>
              <input
                id="schedule-time-detail"
                value={timeDetail}
                onChange={(event) => setTimeDetail(event.target.value)}
                placeholder="08:00"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="schedule-condition" style={labelStyle}>
                복용 조건
              </label>
              <select
                id="schedule-condition"
                value={condition}
                onChange={(event) =>
                  setCondition(event.target.value as NonNullable<ScheduleInput['condition']>)
                }
                style={inputStyle}
              >
                {conditionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label htmlFor="schedule-dosage" style={labelStyle}>
                용량
              </label>
              <input
                id="schedule-dosage"
                value={dosage}
                onChange={(event) => setDosage(event.target.value)}
                placeholder="예: 1정, 5ml"
                style={inputStyle}
              />
            </div>

            <button
              type="button"
              onClick={handleAddSchedule}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              스케줄 추가
            </button>
          </section>

          <section style={sectionStyle}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}
            >
              <h2 style={{ margin: 0, fontSize: 20, color: '#111827' }}>추가된 스케줄</h2>
              <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>{schedules.length}개</span>
            </div>

            {schedules.length === 0 ? (
              <div
                style={{
                  border: '1px dashed #D1D5DB',
                  borderRadius: 16,
                  padding: '18px 16px',
                  fontSize: 14,
                  color: '#6B7280',
                  backgroundColor: '#F9FAFB',
                }}
              >
                아직 추가된 스케줄이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {schedules.map((schedule, index) => {
                  const timeSlotLabel =
                    timeSlotOptions.find((option) => option.value === schedule.timeSlot)?.label ??
                    schedule.timeSlot;
                  const conditionLabel =
                    conditionOptions.find((option) => option.value === schedule.condition)?.label ??
                    '상관없음';

                  return (
                    <div
                      key={`${schedule.timeSlot}-${schedule.timeDetail}-${index}`}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: 16,
                        padding: 16,
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 12,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                            {timeSlotLabel} {schedule.timeDetail}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 13, color: '#6B7280' }}>
                            {conditionLabel}
                            {schedule.dosage ? ` · ${schedule.dosage}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSchedule(index)}
                          style={{
                            height: 34,
                            padding: '0 12px',
                            borderRadius: 10,
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#B91C1C',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {error ? (
            <div
              style={{
                marginBottom: 16,
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #FECACA',
                backgroundColor: '#FEF2F2',
                color: '#B91C1C',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <button type="button" onClick={() => navigate('/medication')} style={secondaryButtonStyle}>
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ ...primaryButtonStyle, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDelete(true)}
            disabled={deleting}
            style={{ ...dangerButtonStyle, width: '100%', opacity: deleting ? 0.7 : 1 }}
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </form>
      </div>

      {showDelete ? (
        <ConfirmModal
          title="약 삭제"
          message="정말 삭제하시겠습니까?"
          confirmText="삭제"
          cancelText="취소"
          onCancel={() => {
            if (!deleting) {
              setShowDelete(false);
            }
          }}
          onConfirm={() => {
            void handleDelete();
          }}
        />
      ) : null}
    </main>
  );
}

export default MedicationEditPage;
