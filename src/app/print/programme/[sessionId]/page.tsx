'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import { studentName } from '@/lib/names';

interface JuryMember {
  firstName: string;
  lastName: string;
  roles?: string[];
  isPresident?: boolean;
}
interface StudentRow {
  student: {
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
  jury?: JuryMember[];
  students?: { regular?: StudentRow[]; compensation?: StudentRow[] };
}

export default function ProgrammePrintPage() {
  const params = useParams();
  const sessionId = String(params.sessionId);
  const [data, setData] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<SessionDetail>(`/sessions/${sessionId}`)
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (error) return <p className="print-note">Erreur : {error}</p>;
  if (!data) return <p className="print-note">Chargement…</p>;

  const jury = data.jury ?? [];
  const regular = data.students?.regular ?? [];
  const compensation = data.students?.compensation ?? [];

  const dateLine =
    data.endDate && fmtDate(data.endDate) !== fmtDate(data.date)
      ? `Défenses du ${fmtDate(data.date)} au ${fmtDate(data.endDate)}`
      : `Défense du ${fmtDate(data.date)}`;

  let counter = 0;
  const studentRow = (row: StudentRow) => {
    counter += 1;
    const s = row.student;
    return (
      <tr key={s.matricule + counter}>
        <td className="num">{counter}</td>
        <td>{s.matricule}</td>
        <td>{studentName(s)}</td>
        <td>{s.projectSubject || '—'}</td>
      </tr>
    );
  };

  return (
    <article>
      <header className="print-header">
        <p className="print-eyebrow">
          Université Protestante au Congo — Faculté des Sciences Informatiques
        </p>
        <h1 className="print-title">Programme des défenses</h1>
        <div className="print-meta">
          <div>
            <strong>{data.title}</strong>
          </div>
          {data.promotion && (
            <div>
              {data.promotion.label}
              {data.promotion.code ? ` (${data.promotion.code})` : ''}
            </div>
          )}
          <div>{dateLine}</div>
          {data.room && <div>Salle : {data.room}</div>}
          {data.academicYear && <div>Année académique : {data.academicYear}</div>}
        </div>
      </header>

      <h2 className="print-section-title">Jury</h2>
      <table className="print-table">
        <thead>
          <tr>
            <th>Membre du jury</th>
            <th>Rôle</th>
          </tr>
        </thead>
        <tbody>
          {jury.length === 0 ? (
            <tr>
              <td colSpan={2}>Aucun membre affecté.</td>
            </tr>
          ) : (
            jury.map((m, i) => (
              <tr key={i}>
                <td>
                  {m.firstName} {m.lastName}
                </td>
                <td>{m.isPresident ? 'Président du jury' : 'Membre'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="print-section-title">Étudiants</h2>
      <table className="print-table">
        <thead>
          <tr>
            <th className="num">N°</th>
            <th>Matricule</th>
            <th>Nom complet</th>
            <th>Sujet</th>
          </tr>
        </thead>
        <tbody>
          {regular.length === 0 && compensation.length === 0 ? (
            <tr>
              <td colSpan={4}>Aucun étudiant inscrit.</td>
            </tr>
          ) : (
            <>
              {regular.map(studentRow)}
              {compensation.length > 0 && (
                <tr className="print-subhead">
                  <td colSpan={4}>Compensation</td>
                </tr>
              )}
              {compensation.map(studentRow)}
            </>
          )}
        </tbody>
      </table>
    </article>
  );
}
