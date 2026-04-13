import { Link } from 'react-router-dom';

export function MedicationAddPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        padding: '24px 20px 32px',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        <header
          style={{
            padding: '22px',
            borderRadius: '24px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
          }}
        >
          <p style={{ margin: 0, color: '#047857', fontWeight: 700, fontSize: '0.875rem' }}>새 약 등록</p>
          <h1 style={{ margin: '10px 0 0', fontSize: '1.8rem' }}>복약 정보 추가</h1>
          <p style={{ margin: '12px 0 0', lineHeight: 1.7, color: '#64748b' }}>
            약 이름, 복용 시간, 반복 주기, 용량, 메모를 입력해 개인 복약 스케줄을 만드는 페이지입니다.
          </p>
        </header>

        <section
          style={{
            marginTop: '18px',
            padding: '22px',
            borderRadius: '24px',
            background:
              'linear-gradient(180deg, rgba(236, 253, 245, 1) 0%, rgba(255, 255, 255, 1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.16)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem' }}>예정된 입력 항목</h2>
          <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.7 }}>
            텍스트 입력, 요일 선택, 시간 피커, 저장 버튼, 유효성 검증 메시지가 이 영역에 배치됩니다.
          </p>
        </section>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
          <Link
            to="/medication"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '42px',
              padding: '0 16px',
              borderRadius: '999px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}

export default MedicationAddPage;
