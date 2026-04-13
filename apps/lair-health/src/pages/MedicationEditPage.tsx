import { Link, useParams } from 'react-router-dom';

export function MedicationEditPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main
      style={{
        minHeight: '100dvh',
        padding: '24px 20px 32px',
        background:
          'linear-gradient(180deg, rgba(255, 247, 237, 0.95) 0%, rgba(248, 250, 252, 1) 38%, rgba(255, 255, 255, 1) 100%)',
        color: '#0f172a',
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        <header style={{ marginBottom: '18px' }}>
          <p style={{ margin: 0, color: '#c2410c', fontWeight: 700, fontSize: '0.875rem' }}>복약 수정</p>
          <h1 style={{ margin: '10px 0 0', fontSize: '1.8rem' }}>등록된 약 정보 편집</h1>
          <p style={{ margin: '12px 0 0', lineHeight: 1.7, color: '#64748b' }}>
            약 ID <strong>{id ?? '미지정'}</strong> 항목의 스케줄, 용량, 메모, 활성 상태를 수정하는 화면입니다.
          </p>
        </header>

        <section
          style={{
            padding: '22px',
            borderRadius: '24px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem' }}>편집 화면 구성</h2>
          <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.7 }}>
            기존 약 정보를 불러와 입력값을 채우고, 저장 또는 삭제 액션을 제공하는 폼이 이 위치에 들어옵니다.
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
            복약 목록으로
          </Link>
        </div>
      </div>
    </main>
  );
}

export default MedicationEditPage;
