/** Fixed locale for deterministic server/client rendering (English-only invariant). */
const LOCALE = 'en-US';

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(n);
}

export function formatDate(ts: number | string | Date): string {
  const date = ts instanceof Date ? ts : new Date(ts);
  return new Intl.DateTimeFormat(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(ts: number | string | Date): string {
  const date = ts instanceof Date ? ts : new Date(ts);
  return new Intl.DateTimeFormat(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
