import type { CSSProperties, ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navLinkStyle = (isActive: boolean): CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 0 12px',
  textDecoration: 'none',
  gap: 3,
  color: isActive ? '#10B981' : '#9CA3AF',
  borderTop: isActive ? '2px solid #10B981' : '2px solid transparent',
  transition: 'color 0.15s',
  minHeight: 56,
});

const iconStyle: CSSProperties = { fontSize: 20, lineHeight: 1 };
const labelStyle: CSSProperties = { fontSize: 11, fontWeight: 600 };

export function BottomNav(): ReactElement {
  const { t } = useTranslation();

  return (
    <nav
      aria-label="하단 탭 네비게이션"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        background: '#ffffff',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
      }}
    >
      <NavLink to="/" end style={({ isActive }) => navLinkStyle(isActive)}>
        <span style={iconStyle} aria-hidden="true">🏠</span>
        <span style={labelStyle}>{t('nav.home')}</span>
      </NavLink>
      <NavLink to="/log" style={({ isActive }) => navLinkStyle(isActive)}>
        <span style={iconStyle} aria-hidden="true">📋</span>
        <span style={labelStyle}>{t('nav.log')}</span>
      </NavLink>
      <NavLink to="/medication" style={({ isActive }) => navLinkStyle(isActive)}>
        <span style={iconStyle} aria-hidden="true">💊</span>
        <span style={labelStyle}>{t('nav.medication')}</span>
      </NavLink>
      <NavLink to="/report" style={({ isActive }) => navLinkStyle(isActive)}>
        <span style={iconStyle} aria-hidden="true">📊</span>
        <span style={labelStyle}>{t('nav.report')}</span>
      </NavLink>
      <NavLink to="/profile" style={({ isActive }) => navLinkStyle(isActive)}>
        <span style={iconStyle} aria-hidden="true">👤</span>
        <span style={labelStyle}>{t('nav.profile')}</span>
      </NavLink>
    </nav>
  );
}

export default BottomNav;
