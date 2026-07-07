'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  Clock,
  Crown,
  DoorOpen,
  Gavel,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SessionStatusBadge } from '@/components/ui/status';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import {
  type SessionRow,
  rowJuryCount,
  rowStudentCount,
} from '../commission/sessions/types';

export default function PresidentSessionsPage() {
  const sessionsQ = useQuery({
    queryKey: ['sessions', 'mine'],
    queryFn: async () => (await api.get<SessionRow[]>('/sessions/mine')).data,
  });

  const sessions = sessionsQ.data ?? [];
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const count = (s: SessionRow['status']) => sessions.filter((x) => x.status === s).length;
  const live = count('OUVERTE');

  return (
    <div>
      <PageHeader
        eyebrow="Président du jury"
        title="Mes sessions"
        description={
          live > 0
            ? `${live} session${live > 1 ? 's' : ''} ouverte${live > 1 ? 's' : ''} — chronomètre prêt à démarrer.`
            : 'Pilotez le déroulement des défenses depuis votre salle de contrôle.'
        }
      />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions affectées" value={sessions.length} icon={CalendarClock} tone="violet" index={0} hint="Où vous siégez" />
        <StatCard label="Ouvertes" value={count('OUVERTE')} icon={DoorOpen} tone="teal" index={1} hint="Défenses en cours" />
        <StatCard label="En délibération" value={count('DELIBERATION')} icon={Gavel} tone="violet" index={2} hint="Consolidation" />
        <StatCard label="Clôturées" value={count('CLOTUREE')} icon={Sparkles} tone="violet" index={3} hint="Résultats publiés" />
      </div>

      {sessionsQ.isLoading ? (
        <LoadingBlock label="Chargement de vos sessions…" />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aucune session affectée"
          description="Vous serez notifié dès qu'une session de défense vous sera confiée en tant que président."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={`/president/${s.id}`}
                className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-6 transition-shadow hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted">
                    <Crown className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <SessionStatusBadge status={s.status} />
                </div>

                <h3 className="mt-4 line-clamp-2 font-display text-lg font-bold text-ink">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-muted">
                  {s.promotion?.code ?? s.promotion?.label ?? '—'}
                  <span className="ml-2 text-subtle">{s.academicYear}</span>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-subtle" /> {fmtDate(s.date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-subtle" /> {s.startTime}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-subtle" /> {s.room}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-subtle" /> {rowStudentCount(s)} étudiant{rowStudentCount(s) > 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Gavel className="h-3.5 w-3.5 text-subtle" /> {rowJuryCount(s)} juré{rowJuryCount(s) > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                    Ouvrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
