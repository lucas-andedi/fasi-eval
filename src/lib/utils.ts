import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format note /20 avec 2 décimales (RG-16). */
export function fmtGrade(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function initials(first?: string, last?: string): string {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?';
}

/** MM:SS ou HH:MM:SS selon la durée. */
export function fmtTimer(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Affiche la ou les dates d'une session : une date unique, ou une plage
 * « du … au … » si une date de fin distincte est renseignée (sessions multi-jours).
 */
export function formatSessionDates(session: {
  date: string | Date;
  endDate?: string | null;
}): string {
  const start = fmtDate(session.date);
  if (session.endDate) {
    const end = fmtDate(session.endDate);
    if (end !== start) return `du ${start} au ${end}`;
  }
  return start;
}

export function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
