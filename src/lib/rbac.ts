import type { Role } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  JURY: 'Jury (enseignant)',
  COMMISSION: 'Commission de Coordination',
  ADMIN: 'Administrateur',
};

/** Page d'accueil selon les rôles (par priorité). */
export function homeFor(roles: Role[]): string {
  if (roles.includes('COMMISSION')) return '/commission';
  if (roles.includes('ADMIN')) return '/admin';
  if (roles.includes('JURY')) return '/jury';
  return '/login';
}

export interface NavItem {
  href: string;
  label: string;
  icon: string; // nom d'icône lucide
  roles: Role[];
}

// Navigation par rôle (icônes = clés lucide-react)
export const NAV: NavItem[] = [
  { href: '/commission', label: 'Tableau de bord', icon: 'LayoutDashboard', roles: ['COMMISSION'] },
  { href: '/commission/sessions', label: 'Sessions de défense', icon: 'CalendarClock', roles: ['COMMISSION'] },
  { href: '/commission/etudiants', label: 'Étudiants', icon: 'GraduationCap', roles: ['COMMISSION'] },
  { href: '/commission/promotions', label: 'Promotions', icon: 'SlidersHorizontal', roles: ['COMMISSION'] },
  { href: '/commission/referentiel', label: 'Référentiel', icon: 'ListChecks', roles: ['COMMISSION'] },
  { href: '/commission/deliberation', label: 'Délibérations', icon: 'Gavel', roles: ['COMMISSION'] },
  { href: '/commission/audit', label: "Journal d'audit", icon: 'ScrollText', roles: ['COMMISSION'] },

  { href: '/jury', label: 'Mes sessions', icon: 'ClipboardCheck', roles: ['JURY'] },

  { href: '/admin', label: 'Tableau de bord', icon: 'LayoutDashboard', roles: ['ADMIN'] },
  { href: '/admin/users', label: 'Comptes utilisateurs', icon: 'Users', roles: ['ADMIN'] },
  { href: '/admin/parametres', label: 'Paramètres système', icon: 'Settings', roles: ['ADMIN'] },
  { href: '/admin/audit', label: 'Journaux système', icon: 'ScrollText', roles: ['ADMIN'] },
];

export function navFor(roles: Role[]): NavItem[] {
  return NAV.filter((n) => n.roles.some((r) => roles.includes(r)));
}
