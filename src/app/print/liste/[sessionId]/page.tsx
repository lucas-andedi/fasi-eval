'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { fmtDate, fmtGrade } from '@/lib/utils';
import { studentName } from '@/lib/names';

// ————————————————————————————————— Types locaux —————————————————————————————————

interface JuryMember {
  firstName: string;
  lastName: string;
  isPresident?: boolean;
}
interface SessionStudent {
  student: {
    id: number;
    matricule: string;
    firstName: string;
    postnom?: string | null;
    lastName: string;
    projectSubject?: string | null;
  };
}
interface SessionDetail {
  title: string;
  date: string;
  endDate?: string | null;
  room?: string | null;
  academicYear?: string | null;
  promotion?: { code?: string; label?: string } | null;
  period?: { name?: string } | null;
  jury?: JuryMember[];
  students?: { regular?: SessionStudent[]; compensation?: SessionStudent[] };
}

interface ConsolidatedRow {
  studentId: number;
  finalGrade?: number | null;
  criterionAverages?: { criterionId: number; criterionLabel: string; average: number }[];
}
interface ConsolidatedResponse {
  regular?: ConsolidatedRow[];
  compensation?: ConsolidatedRow[];
}

/** Ligne d'affichage fusionnée (inscription + résultat consolidé). */
interface MergedRow {
  id: number;
  matricule: string;
  fullName: string;
  subject: string;
  finalGrade: number | null;
  evaluated: boolean;
}

type FilterMode = 'all' | 'evaluated' | 'not';

// ————————————————————————————————— Fusion des données —————————————————————————————————

/** Un étudiant est « évalué » si sa ligne consolidée a une note finale OU au moins une moyenne de critère. */
function isEvaluated(row: ConsolidatedRow | undefined): boolean {
  if (!row) return false;
  return row.finalGrade != null || (row.criterionAverages?.length ?? 0) > 0;
}

function mergeRows(
  students: SessionStudent[],
  consolidated: ConsolidatedRow[],
): MergedRow[] {
  const byId = new Map<number, ConsolidatedRow>();
  for (const r of consolidated) byId.set(r.studentId, r);
  return students.map((row) => {
    const s = row.student;
    const cons = byId.get(s.id);
    return {
      id: s.id,
      matricule: s.matricule,
      fullName: studentName(s),
      subject: s.projectSubject || '—',
      finalGrade: cons?.finalGrade ?? null,
      evaluated: isEvaluated(cons),
    };
  });
}

// ————————————————————————————————— Page —————————————————————————————————

export default function ListePrintPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = String(params.sessionId);

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [consolidated, setConsolidated] = useState<ConsolidatedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // État des contrôles, initialisé depuis l'URL si présent.
  const [showGrades, setShowGrades] = useState(searchParams.get('cotes') === '1');
  const [filter, setFilter] = useState<FilterMode>(() => {
    const f = searchParams.get('filtre');
    return f === 'evaluated' || f === 'not' ? f : 'all';
  });

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get<SessionDetail>(`/sessions/${sessionId}`),
      api.get<ConsolidatedResponse>(`/results/${sessionId}/consolidated`).catch(() => ({ data: {} as ConsolidatedResponse })),
    ])
      .then(([s, c]) => {
        if (!alive) return;
        setSession(s.data);
        setConsolidated(c.data);
      })
      .catch((e) => alive && setError(apiError(e)));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // Reflète l'état des contrôles dans l'URL (facultatif, sans recharger).
  useEffect(() => {
    const sp = new URLSearchParams();
    if (showGrades) sp.set('cotes', '1');
    if (filter !== 'all') sp.set('filtre', filter);
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : `?`, { scroll: false });
  }, [showGrades, filter, router]);

  const regularRows = useMemo(
    () => mergeRows(session?.students?.regular ?? [], consolidated?.regular ?? []),
    [session, consolidated],
  );
  const compensationRows = useMemo(
    () => mergeRows(session?.students?.compensation ?? [], consolidated?.compensation ?? []),
    [session, consolidated],
  );

  if (error) return <p className="print-note">Erreur : {error}</p>;
  if (!session) return <p className="print-note">Chargement…</p>;

  const jury = session.jury ?? [];
  const allRows = [...regularRows, ...compensationRows];
  const totalEvaluated = allRows.filter((r) => r.evaluated).length;

  const keep = (r: MergedRow) =>
    filter === 'all' ? true : filter === 'evaluated' ? r.evaluated : !r.evaluated;
  const shownRegular = regularRows.filter(keep);
  const shownCompensation = compensationRows.filter(keep);

  const dateLine =
    session.endDate && fmtDate(session.endDate) !== fmtDate(session.date)
      ? `Défenses du ${fmtDate(session.date)} au ${fmtDate(session.endDate)}`
      : `Défense du ${fmtDate(session.date)}`;

  const colCount = showGrades ? 6 : 5;

  let counter = 0;
  const renderRow = (r: MergedRow) => {
    counter += 1;
    return (
      <tr key={r.id}>
        <td className="num">{counter}</td>
        <td>{r.matricule}</td>
        <td>{r.fullName}</td>
        <td>{r.subject}</td>
        {showGrades && <td className="num">{fmtGrade(r.finalGrade)}</td>}
        <td>
          <span className={`ll-badge ${r.evaluated ? 'll-badge--ok' : 'll-badge--no'}`}>
            {r.evaluated ? 'Évalué' : 'Non évalué'}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <article>
      {/* Barre de contrôle — non imprimée */}
      <div className="no-print ll-controls">
        <div className="ll-control-group">
          <span className="ll-control-label">Cotes</span>
          <button
            type="button"
            className={`ll-btn ${showGrades ? 'll-btn--on' : ''}`}
            onClick={() => setShowGrades((v) => !v)}
            aria-pressed={showGrades}
          >
            {showGrades ? 'Afficher les cotes : ON' : 'Afficher les cotes : OFF'}
          </button>
        </div>
        <div className="ll-control-group">
          <span className="ll-control-label">Filtrer</span>
          <div className="ll-segmented">
            <button
              type="button"
              className={`ll-btn ${filter === 'all' ? 'll-btn--on' : ''}`}
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
            >
              Tous
            </button>
            <button
              type="button"
              className={`ll-btn ${filter === 'evaluated' ? 'll-btn--on' : ''}`}
              onClick={() => setFilter('evaluated')}
              aria-pressed={filter === 'evaluated'}
            >
              Évalués
            </button>
            <button
              type="button"
              className={`ll-btn ${filter === 'not' ? 'll-btn--on' : ''}`}
              onClick={() => setFilter('not')}
              aria-pressed={filter === 'not'}
            >
              Non évalués
            </button>
          </div>
        </div>
      </div>

      <header className="print-header">
        <p className="print-eyebrow">
          Université Protestante au Congo — Faculté des Sciences Informatiques
        </p>
        <h1 className="print-title">Liste des étudiants — {session.title}</h1>
        <div className="print-meta">
          {session.promotion && (
            <div>
              {session.promotion.label}
              {session.promotion.code ? ` (${session.promotion.code})` : ''}
              {session.period?.name ? ` · ${session.period.name}` : ''}
            </div>
          )}
          <div>{dateLine}</div>
          {session.room && <div>Salle : {session.room}</div>}
          {session.academicYear && <div>Année académique : {session.academicYear}</div>}
          {jury.length > 0 && (
            <div>
              Jury :{' '}
              {jury
                .map((m) => `${m.firstName} ${m.lastName}${m.isPresident ? ' (Président)' : ''}`)
                .join(', ')}
            </div>
          )}
        </div>
      </header>

      <p className="print-note">
        {totalEvaluated} évalué{totalEvaluated > 1 ? 's' : ''} / {allRows.length} au total
        {filter !== 'all' && ` · filtre : ${filter === 'evaluated' ? 'évalués' : 'non évalués'}`}
      </p>

      <table className="print-table" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th className="num">N°</th>
            <th>Matricule</th>
            <th>Nom complet</th>
            <th>Sujet</th>
            {showGrades && <th className="num">Note finale /20</th>}
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {allRows.length === 0 ? (
            <tr>
              <td colSpan={colCount}>Aucun étudiant inscrit.</td>
            </tr>
          ) : shownRegular.length === 0 && shownCompensation.length === 0 ? (
            <tr>
              <td colSpan={colCount}>Aucun étudiant ne correspond au filtre.</td>
            </tr>
          ) : (
            <>
              {shownRegular.map(renderRow)}
              {shownCompensation.length > 0 && (
                <tr className="print-subhead">
                  <td colSpan={colCount}>Compensation</td>
                </tr>
              )}
              {shownCompensation.map(renderRow)}
            </>
          )}
        </tbody>
      </table>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .ll-controls {
              width: 100%;
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              align-items: flex-end;
              padding: 0 0 18px;
              margin-bottom: 12px;
              border-bottom: 1px solid #e5e5e5;
            }
            .ll-control-group { display: flex; flex-direction: column; gap: 6px; }
            .ll-control-label {
              font-size: 11px;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              color: #55554e;
              font-weight: 600;
            }
            .ll-segmented { display: inline-flex; gap: 6px; }
            .ll-btn {
              background: #ffffff;
              color: #1a1a17;
              border: 1px solid #d4d4d4;
              padding: 7px 14px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              border-radius: 2px;
              font-family: inherit;
            }
            .ll-btn:hover { background: #f5f5f4; }
            .ll-btn--on {
              background: #0d9268;
              color: #ffffff;
              border-color: #0d9268;
            }
            .ll-btn--on:hover { background: #0a7a56; }
            .ll-badge {
              display: inline-block;
              padding: 2px 8px;
              font-size: 11px;
              font-weight: 600;
              border-radius: 2px;
              white-space: nowrap;
              border: 1px solid transparent;
            }
            .ll-badge--ok { background: #e7f5ef; color: #0a7a56; border-color: #b7e2d1; }
            .ll-badge--no { background: #f5f5f4; color: #55554e; border-color: #e5e5e5; }
          `,
        }}
      />
    </article>
  );
}
