import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { useSession } from './hooks/useSession';
import { getPlatformType } from './platform';
import { useUIStore } from './store/uiStore';

const MealDashboardPage = lazy(() => import('./pages/MealDashboardPage'));
const MedicationPage = lazy(() => import('./pages/MedicationPage'));
const MedicationAddPage = lazy(() => import('./pages/MedicationAddPage'));
const MedicationEditPage = lazy(() => import('./pages/MedicationEditPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const LogPage = lazy(() => import('./pages/LogPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function PageLoader(): ReactElement {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background:
          'linear-gradient(180deg, rgba(236, 253, 245, 1) 0%, rgba(248, 250, 252, 1) 45%, rgba(255, 255, 255, 1) 100%)',
        color: '#0f172a',
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '320px',
          padding: '28px 24px',
          borderRadius: '24px',
          backgroundColor: '#ffffff',
          boxShadow: '0 18px 48px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>레어헬스 준비 중</p>
        <p style={{ margin: '10px 0 0', fontSize: '0.9375rem', lineHeight: 1.6, color: '#64748b' }}>
          페이지를 불러오고 있습니다. 잠시만 기다려 주세요.
        </p>
      </div>
    </div>
  );
}

function AppShell(): ReactElement {
  useSession();
  const location = useLocation();
  const onboardingDone = useUIStore((state) => state.onboardingDone);
  const token = useUIStore((state) => state.token);
  const platform = getPlatformType();

  // Capacitor: 토큰 없으면 로그인 페이지로
  if (platform !== 'miniapp' && !token && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // 미니앱에서 /login 접근 시 홈으로
  if (platform === 'miniapp' && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  if (!onboardingDone && location.pathname !== '/onboarding' && location.pathname !== '/login') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<MealDashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/log" element={<LogPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/medication" element={<MedicationPage />} />
        <Route path="/medication/add" element={<MedicationAddPage />} />
        <Route path="/medication/:id/edit" element={<MedicationEditPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App(): ReactElement {
  const isCapacitor = import.meta.env.VITE_PLATFORM === 'capacitor';
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <ErrorBoundary>
      {isCapacitor ? (
        <HashRouter>
          <OfflineBanner />
          <AppShell />
        </HashRouter>
      ) : (
        <BrowserRouter basename={basename}>
          <OfflineBanner />
          <AppShell />
        </BrowserRouter>
      )}
    </ErrorBoundary>
  );
}
