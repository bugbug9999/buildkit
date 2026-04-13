import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface SpinnerProps {
  label?: string;
}

const spinnerStyle: CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '999px',
  border: '3px solid rgba(16, 185, 129, 0.16)',
  borderTopColor: '#10b981',
  animation: 'lair-health-spin 0.9s linear infinite',
};

export function Spinner({ label }: SpinnerProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'grid',
        justifyItems: 'center',
        gap: '12px',
        padding: '24px 16px',
        color: '#475569',
      }}
    >
      <style>{'@keyframes lair-health-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <div aria-hidden="true" style={spinnerStyle} />
      <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{label ?? t('common.loading')}</p>
    </div>
  );
}

export default Spinner;
