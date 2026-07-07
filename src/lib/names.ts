/** Nom complet d'un étudiant : « Nom Postnom Prénom ». */
export function studentName(s: { lastName: string; postnom?: string | null; firstName: string }): string {
  return [s.lastName, s.postnom, s.firstName].filter(Boolean).join(' ');
}
