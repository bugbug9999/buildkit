import { clsx, type ClassValue } from 'clsx';
import { formatDistanceToNowStrict } from 'date-fns';
import { ko } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 3 : 2,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

export function formatRelative(dateString?: string | null) {
  if (!dateString) return '-';
  return formatDistanceToNowStrict(new Date(dateString), { addSuffix: true, locale: ko });
}

export function formatDuration(sec?: number | null) {
  if (!sec) return '0.0s';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const minutes = Math.floor(sec / 60);
  const seconds = Math.round(sec % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function statusTone(status?: string | null) {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'running':
    case 'retrying':
      return 'text-warning';
    case 'failed':
    case 'cancelled':
      return 'text-danger';
    default:
      return 'text-muted-foreground';
  }
}

export function statusLabel(status?: string | null) {
  switch (status) {
    case 'completed':
      return '완료';
    case 'running':
      return '실행중';
    case 'retrying':
      return '재시도';
    case 'failed':
      return '실패';
    case 'cancelled':
      return '취소';
    case 'pending':
      return '대기';
    default:
      return status || '알 수 없음';
  }
}
