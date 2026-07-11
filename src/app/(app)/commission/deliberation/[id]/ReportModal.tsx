'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Printer, FileText } from 'lucide-react';
import { fmtGrade } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Feedback';
import { META_LABELS, type DeliberationReport } from './_helpers';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #delib-pv, #delib-pv * { visibility: visible !important; }
  #delib-pv {
    position: absolute; inset: 0; margin: 0; padding: 32px;
    max-height: none !important; overflow: visible !important;
    box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
    background: #fff !important;
  }
  .no-print { display: none !important; }
}
`;

function metaLabel(k: string) {
  return META_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase());
}

export function ReportModal({
  open,
  onClose,
  report,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  report: DeliberationReport | null;
  loading: boolean;
}) {
  const meta = report?.meta ?? {};
  const metaEntries = Object.entries(meta).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== 'object',
  );
  const statEntries = Object.entries(report?.stats ?? {});

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="no-print fixed inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-10 w-full max-w-3xl"
          >
            {/* Barre d'actions */}
            <div className="no-print mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="h-4 w-4" /> Procès-verbal de délibération
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  disabled={loading || !report}
                >
                  <Printer className="h-4 w-4" /> Imprimer
                </Button>
                <button
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Feuille PV */}
            <div
              id="delib-pv"
              className="max-h-[80vh] overflow-y-auto rounded-2xl border border-line bg-paper p-8 shadow-card"
            >
              {loading ? (
                <LoadingBlock label="Génération du procès-verbal…" />
              ) : !report ? (
                <p className="py-12 text-center text-sm text-ink/50">
                  Le procès-verbal n'est pas disponible.
                </p>
              ) : (
                <div className="space-y-7 text-ink">
                  {/* En-tête */}
                  <header className="border-b border-line-strong pb-5 text-center">
                    <p className="text-xs font-bold text-muted">
                      Faculté des Sciences de l'Ingénieur
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-extrabold">
                      {meta.title ?? 'Procès-verbal de délibération'}
                    </h2>
                    <p className="mt-1 text-sm text-muted">Annexe B — Délibération du jury</p>
                  </header>

                  {/* Méta */}
                  {metaEntries.length > 0 && (
                    <section className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                      {metaEntries.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 border-b border-line py-1.5 text-sm">
                          <span className="font-semibold text-muted">{metaLabel(k)}</span>
                          <span className="text-right text-ink">{String(v)}</span>
                        </div>
                      ))}
                    </section>
                  )}

                  {/* Jury */}
                  {report.jury && report.jury.length > 0 && (
                    <section>
                      <h3 className="mb-2 font-display text-base font-bold">Composition du jury</h3>
                      <ul className="grid gap-1.5 sm:grid-cols-2">
                        {report.jury.map((j, i) => (
                          <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                            <span className="font-semibold text-ink">{j.name}</span>
                            {j.role && <span className="text-muted"> — {j.role}</span>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Sections (réguliers / compensation) */}
                  {(report.sections ?? []).map((sec, si) => (
                    <section key={si}>
                      <h3 className="mb-2 font-display text-base font-bold">{sec.title}</h3>
                      <div className="overflow-x-auto rounded-lg border border-line">
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-surface text-left text-xs font-semibold text-muted">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Matricule</th>
                              <th className="px-3 py-2 font-semibold">Étudiant</th>
                              <th className="px-3 py-2 text-right font-semibold">Note</th>
                              <th className="px-3 py-2 font-semibold">Décision</th>
                              <th className="px-3 py-2 font-semibold">Observation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {sec.rows.map((r, ri) => (
                              <tr key={ri}>
                                <td className="px-3 py-2 font-mono text-xs text-muted">{r.matricule}</td>
                                <td className="px-3 py-2 font-medium text-ink">{r.name}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-ink tabular">
                                  {typeof r.finalGrade === 'number' ? fmtGrade(r.finalGrade) : '—'}
                                </td>
                                <td className="px-3 py-2 text-ink">{r.decision ?? '—'}</td>
                                <td className="px-3 py-2 text-muted">{r.observation ?? ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}

                  {/* Écarts */}
                  {report.discrepancies && report.discrepancies.length > 0 && (
                    <section>
                      <h3 className="mb-2 font-display text-base font-bold">Écarts significatifs</h3>
                      <ul className="space-y-1.5">
                        {report.discrepancies.map((d, i) => (
                          <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
                            <span className="font-mono text-xs text-subtle">{d.matricule}</span> ·{' '}
                            {d.criterionLabel}{' '}
                            {d.severity && (
                              <span className="font-semibold text-danger">
                                ({d.severity === 'NIVEAU_2' ? 'critique' : 'attention'})
                              </span>
                            )}
                            {d.note ? ` — ${d.note}` : ''}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Statistiques */}
                  {statEntries.length > 0 && (
                    <section>
                      <h3 className="mb-2 font-display text-base font-bold">Statistiques</h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {statEntries.map(([k, v]) => (
                          <div key={k} className="rounded-lg border border-line bg-surface p-3 text-center">
                            <p className="font-mono text-2xl font-bold text-ink tabular">{String(v)}</p>
                            <p className="mt-0.5 text-xs text-muted">{metaLabel(k)}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Signatures */}
                  <section className="grid grid-cols-2 gap-8 pt-8">
                    <div className="border-t border-ink/30 pt-2 text-center text-xs text-ink/55">
                      Le Président du jury
                    </div>
                    <div className="border-t border-ink/30 pt-2 text-center text-xs text-ink/55">
                      La Commission de coordination
                    </div>
                  </section>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
