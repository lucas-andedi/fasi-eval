'use client';

import { useEffect, useState } from 'react';
import { api, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';

interface PromotionReportRow {
  promotionId: number;
  code: string;
  label: string;
  sessions: number;
  students: number;
  evaluated: number;
  admis: number;
  ajournes: number;
  compensation: number;
  avgGrade: number | null;
  discrepancies: number;
}
interface SessionReportRow {
  sessionId: number;
  title: string;
  promotionCode: string;
  period: string | null;
  status: string;
  students: number;
  evaluated: number;
  admis: number;
  ajournes: number;
  compensation: number;
  avgGrade: number | null;
  discrepancies: number;
}
interface ReportsOverview {
  totals: {
    promotions: number;
    sessions: number;
    students: number;
    evaluated: number;
    admis: number;
    ajournes: number;
    compensation: number;
    avgGrade: number | null;
    discrepancies: number;
  };
  byPromotion: PromotionReportRow[];
  bySession: SessionReportRow[];
}

const fmtGrade = (g: number | null) => (g == null ? '—' : g.toFixed(2));

export default function RapportPrintPage() {
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<ReportsOverview>('/reports/overview')
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="print-note">Erreur : {error}</p>;
  if (!data) return <p className="print-note">Chargement…</p>;

  const t = data.totals;

  const totalCards: { label: string; value: React.ReactNode }[] = [
    { label: 'Promotions', value: t.promotions },
    { label: 'Sessions', value: t.sessions },
    { label: 'Étudiants', value: t.students },
    { label: 'Évalués', value: t.evaluated },
    { label: 'Admis', value: t.admis },
    { label: 'Ajournés', value: t.ajournes },
    { label: 'Compensation', value: t.compensation },
    { label: 'Écarts', value: t.discrepancies },
    { label: 'Moyenne générale', value: fmtGrade(t.avgGrade) },
  ];

  return (
    <article>
      <header className="print-header">
        <p className="print-eyebrow">
          Université Protestante au Congo — Faculté des Sciences Informatiques
        </p>
        <h1 className="print-title">Rapport statistique</h1>
        <div className="print-meta">
          <div>Synthèse des sessions de défense et des délibérations</div>
          <div>Édité le {fmtDate(new Date().toISOString())}</div>
        </div>
      </header>

      <h2 className="print-section-title">Totaux</h2>
      <div className="totals-grid">
        {totalCards.map((c) => (
          <div key={c.label} className="total-cell">
            <span className="total-value">{c.value}</span>
            <span className="total-label">{c.label}</span>
          </div>
        ))}
      </div>

      <h2 className="print-section-title">Par promotion</h2>
      <table className="print-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Promotion</th>
            <th className="num">Sessions</th>
            <th className="num">Étudiants</th>
            <th className="num">Évalués</th>
            <th className="num">Admis</th>
            <th className="num">Ajournés</th>
            <th className="num">Comp.</th>
            <th className="num">Moyenne</th>
            <th className="num">Écarts</th>
          </tr>
        </thead>
        <tbody>
          {data.byPromotion.length === 0 ? (
            <tr>
              <td colSpan={10}>Aucune promotion.</td>
            </tr>
          ) : (
            data.byPromotion.map((r) => (
              <tr key={r.promotionId}>
                <td>{r.code}</td>
                <td>{r.label}</td>
                <td className="num">{r.sessions}</td>
                <td className="num">{r.students}</td>
                <td className="num">{r.evaluated}</td>
                <td className="num">{r.admis}</td>
                <td className="num">{r.ajournes}</td>
                <td className="num">{r.compensation}</td>
                <td className="num">{fmtGrade(r.avgGrade)}</td>
                <td className="num">{r.discrepancies}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="print-section-title">Par session</h2>
      <table className="print-table">
        <thead>
          <tr>
            <th>Session</th>
            <th>Promo</th>
            <th>Période</th>
            <th>Statut</th>
            <th className="num">Étud.</th>
            <th className="num">Éval.</th>
            <th className="num">Admis</th>
            <th className="num">Ajournés</th>
            <th className="num">Comp.</th>
            <th className="num">Moyenne</th>
            <th className="num">Écarts</th>
          </tr>
        </thead>
        <tbody>
          {data.bySession.length === 0 ? (
            <tr>
              <td colSpan={11}>Aucune session.</td>
            </tr>
          ) : (
            data.bySession.map((r) => (
              <tr key={r.sessionId}>
                <td>{r.title}</td>
                <td>{r.promotionCode}</td>
                <td>{r.period ?? '—'}</td>
                <td>{r.status}</td>
                <td className="num">{r.students}</td>
                <td className="num">{r.evaluated}</td>
                <td className="num">{r.admis}</td>
                <td className="num">{r.ajournes}</td>
                <td className="num">{r.compensation}</td>
                <td className="num">{fmtGrade(r.avgGrade)}</td>
                <td className="num">{r.discrepancies}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .totals-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1px;
              background: #e5e5e5;
              border: 1px solid #e5e5e5;
              margin-bottom: 4px;
            }
            .total-cell {
              background: #ffffff;
              padding: 10px 12px;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .total-value {
              font-size: 20px;
              font-weight: 700;
              color: #1a1a17;
              font-family: var(--font-display), var(--font-sans), sans-serif;
            }
            .total-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #55554e;
            }
            @media print {
              .totals-grid { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `,
        }}
      />
    </article>
  );
}
