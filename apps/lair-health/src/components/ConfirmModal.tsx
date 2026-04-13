import type { CSSProperties, ReactElement } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 340,
  borderRadius: 20,
  padding: 24,
  backgroundColor: '#FFFFFF',
  boxSizing: 'border-box',
};

const buttonStyle: CSSProperties = {
  flex: 1,
  height: 44,
  borderRadius: 12,
  fontSize: 14,
  cursor: 'pointer',
};

export function ConfirmModal({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmModalProps): ReactElement {
  return (
    <div role="presentation" style={overlayStyle} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={cardStyle}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#0F172A',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 15,
            color: '#64748B',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...buttonStyle,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...buttonStyle,
              border: 'none',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontWeight: 700,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}