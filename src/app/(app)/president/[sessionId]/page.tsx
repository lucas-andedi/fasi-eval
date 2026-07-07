'use client';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Crown,
  Gavel,
  MapPin,
  Timer as TimerIcon,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { SessionStatusBadge } from '@/components/ui/status';
import { LoadingBlock } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { fmtDate } from '@/lib/utils';
import {
  type SessionDetail,
  juryFirstName,
  juryLastName,
} from '../../commission/sessions/types';
import { Chronometer } from './Chronometer';
import { ConsolidatedPanel } from './ConsolidatedPanel';
import { InjunctionsPanel } from './InjunctionsPanel';

export default function SalleDeControlePage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params?.sessionId);
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<'chrono' | 'results' | 'injonctions'>('chrono');

  const sessionQ = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => (await api.get<SessionDetail>(`/sessions/${sessionId}`)).data,
  });

  const session = sessionQ.data;
  const jury = session?.jury ?? [];
  // L'API renvoie students: { regular:[{student,...}], compensation:[...] } (nesté).
  const sAny = session as unknown as {
    students?: { regular?: any[]; compensation?: any[] };
    regular?: any[];
    compensation?: any[];
  } | undefined;
  const regular = sAny?.students?.regular ?? sAny?.regular ?? [];
  const compensation = sAny?.students?.compensation ?? sAny?.compensation ?? [];
  const students = useMemo(
    () => [
      ...regular.map((s: any) => ({ ...(s.student ?? s), status: s.status ?? ('REGULIER' as const) })),
      ...compensation.map((s: any) => ({ ...(s.student ?? s), status: 'COMPENSATION' as const })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session],
  );

  const isJuryMember = jury.some((m) => m.userId === user?.id);
  const canControl =
    isJuryMember || jury.some((m) => m.isPresident && m.userId === user?.id);

  const inDeliberation = session?.status === 'DELIBERATION';
  const president = jury.find((m) => m.isPresident);

  const durationSec = session?.defenseDurationSec || session?.promotion?.defenseDurationSec || 900;
  const alert1 = session?.promotion?.alert1Sec ?? 300;
  const alert2 = session?.promotion?.alert2Sec ?? 60;

  const tabs = [
    { value: 'chrono', label: 'Chronomètre' },
    { value: 'results', label: 'Résultats consolidés' },
    ...(inDeliberation ? [{ value: 'injonctions', label: 'Injonctions' }] : []),
  ];

  if (sessionQ.isLoading) {
    return (
      <div>
        <PageHeader eyebrow="Salle de contrôle" title="Chargement…" />
        <LoadingBlock label="Ouverture de la salle de contrôle…" />
      </div>
    );
  }

  if (sessionQ.isError || !session) {
    return (
      <div>
        <PageHeader eyebrow="Salle de contrôle" title="Session introuvable" />
        <Link href="/president" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Retour à mes sessions
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/president"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:gap-2.5 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Mes sessions
      </Link>

      <PageHeader
        eyebrow="Salle de contrôle"
        title={session.title}
        description={`${session.promotion?.code ?? session.promotion?.label ?? ''} · ${session.academicYear}`}
        action={<SessionStatusBadge status={session.status} />}
      />

      {/* Bandeau infos session */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
      >
        <InfoTile icon={CalendarClock} label="Date" value={fmtDate(session.date)} />
        <InfoTile icon={Clock} label="Heure" value={session.startTime} />
        <InfoTile icon={MapPin} label="Salle" value={session.room} />
        <InfoTile icon={TimerIcon} label="Temps / passage" value={`${Math.round(durationSec / 60)} min`} />
        <InfoTile icon={Users} label="Étudiants" value={String(students.length)} />
        <InfoTile
          icon={Crown}
          label="Président"
          value={president ? `${juryFirstName(president)} ${juryLastName(president)}` : '—'}
        />
      </motion.div>

      <div className="mb-6">
        <Tabs tabs={tabs} value={tab} onChange={(v) => setTab(v as typeof tab)} />
      </div>

      {tab === 'chrono' && (
        <motion.div key="chrono" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Chronometer
            sessionId={sessionId}
            students={students}
            jury={jury}
            defaultDurationSec={durationSec}
            alert1Sec={alert1}
            alert2Sec={alert2}
            canControl={canControl}
          />
        </motion.div>
      )}

      {tab === 'results' && (
        <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <ConsolidatedPanel sessionId={sessionId} />
        </motion.div>
      )}

      {tab === 'injonctions' && inDeliberation && (
        <motion.div key="injonctions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <InjunctionsPanel sessionId={sessionId} students={students} />
        </motion.div>
      )}

      {/* Composition du jury */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mt-6 p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <Gavel className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-muted">Composition du jury</h3>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {jury.map((m) => (
            <span
              key={m.userId}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3.5 text-sm"
            >
              <Avatar first={juryFirstName(m)} last={juryLastName(m)} className="h-7 w-7 text-[11px]" />
              <span className="font-medium text-ink">
                {juryFirstName(m)} {juryLastName(m)}
              </span>
              {m.isPresident && (
                <Badge tone="neutral">
                  <Crown className="h-3 w-3 text-muted" /> Président
                </Badge>
              )}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-3.5">
      <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <Icon className="h-3.5 w-3.5 text-subtle" /> {label}
      </div>
      <p className="truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
