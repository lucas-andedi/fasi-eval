'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  Gauge,
  Gavel,
  GraduationCap,
  Layers,
  ScrollText,
  SlidersHorizontal,
  TriangleAlert,
  UserX,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { SessionStatusBadge } from '@/components/ui/status';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import { downloadBlobResponse } from '@/app/(app)/commission/deliberation/[id]/_helpers';
import type { DefenseSession, Promotion, Student } from '@/lib/types';

// ── Rapports clés (miroir backend GET /reports/overview) ────────────
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
  status: DefenseSession['status'];
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

type SessionRow = DefenseSession & {
  promotion?: Promotion;
  _count?: { jury?: number; students?: number };
};

const SHORTCUTS = [
  {
    href: '/commission/sessions',
    label: 'Sessions de défense',
    desc: 'Planifier, composer les jurys, ouvrir les défenses.',
    icon: CalendarClock,
  },
  {
    href: '/commission/promotions',
    label: 'Promotions & critères',
    desc: 'Grilles d’évaluation et paramètres de cotation.',
    icon: SlidersHorizontal,
  },
  {
    href: '/commission/deliberation',
    label: 'Délibérations',
    desc: 'Consolider, décider, publier les résultats.',
    icon: Gavel,
  },
  {
    href: '/commission/audit',
    label: 'Journal d’audit',
    desc: 'Traçabilité complète des actions.',
    icon: ScrollText,
  },
] as const;

export default function CommissionDashboard() {
  const sessionsQ = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<SessionRow[]>('/sessions')).data,
  });
  const promotionsQ = useQuery({
    queryKey: ['reference', 'promotions'],
    queryFn: async () => (await api.get<Promotion[]>('/reference/promotions')).data,
  });
  const studentsQ = useQuery({
    queryKey: ['students'],
    queryFn: async () => (await api.get<Student[]>('/students')).data,
  });
  const reportsQ = useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => (await api.get<ReportsOverview>('/reports/overview')).data,
  });

  const sessions = sessionsQ.data ?? [];
  const promotions = promotionsQ.data ?? [];
  const students = studentsQ.data ?? [];
  const report = reportsQ.data;

  const exportExcel = async () => {
    const res = await api.get<Blob>('/reports/export', { responseType: 'blob' });
    downloadBlobResponse(res, 'rapport_statistique.xlsx');
  };

  const count = (s: DefenseSession['status']) => sessions.filter((x) => x.status === s).length;

  const recent = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const loading = sessionsQ.isLoading || promotionsQ.isLoading;

  return (
    <div>
      <PageHeader
        eyebrow="Commission de Coordination"
        title="Tableau de bord"
        description="Sessions de défense, grilles d’évaluation et délibérations."
        action={
          <>
            <Link href="/commission/sessions">
              <Button variant="primary">
                <CalendarClock className="h-4 w-4" /> Gérer les sessions
              </Button>
            </Link>
            <Link href="/commission/promotions">
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4" /> Configurer
              </Button>
            </Link>
          </>
        }
      />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions ouvertes" value={count('OUVERTE')} icon={DoorOpen} tone="teal" index={0} hint="Défenses en cours" />
        <StatCard label="En délibération" value={count('DELIBERATION')} icon={Gavel} tone="violet" index={1} hint="À consolider" />
        <StatCard label="Sessions clôturées" value={count('CLOTUREE')} icon={CalendarClock} tone="violet" index={2} hint="Résultats publiés" />
        <StatCard label="Promotions configurées" value={promotions.length} icon={Layers} tone="violet" index={3} hint={`${students.length} étudiant${students.length > 1 ? 's' : ''}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sessions récentes */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 lg:col-span-2"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-ink">Sessions récentes</h3>
              <p className="mt-0.5 text-sm text-muted">Les dernières défenses planifiées ou tenues.</p>
            </div>
            <Link
              href="/commission/sessions"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <LoadingBlock />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Aucune session"
              description="Créez une première session de défense pour démarrer."
            />
          ) : (
            <div className="space-y-1">
              {recent.map((s) => (
                <Link
                  key={s.id}
                  href={`/commission/sessions/${s.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition hover:border-line hover:bg-surface"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-muted">
                    <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{s.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle">
                      <span className="font-medium text-muted">{s.promotion?.code ?? '—'}</span>
                      <span>·</span>
                      <span>{fmtDate(s.date)}</span>
                      {s._count?.students !== undefined && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {s._count.students}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <SessionStatusBadge status={s.status} />
                  <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-muted" />
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Raccourcis */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-ink">Raccourcis</h3>
            <p className="mt-0.5 text-sm text-muted">Accès rapide à vos espaces.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {SHORTCUTS.map((sc) => (
              <Link
                key={sc.href}
                href={sc.href}
                className="group flex items-center gap-3 rounded-xl border border-line bg-paper p-4 transition hover:border-line-strong hover:bg-surface"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-muted">
                  <sc.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{sc.label}</p>
                  <p className="truncate text-xs text-subtle">{sc.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-muted" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─────────────── Rapports clés ─────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-10"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              <BarChart3 className="h-5 w-5 text-accent" /> Rapports clés
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Statistiques agrégées par promotion et par session de défense.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportExcel} disabled={!report}>
              <FileSpreadsheet className="h-4 w-4" /> Exporter Excel
            </Button>
            <a href="/print/rapport" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <FileText className="h-4 w-4" /> Rapport PDF
              </Button>
            </a>
          </div>
        </div>

        {reportsQ.isLoading ? (
          <LoadingBlock />
        ) : !report ? (
          <EmptyState
            icon={BarChart3}
            title="Statistiques indisponibles"
            description="Les données de rapport n’ont pas pu être chargées."
          />
        ) : (
          <>
            {/* Totaux globaux */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
              <StatCard label="Sessions" value={report.totals.sessions} icon={CalendarClock} tone="violet" index={0} />
              <StatCard label="Étudiants" value={report.totals.students} icon={Users} tone="teal" index={1} />
              <StatCard label="Évalués" value={report.totals.evaluated} icon={CheckCircle2} tone="teal" index={2} />
              <StatCard label="Admis" value={report.totals.admis} icon={Award} tone="teal" index={3} />
              <StatCard label="Ajournés" value={report.totals.ajournes} icon={UserX} tone="gold" index={4} />
              <StatCard label="Écarts" value={report.totals.discrepancies} icon={TriangleAlert} tone="danger" index={5} />
              <StatCard label="Moyenne générale" value={fmtGrade(report.totals.avgGrade)} icon={Gauge} tone="violet" index={6} />
            </div>

            {/* Par promotion */}
            <div className="mb-8">
              <h3 className="mb-3 text-base font-bold text-ink">Par promotion</h3>
              {report.byPromotion.length === 0 ? (
                <EmptyState icon={Layers} title="Aucune promotion" description="Aucune donnée à agréger." />
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <THead>
                        <TR>
                          <TH>Promotion</TH>
                          <TH className="text-right">Sessions</TH>
                          <TH className="text-right">Étudiants</TH>
                          <TH className="text-right">Évalués</TH>
                          <TH className="text-right">Admis</TH>
                          <TH className="text-right">Ajournés</TH>
                          <TH className="text-right">Comp.</TH>
                          <TH className="text-right">Moyenne</TH>
                          <TH className="text-right">Écarts</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {report.byPromotion.map((r) => (
                          <TR key={r.promotionId}>
                            <TD>
                              <span className="font-medium text-ink">{r.code}</span>
                              <span className="ml-2 text-subtle">{r.label}</span>
                            </TD>
                            <TD className="text-right tabular">{r.sessions}</TD>
                            <TD className="text-right tabular">{r.students}</TD>
                            <TD className="text-right tabular">{r.evaluated}</TD>
                            <TD className="text-right tabular">{r.admis}</TD>
                            <TD className="text-right tabular">{r.ajournes}</TD>
                            <TD className="text-right tabular">{r.compensation}</TD>
                            <TD className="text-right tabular font-medium text-ink">{fmtGrade(r.avgGrade)}</TD>
                            <TD className="text-right tabular">{r.discrepancies}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                  {/* Mobile */}
                  <div className="space-y-3 md:hidden">
                    {report.byPromotion.map((r) => (
                      <div key={r.promotionId} className="rounded-2xl border border-line bg-paper p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-ink">{r.code}</p>
                          <span className="text-sm font-medium text-accent">Moy. {fmtGrade(r.avgGrade)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-subtle">{r.label}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
                          <span>Sessions : <b className="text-ink">{r.sessions}</b></span>
                          <span>Étud. : <b className="text-ink">{r.students}</b></span>
                          <span>Évalués : <b className="text-ink">{r.evaluated}</b></span>
                          <span>Admis : <b className="text-ink">{r.admis}</b></span>
                          <span>Ajournés : <b className="text-ink">{r.ajournes}</b></span>
                          <span>Écarts : <b className="text-ink">{r.discrepancies}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Par session */}
            <div>
              <h3 className="mb-3 text-base font-bold text-ink">Par session</h3>
              {report.bySession.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Aucune session" description="Aucune donnée à agréger." />
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <THead>
                        <TR>
                          <TH>Session</TH>
                          <TH>Promo</TH>
                          <TH>Période</TH>
                          <TH>Statut</TH>
                          <TH className="text-right">Étud.</TH>
                          <TH className="text-right">Éval.</TH>
                          <TH className="text-right">Admis</TH>
                          <TH className="text-right">Ajournés</TH>
                          <TH className="text-right">Comp.</TH>
                          <TH className="text-right">Moyenne</TH>
                          <TH className="text-right">Écarts</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {report.bySession.map((r) => (
                          <TR key={r.sessionId}>
                            <TD className="font-medium text-ink">{r.title}</TD>
                            <TD>{r.promotionCode}</TD>
                            <TD>{r.period ?? '—'}</TD>
                            <TD><SessionStatusBadge status={r.status} /></TD>
                            <TD className="text-right tabular">{r.students}</TD>
                            <TD className="text-right tabular">{r.evaluated}</TD>
                            <TD className="text-right tabular">{r.admis}</TD>
                            <TD className="text-right tabular">{r.ajournes}</TD>
                            <TD className="text-right tabular">{r.compensation}</TD>
                            <TD className="text-right tabular font-medium text-ink">{fmtGrade(r.avgGrade)}</TD>
                            <TD className="text-right tabular">{r.discrepancies}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                  {/* Mobile */}
                  <div className="space-y-3 md:hidden">
                    {report.bySession.map((r) => (
                      <div key={r.sessionId} className="rounded-2xl border border-line bg-paper p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-ink">{r.title}</p>
                          <SessionStatusBadge status={r.status} />
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                          <span className="font-medium text-muted">{r.promotionCode}</span>
                          {r.period && (<><span>·</span><span>{r.period}</span></>)}
                          <span>·</span>
                          <span className="text-accent">Moy. {fmtGrade(r.avgGrade)}</span>
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
                          <span>Étud. : <b className="text-ink">{r.students}</b></span>
                          <span>Évalués : <b className="text-ink">{r.evaluated}</b></span>
                          <span>Admis : <b className="text-ink">{r.admis}</b></span>
                          <span>Ajournés : <b className="text-ink">{r.ajournes}</b></span>
                          <span>Comp. : <b className="text-ink">{r.compensation}</b></span>
                          <span>Écarts : <b className="text-ink">{r.discrepancies}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </motion.section>
    </div>
  );
}
