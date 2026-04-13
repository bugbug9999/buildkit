import { Link } from 'react-router-dom';

const itemStyle = {
  padding: '18px',
  borderRadius: '20px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
};

export function SettingsPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        padding: '24px 20px 32px',
        background:
          'linear-gradient(180deg, rgba(224, 231, 255, 0.55) 0%, rgba(248, 250, 252, 1) 38%, rgba(255, 255, 255, 1) 100%)',
        color: '#0f172a',
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        <header style={{ marginBottom: '18px' }}>
          <p style={{ margin: 0, color: '#4338ca', fontWeight: 700, fontSize: '0.875rem' }}>설정</p>
          <h1 style={{ margin: '10px 0 0', fontSize: '1.8rem' }}>개인 환경과 알림 관리</h1>
          <p style={{ margin: '12px 0 0', lineHeight: 1.7, color: '#64748b' }}>
            프로필 정보, 복약 알림, 식단 분석 옵션, 서비스 안내와 같은 사용자 설정이 모이는 페이지입니다.
          </p>
        </header>

        <div style={{ display: 'grid', gap: '14px' }}>
          <section style={itemStyle}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>프로필</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.7 }}>
              닉네임, 연결된 계정 정보, 호스트 앱 연동 상태를 확인하는 영역입니다.
            </p>
          </section>
          <section style={itemStyle}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>알림</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.7 }}>
              복약 리마인더와 식사 기록 알림의 수신 여부 및 시간대를 설정할 수 있게 됩니다.
            </p>
          </section>
          <section style={itemStyle}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>서비스 관리</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.7 }}>
              이용 안내, 로그아웃, 문의 진입점 같은 관리성 기능이 이 카드 아래에 정리될 예정입니다.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '18px' }}>
          <Link
            to="/"
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
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}

export default SettingsPage;
