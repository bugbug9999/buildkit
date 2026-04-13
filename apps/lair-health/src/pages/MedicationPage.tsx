import { Link } from 'react-router-dom';

const cardStyle = {
  padding: '18px',
  borderRadius: '20px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
};

const linkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '40px',
  padding: '0 14px',
  borderRadius: '999px',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 700,
};

export function MedicationPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        padding: '24px 20px 32px',
        background:
          'linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(248, 250, 252, 1) 42%, rgba(255, 255, 255, 1) 100%)',
        color: '#0f172a',
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        <header style={{ marginBottom: '18px' }}>
          <p style={{ margin: 0, color: '#0f766e', fontSize: '0.875rem', fontWeight: 700 }}>복약 관리</p>
          <h1 style={{ margin: '10px 0 0', fontSize: '1.85rem' }}>투약 일정과 복약 체크</h1>
          <p style={{ margin: '12px 0 0', lineHeight: 1.7, color: '#64748b' }}>
            등록된 약물 목록, 오늘 복약 여부, 일정 캘린더와 알림 상태를 관리하는 메인 화면입니다.
          </p>
        </header>

        <nav style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <Link to="/" style={linkStyle}>
            홈으로
          </Link>
          <Link to="/medication/add" style={linkStyle}>
            약 추가
          </Link>
          <Link to="/settings" style={linkStyle}>
            설정
          </Link>
        </nav>

        <div style={{ display: 'grid', gap: '14px' }}>
          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>등록된 약 목록</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.7 }}>
              약 이름, 용량, 반복 주기, 다음 복용 예정 시간이 카드 형태로 정리됩니다.
            </p>
          </section>
          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>오늘의 체크리스트</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.7 }}>
              일정별 체크 버튼과 복약 완료 상태가 오늘 날짜 기준으로 바로 표시됩니다.
            </p>
          </section>
          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>월간 캘린더</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.7 }}>
              날짜별 복약 이력을 색상과 마크로 요약해 누락된 일정과 연속 복약 현황을 보여줄 예정입니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default MedicationPage;
