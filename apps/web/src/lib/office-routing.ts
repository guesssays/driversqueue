import type { UserRole } from '../types';

export function buildOfficePath(officeSlug: string, suffix = ''): string {
  if (!suffix || suffix === '/') {
    return `/${officeSlug}`;
  }

  return `/${officeSlug}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

export function buildOfficeScreenPath(officeSlug: string, mode?: 'internal' | 'external'): string {
  return mode ? `/screen/${officeSlug}/${mode}` : `/screen/${officeSlug}`;
}

export function replaceOfficeSlug(pathname: string, nextOfficeSlug: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) {
    return `/${nextOfficeSlug}`;
  }

  parts[0] = nextOfficeSlug;
  return `/${parts.join('/')}`;
}

export function buildRoleDefaultPath(role: UserRole, officeSlug: string): string {
  switch (role) {
    case 'admin':
      return buildOfficePath(officeSlug, '/dashboard');
    case 'operator_queue':
      return buildOfficePath(officeSlug, '/operator/reg');
    case 'reception_security':
      return buildOfficePath(officeSlug, '/issue');
    default:
      return buildOfficePath(officeSlug, '/dashboard');
  }
}
