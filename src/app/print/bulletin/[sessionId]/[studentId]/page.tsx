'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { fmtDate, fmtGrade } from '@/lib/utils';
import { studentName } from '@/lib/names';

interface CriterionAverage {
  criterionId: number;
  criterionLabel: string;
  average: number | null;
}
interface CommentEntry {
  criterionId: number;
  criterionLabel: string;
  comment: string;
}
interface ConsolidatedStudent {
  studentId: number;
  matricule: string;
  firstName: string;
  postnom?: string | null;
  lastName: string;
  finalGrade: number | null;
  criterionAverages: CriterionAverage[];
  comments?: CommentEntry[];
}
interface Consolidated {
  session?: { title?: string; academicYear?: string; date?: string; status?: string };
  promotion?: { code?: string; label?: string } | null;
  regular?: ConsolidatedStudent[];
  compensation?: ConsolidatedStudent[];
}
interface DecisionRow {
  studentId: number;
  decision?: string;
  observation?: string | null;
}
interface DeliberationView {
  decisions?: DecisionRow[];
}

const DECISION_LABEL: Record<string, string> = {
  ADMIS: 'Admis',
  AJOURNE: 'Ajourné',
  COMPENSATION: 'Compensation',
};

export default function BulletinPrintPage() {
  const params = useParams();
  const sessionId = String(params.sessionId);
  const studentId = Number(params.studentId);

  const [consolidated, setConsolidated] = useState<Consolidated | null>(null);
  const [delib, setDelib] = useState<DeliberationView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get<Consolidated>(`/results/${sessionId}/consolidated`),
      api.get<DeliberationView>(`/deliberations/${sessionId}`),
    ])
      .then(([c, d]) => {
        if (!alive) return;
        setConsolidated(c.data);
        setDelib(d.data);
      })
      .catch((e) => alive && setError(apiError(e)));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (error) return <p className="print-note">Erreur : {error}</p>;
  if (!consolidated) return <p className="print-note">Chargement…</p>;

  const regular = consolidated.regular ?? [];
  const compensation = consolidated.compensation ?? [];
  const inRegular = regular.find((s) => Number(s.studentId) === studentId);
  const inCompensation = compensation.find((s) => Number(s.studentId) === studentId);
  const student = inRegular ?? inCompensation;

  if (!student) return <p className="print-note">Étudiant introuvable dans cette session.</p>;

  const statut = inCompensation ? 'Compensation' : 'Régulier';
  const decisions = delib?.decisions ?? [];
  const decisionRow = decisions.find((d) => Number(d.studentId) === studentId);
  const decisionLabel = decisionRow?.decision
    ? DECISION_LABEL[decisionRow.decision] ?? decisionRow.decision
    : '—';
  const observation = decisionRow?.observation ?? null;

  const comments = (student.comments ?? []).filter((c) => c.comment && c.comment.trim());
  const session = consolidated.session;
  const promotion = consolidated.promotion;

  return (
    <article>
      <header className="print-header">
        <p className="print-eyebrow">
          Université Protestante au Congo — Faculté des Sciences Informatiques
        </p>
        <h1 className="print-title">Bulletin de délibération</h1>
        <div className="print-meta">
          {session?.title && (
            <div>
              <strong>{session.title}</strong>
            </div>
          )}
          {promotion && (
            <div>
              {promotion.label}
              {promotion.code ? ` (${promotion.code})` : ''}
            </div>
          )}
          {session?.date && <div>Défense du {fmtDate(session.date)}</div>}
          {session?.academicYear && <div>Année académique : {session.academicYear}</div>}
        </div>
      </header>

      <h2 className="print-section-title">Identité</h2>
      <table className="print-table">
        <tbody>
          <tr>
            <th style={{ width: '32%' }}>Matricule</th>
            <td>{student.matricule}</td>
          </tr>
          <tr>
            <th>Nom complet</th>
            <td>{studentName(student)}</td>
          </tr>
          <tr>
            <th>Statut</th>
            <td>{statut}</td>
          </tr>
        </tbody>
      </table>

      <h2 className="print-section-title">Résultats</h2>
      <table className="print-table">
        <thead>
          <tr>
            <th>Critère</th>
            <th className="num">Moyenne /20</th>
          </tr>
        </thead>
        <tbody>
          {student.criterionAverages.length === 0 ? (
            <tr>
              <td colSpan={2}>Aucune cotation consolidée.</td>
            </tr>
          ) : (
            student.criterionAverages.map((c) => (
              <tr key={c.criterionId}>
                <td>{c.criterionLabel}</td>
                <td className="num">{fmtGrade(c.average)}</td>
              </tr>
            ))
          )}
          <tr>
            <th>Note finale</th>
            <td className="num">
              <strong>{fmtGrade(student.finalGrade)}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="print-section-title">Décision</h2>
      <table className="print-table">
        <tbody>
          <tr>
            <th style={{ width: '32%' }}>Décision du jury</th>
            <td>{decisionLabel}</td>
          </tr>
          {observation && (
            <tr>
              <th>Observation</th>
              <td>{observation}</td>
            </tr>
          )}
        </tbody>
      </table>

      {comments.length > 0 && (
        <>
          <h2 className="print-section-title">Commentaires du jury</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Critère</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c, i) => (
                <tr key={c.criterionId + '-' + i}>
                  <td>{c.criterionLabel}</td>
                  <td>{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div
        style={{
          marginTop: '48px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '48px',
          fontSize: '13px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ borderTop: '1px solid #1a1a17', paddingTop: '6px' }}>
            Le Président du jury
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderTop: '1px solid #1a1a17', paddingTop: '6px' }}>La Commission</div>
        </div>
      </div>
    </article>
  );
}
