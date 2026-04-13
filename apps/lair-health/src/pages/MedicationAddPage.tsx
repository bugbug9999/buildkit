import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScheduleInput } from '../services/medicationApi';
import { useMedicationStore } from '../store/medicationStore';

const PRIMARY = '#10B981';

const formOptions = [
  { value: 'ORAL', label: '경구' },
  { value: 'INJECTION', label: '주사' },
  { value: 'OTHER', label: '기타' },
] as const;

const timeSlotOptions = [
  { value: 'MORNING', label: '아침' },
  { value: 'LUNCH', label: '점심' },
  { value: 'EVENING', label: '저녁' },
  { value: 'BEDTIME', label: '취침 전' },
] as const;

const conditionOptions = [
  { value: 'ANY', label: '상관없음' },
  { value: 'FASTING', label: '공복' },
  { value: 'BEFORE_MEAL', label: '식전' },
  { value: 'AFTER_MEAL', label: '식후' },
] as const;

function MedicationAddPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [form, setForm] = useState<'ORAL' | 'INJECTION' | 'OTHER'>('ORAL');
  const [schedules, setSchedules] = useState<ScheduleInput[]>([]);
  const [memo, setMemo] = useState('');

  const [timeSlot, setTimeSlot] = useState<ScheduleInput['timeSlot']>('MORNING');
  const [timeDetail, setTimeDetail] = useState('08:00');
  const [condition, setCondition] = useState<NonNullable<ScheduleInput['condition']>>('ANY');
  const [dosage, setDosage] = useState('');

  const pageStyle = {
    minHeight: '100dvh',
    padding: '24px 16px 40px',
    backgroundColor: '#F8FAFC',
    fontFamily: '"Noto Sans KR", sans-serif',
    boxSizing: 'border-box' as const,
  };

  const containerStyle = {
    maxWidth: 430,
    margin: '0 auto',
  };

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  };

  const inputStyle = {
    width: '100%',
    height: 44,
    padding: '0 12px',
    border: '1px solid #D1D5DB',
    borderRadius: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box' as const,
  };

  const textareaStyle = {
    ...inputStyle,
    height: 120,
    padding: 12,
    resize: 'none' as const,
  };

  function handleAddSchedule() {
    const nextSchedule: ScheduleInput = {
      timeSlot,
      timeDetail: timeDetail.trim() || '08:00',
      condition,
      dosage: dosage.trim() || undefined,
    };

    setSchedules((prev) => [...prev, nextSchedule]);
    setTimeSlot('MORNING');
    setTimeDetail('08:00');
    setCondition('ANY');
    setDosage('');
  }

  function handleRemoveSchedule(index: number) {
    setSchedules((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('약 이름을 입력하세요.');
      return;
    }

    await useMedicationStore.getState().addMedication({
      name: name.trim(),
      form,
      memo: memo.trim(),
      schedules,
    });

    navigate('/medication');
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={{ margin: '0 0 20px', fontSize: 28, fontWeight: 800, color: '#111827' }}>
          약 추가
        </h1>

        <section style={cardStyle}>
          <label style={labelStyle} htmlFor="name">
            약 이름
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{ ...inputStyle, marginBottom: 16 }}
            placeholder="약 이름을 입력하세요"
          />

          <div style={labelStyle}>복용 형태</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {formOptions.map((option) => (
              <label
                key={option.value}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 44,
                  border: `1px solid ${form === option.value ? PRIMARY : '#D1D5DB'}`,
                  borderRadius: 10,
                  backgroundColor: form === option.value ? '#ECFDF5' : '#FFFFFF',
                  color: '#111827',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="form"
                  value={option.value}
                  checked={form === option.value}
                  onChange={() => setForm(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>

          <label style={labelStyle} htmlFor="memo">
            메모
          </label>
          <textarea
            id="memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            style={textareaStyle}
            placeholder="메모를 입력하세요"
          />
        </section>

        <section style={cardStyle}>
          <div style={{ marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            스케줄 추가
          </div>

          <label style={labelStyle} htmlFor="timeSlot">
            시간대
          </label>
          <select
            id="timeSlot"
            value={timeSlot}
            onChange={(event) => setTimeSlot(event.target.value as ScheduleInput['timeSlot'])}
            style={{ ...inputStyle, marginBottom: 12 }}
          >
            {timeSlotOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label style={labelStyle} htmlFor="timeDetail">
            상세 시간
          </label>
          <input
            id="timeDetail"
            type="text"
            value={timeDetail}
            onChange={(event) => setTimeDetail(event.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }}
            placeholder="08:00"
          />

          <label style={labelStyle} htmlFor="condition">
            복용 조건
          </label>
          <select
            id="condition"
            value={condition}
            onChange={(event) =>
              setCondition(event.target.value as NonNullable<ScheduleInput['condition']>)
            }
            style={{ ...inputStyle, marginBottom: 12 }}
          >
            {conditionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label style={labelStyle} htmlFor="dosage">
            용량
          </label>
          <input
            id="dosage"
            type="text"
            value={dosage}
            onChange={(event) => setDosage(event.target.value)}
            style={{ ...inputStyle, marginBottom: 16 }}
            placeholder="예: 1정, 5ml"
          />

          <button
            type="button"
            onClick={handleAddSchedule}
            style={{
              width: '100%',
              height: 46,
              border: 'none',
              borderRadius: 10,
              backgroundColor: PRIMARY,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            추가
          </button>
        </section>

        <section style={cardStyle}>
          <div style={{ marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            추가된 스케줄
          </div>

          {schedules.length === 0 ? (
            <div style={{ fontSize: 14, color: '#6B7280' }}>추가된 스케줄이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: 12,
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                        {timeSlotLabel} / {schedule.timeDetail}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                        {conditionLabel}
                        {schedule.dosage ? ` / ${schedule.dosage}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSchedule(index)}
                      style={{
                        width: 32,
                        height: 32,
                        border: '1px solid #FCA5A5',
                        borderRadius: 8,
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      X
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate('/medication')}
            style={{
              flex: 1,
              height: 48,
              border: '1px solid #D1D5DB',
              borderRadius: 10,
              backgroundColor: '#FFFFFF',
              color: '#111827',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            style={{
              flex: 1,
              height: 48,
              border: 'none',
              borderRadius: 10,
              backgroundColor: PRIMARY,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            저장
          </button>
        </div>
      </div>
    </main>
  );
}

export default MedicationAddPage;
