import type { Role } from '@/lib/rbac';

export function getDashboardPath(role?: string): string {
  switch ((role ?? '').toUpperCase()) {
    case 'SELLER':
      return '/seller';
    case 'ADMIN':
      return '/admin';
    case 'AUDITOR':
      return '/auditor';
    case 'BUYER':
    default:
      return '/buyer';
  }
}

export function isRole(value: string | undefined): value is Role {
  return value === 'BUYER' || value === 'SELLER' || value === 'AUDITOR' || value === 'ADMIN';
}
