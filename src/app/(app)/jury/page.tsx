'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, ClipboardList, Crown, DoorClosed, GraduationCap, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { SessionStatusBadge } from '@/components/ui/status';
import { EmptyState, LoadingBlock } from '@/components/ui/Feedback';
import { ConfidentialityBanner, countJury, countStudents, type MineSession } from './_shared';

export default function MesSessionsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sessions', 'mine'],
    queryFn: async () => (await api.get<MineSession[]>('/sessions/mine')).data,
  });

  const sessions = data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Espace membre du jury"
        title="Mes sessions"
        description="Les soutenances auxquelles vous êtes affecté. Ouvrez une session pour saisir vos évaluations."
      />

      <div className="mb-6">
        <ConfidentialityBanner />
      </div>

      {isLoading ? (
        <LoadingBlock label="Chargement de vos sessions…" />
      ) : isError ? (
        <EmptyState
          icon={ClipboardList}
          title="Impossible de charger vos sessions"
          description="Une erreur est survenue. Merci de réessayer dans un instant."
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune session pour le moment"
          description="Vous n'êtes affecté à aucune soutenance. La Commission vous notifiera dès qu'une session vous sera confiée."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s, i) => {
            const jc = countJury(s);
            const sc = countStudents(s);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-full flex-col"
              >
                <Link
                  href={`/jury/${s.id}`}
                  className="card group relative flex flex-1 flex-col p-5 transition-shadow duration-200 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <SessionStatusBadge status={s.status} />
                  </div>

                  <h3 className="mt-4 font-display text-lg font-bold leading-snug text-ink">{s.title}</h3>
                  {s.promotion && (
                    <p className="mt-1 text-sm font-medium text-violet-600">{s.promotion.label}</p>
                  )}

                  <div className="mt-4 space-y-2 text-sm text-ink/60">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-ink/35" />
                      <span>
                        {fmtDate(s.date)}
                        {s.startTime && <span className="text-ink/40"> · {s.startTime}</span>}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <DoorClosed className="h-4 w-4 text-ink/35" />
                      <span>Salle {s.room}</span>
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-4 border-t border-violet-100 pt-3.5 text-xs font-semibold text-ink/50">
                    {jc !== undefined && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-violet-400" /> {jc} membre{jc > 1 ? 's' : ''}
                      </span>
                    )}
                    {sc !== undefined && (
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-violet-400" /> {sc} étudiant{sc > 1 ? 's' : ''}
                      </span>
                    )}
                    <ArrowRight className="ml-auto h-4 w-4 text-violet-400 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
                {s.isPresident && (
                  <Link
                    href={`/president/${s.id}`}
                    className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
                  >
                    <Crown className="h-4 w-4 text-accent" />
                    Salle de contrôle (président)
                    <ArrowRight className="ml-auto h-4 w-4 text-subtle" />
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
