import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 24,
            textAlign: 'center',
            background: '#F8FAFC',
          }}
        >
          <p style={{ fontSize: 16, color: '#0F172A', marginBottom: 8 }}>오류가 발생했습니다.</p>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
            {this.state.error?.message ?? '알 수 없는 오류'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
