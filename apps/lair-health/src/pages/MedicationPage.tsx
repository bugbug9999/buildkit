import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';
import { useMedicationStore } from '../store/medicationStore';

const TIME_SLOT_LABELS = {
  MORNING: '아침',
  LUNCH: '점심',
  EVENING: '저녁',
  BEDTIME: '취침전',
} as const;

const FORM_LABELS = {
  ORAL: '경구',
  INJECTION: '주사',
  OTHER: '기타',
} as const;

export default function MedicationPage() {
  const { medications, logs, loading, error, loadMedications, loadLogs, upsertLog } =
    useMedicationStore();
  const todayStr = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    void loadMedications();
    void loadLogs(todayStr, todayStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checklistItems = useMemo(
    () =>
      medications.flatMap((medication) =>
        medication.schedules
          .filter((schedule) => schedule.isActive)
          .map((schedule) => ({ med: medication, sch: schedule })),
      ),
    [medications],
  );

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: '#F8FAFC',
        padding: '24px 20px 100px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 430,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#111827' }}>복약 관리</h1>
          <Link
            to="/medication/add"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 40,
              padding: '0 16px',
              borderRadius: 999,
              backgroundColor: '#111827',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            약 추가
          </Link>
        </header>

        {loading ? (
          <section
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
            }}
          >
            <Spinner label="복약 정보를 불러오는 중입니다." />
          </section>
        ) : null}

        {error ? (
          <section
            style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 20,
              padding: 20,
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {error}
          </section>
        ) : null}

        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
              오늘의 체크리스트
            </h2>
          </div>

          {checklistItems.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                fontSize: 14,
              }}
            >
              오늘 체크할 복약 일정이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {checklistItems.map(({ med, sch }) => {
                const log = logs.find(
                  (item) =>
                    item.scheduleId === sch.id && item.scheduledDate.startsWith(todayStr),
                );
                const isTaken = log?.status === 'TAKEN';

                return (
                  <div
                    key={sch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: 16,
                      borderRadius: 16,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#111827',
                          wordBreak: 'keep-all',
                        }}
                      >
                        {med.name}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 14,
                          color: '#64748B',
                          wordBreak: 'keep-all',
                        }}
                      >
                        {TIME_SLOT_LABELS[sch.timeSlot]}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void upsertLog({
                          scheduleId: sch.id,
                          scheduledDate: todayStr,
                          status: isTaken ? 'MISSED' : 'TAKEN',
                        });
                      }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        border: 'none',
                        backgroundColor: isTaken ? '#10B981' : '#CBD5E1',
                        color: '#FFFFFF',
                        fontSize: 22,
                        fontWeight: 800,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      aria-label={`${med.name} ${TIME_SLOT_LABELS[sch.timeSlot]} 복약 체크`}
                    >
                      {isTaken ? '✓' : ''}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
              약 목록
            </h2>
          </div>

          {medications.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                fontSize: 14,
              }}
            >
              등록된 약이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {medications.map((medication) => (
                <div
                  key={medication.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#111827',
                        wordBreak: 'keep-all',
                      }}
                    >
                      {medication.name}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        color: '#64748B',
                      }}
                    >
                      {FORM_LABELS[medication.form]}
                    </div>
                  </div>

                  <Link
                    to={`/medication/${medication.id}/edit`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 38,
                      padding: '0 14px',
                      borderRadius: 999,
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    수정
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
