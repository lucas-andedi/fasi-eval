'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  DoorOpen,
  Gavel,
  GraduationCap,
  Layers,
  ScrollText,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { SessionStatusBadge } from '@/components/ui/status';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import type { DefenseSession, Promotion, Student } from '@/lib/types';

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

  const sessions = sessionsQ.data ?? [];
  const promotions = promotionsQ.data ?? [];
  const students = studentsQ.data ?? [];

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
    </div>
  );
}
