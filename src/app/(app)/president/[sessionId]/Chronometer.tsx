'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Field, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Feedback';
import { api, apiError } from '@/lib/api';
import { cn, fmtTimer } from '@/lib/utils';
import type { TimerStateT } from '@/lib/types';
import type { SessionStudent, JuryMember } from '../../commission/sessions/types';
import { juryFirstName, juryLastName } from '../../commission/sessions/types';
import { studentName } from '@/lib/names';
import { readTimer, type TimerState, TIMER_STATE_LABEL } from '../types';

type Action = 'start' | 'pause' | 'resume' | 'stop' | 'reset';
type BadgeTone = 'neutral' | 'teal' | 'warning' | 'danger';

interface Tier {
  key: 'normal' | 'warn' | 'danger' | 'done';
  stroke: string; // couleur de l'anneau
  digits: string; // couleur des chiffres
  label: string;
  tone: BadgeTone;
}

function tierFor(remaining: number, state: TimerStateT, alert1: number, alert2: number): Tier {
  if (state === 'TERMINE' || remaining <= 0)
    return { key: 'done', stroke: '#b4443b', digits: 'text-danger', label: 'Temps écoulé', tone: 'danger' };
  if (remaining <= alert2)
    return { key: 'danger', stroke: '#b4443b', digits: 'text-danger', label: 'Dernière minute', tone: 'danger' };
  if (remaining <= alert1)
    return { key: 'warn', stroke: '#a67c2b', digits: 'text-warning', label: 'Bientôt terminé', tone: 'warning' };
  return {
    key: 'normal',
    stroke: '#0d9268',
    digits: 'text-ink',
    label: TIMER_STATE_LABEL[state],
    tone: state === 'EN_COURS' ? 'teal' : 'neutral',
  };
}

const R = 120;
const CIRC = 2 * Math.PI * R;

export function Chronometer({
  sessionId,
  students,
  jury,
  defaultDurationSec,
  alert1Sec,
  alert2Sec,
  canControl,
}: {
  sessionId: number;
  students: SessionStudent[];
  jury: JuryMember[];
  defaultDurationSec: number;
  alert1Sec: number;
  alert2Sec: number;
  canControl: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(students[0]?.id ?? null);

  // État local du chronomètre (source de vérité pendant le décompte — chap 8.7).
  const [state, setState] = useState<TimerStateT>('EN_ATTENTE');
  const [configured, setConfigured] = useState(defaultDurationSec);
  const [remaining, setRemaining] = useState(defaultDurationSec);
  const [pending, setPending] = useState<Action | null>(null);
  const [delegOpen, setDelegOpen] = useState(false);

  const selected = students.find((s) => s.id === selectedId) ?? null;
  const alert1 = alert1Sec > 0 ? alert1Sec : 300;
  const alert2 = alert2Sec > 0 ? alert2Sec : 60;

  // Resynchronisation serveur au montage / changement d'étudiant (trust server).
  const timerQ = useQuery({
    queryKey: ['timer', sessionId, selectedId],
    enabled: selectedId != null,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await api.get(`/timers/${sessionId}/${selectedId}`);
      return readTimer(data, defaultDurationSec);
    },
  });

  const syncedAt = timerQ.dataUpdatedAt;
  useEffect(() => {
    const t = timerQ.data as TimerState | undefined;
    if (!t) return;
    setState(t.state);
    setConfigured(t.configuredSec || defaultDurationSec);
    setRemaining(t.remainingSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedAt, selectedId]);

  // Décompte local (setInterval côté client — survit aux coupures réseau).
  useEffect(() => {
    if (state !== 'EN_COURS') return;
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  // Alertes visuelles aux seuils.
  const crossed = useRef<{ a1: boolean; a2: boolean }>({ a1: false, a2: false });
  useEffect(() => {
    if (state !== 'EN_COURS') {
      crossed.current = { a1: remaining > alert1, a2: remaining > alert2 };
      return;
    }
    if (remaining <= alert2 && !crossed.current.a2) {
      crossed.current.a2 = true;
      toast.warning('Dernière minute — le temps de passage touche à sa fin.');
    } else if (remaining <= alert1 && !crossed.current.a1) {
      crossed.current.a1 = true;
      toast('Bientôt terminé — pensez à conclure.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, state]);

  // Arrêt automatique à 0.
  const autoStopped = useRef(false);
  useEffect(() => {
    if (state === 'EN_COURS' && remaining === 0 && !autoStopped.current) {
      autoStopped.current = true;
      setState('TERMINE');
      toast.error('Temps écoulé.');
      void persist('stop', 0);
    }
    if (remaining > 0) autoStopped.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, state]);

  async function persist(action: Action, remainingSec?: number) {
    if (selectedId == null) return;
    try {
      const body = remainingSec !== undefined ? { remainingSec } : {};
      await api.post(`/timers/${sessionId}/${selectedId}/${action}`, body);
    } catch (e) {
      toast.error(apiError(e));
      timerQ.refetch(); // resync serveur en cas d'échec
    }
  }

  async function act(action: Action) {
    if (selectedId == null) return;
    setPending(action);
    // Mise à jour optimiste immédiate (le chrono reste vivant).
    if (action === 'start') {
      autoStopped.current = false;
      crossed.current = { a1: false, a2: false };
      setRemaining(configured);
      setState('EN_COURS');
      await persist('start');
    } else if (action === 'pause') {
      setState('SUSPENDU');
      await persist('pause', remaining);
    } else if (action === 'resume') {
      setState('EN_COURS');
      await persist('resume');
    } else if (action === 'stop') {
      setState('TERMINE');
      await persist('stop', remaining);
    } else if (action === 'reset') {
      crossed.current = { a1: false, a2: false };
      autoStopped.current = false;
      setState('EN_ATTENTE');
      setRemaining(configured);
      await persist('reset');
    }
    setPending(null);
  }

  const tier = useMemo(
    () => tierFor(remaining, state, alert1, alert2),
    [remaining, state, alert1, alert2],
  );
  const progress = configured > 0 ? Math.max(0, Math.min(1, remaining / configured)) : 0;
  const dashOffset = CIRC * (1 - progress);
  const isDanger = tier.key === 'danger';

  const regular = students.filter((s) => (s.status ?? 'REGULIER') !== 'COMPENSATION');
  const compensation = students.filter((s) => s.status === 'COMPENSATION');

  if (students.length === 0) {
    return (
      <EmptyState
        icon={UserRound}
        title="Aucun étudiant inscrit"
        description="Ajoutez des étudiants à la session pour piloter leur temps de passage."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Sélecteur d'étudiant */}
      <div className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-ink">Passage en cours</h3>
        <p className="mb-4 text-xs text-muted">Sélectionnez l'étudiant à chronométrer.</p>
        <StudentPickerGroup
          title="Réguliers"
          list={regular}
          selectedId={selectedId}
          onPick={setSelectedId}
        />
        {compensation.length > 0 && (
          <div className="mt-4">
            <StudentPickerGroup
              title="Compensation"
              list={compensation}
              selectedId={selectedId}
              onPick={setSelectedId}
            />
          </div>
        )}
      </div>

      {/* Chronomètre */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'card flex flex-col items-center p-6 sm:p-8',
          isDanger && 'ring-1 ring-danger/40',
        )}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink">
              {selected ? studentName(selected) : 'Aucun étudiant'}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {selected?.matricule ?? '—'}
              {selected?.projectSubject ? ` · ${selected.projectSubject}` : ''}
            </p>
          </div>
          <Badge tone={tier.tone} dot>{tier.label}</Badge>
        </div>

        {/* Anneau + chiffres */}
        <div
          className={cn(
            'relative my-6 grid place-items-center rounded-full',
            isDanger && 'animate-pulse-ring',
          )}
          style={{ width: 280, height: 280 }}
        >
          <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(24,24,27,0.08)" strokeWidth={16} />
            <motion.circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={tier.stroke}
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ ease: 'linear', duration: 0.9 }}
              style={{ transition: 'stroke 0.6s ease' }}
            />
          </svg>
          <div className="relative flex flex-col items-center">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={tier.key === 'done' ? 'done' : 'live'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'font-mono text-6xl font-bold tabular tracking-tight transition-colors duration-500 sm:text-7xl',
                  tier.digits,
                )}
              >
                {fmtTimer(remaining)}
              </motion.span>
            </AnimatePresence>
            <span className="mt-2 text-xs font-medium text-subtle">
              sur {fmtTimer(configured)}
            </span>
          </div>
        </div>

        {/* Commandes */}
        {!canControl ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-center text-sm text-muted">
            Vous n'avez pas le contrôle du chronomètre pour cette session.
          </p>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-center gap-3">
            {(state === 'EN_ATTENTE' || state === 'TERMINE') && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => act('start')}
                loading={pending === 'start'}
                disabled={!selected || timerQ.isLoading}
              >
                <Play className="h-5 w-5" /> Démarrer
              </Button>
            )}
            {state === 'EN_COURS' && (
              <Button variant="outline" size="lg" onClick={() => act('pause')} loading={pending === 'pause'}>
                <Pause className="h-5 w-5" /> Suspendre
              </Button>
            )}
            {state === 'SUSPENDU' && (
              <Button variant="primary" size="lg" onClick={() => act('resume')} loading={pending === 'resume'}>
                <Play className="h-5 w-5" /> Reprendre
              </Button>
            )}
            {(state === 'EN_COURS' || state === 'SUSPENDU') && (
              <Button variant="danger" size="lg" onClick={() => act('stop')} loading={pending === 'stop'}>
                <Square className="h-5 w-5" /> Arrêter
              </Button>
            )}
            {state !== 'EN_ATTENTE' && (
              <Button variant="subtle" size="lg" onClick={() => act('reset')} loading={pending === 'reset'}>
                <RotateCcw className="h-5 w-5" /> Réinitialiser
              </Button>
            )}
          </div>
        )}

        {canControl && jury.length > 0 && (
          <button
            onClick={() => setDelegOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <Send className="h-4 w-4" /> Déléguer le contrôle
          </button>
        )}
      </motion.div>

      <DelegateModal
        open={delegOpen}
        onClose={() => setDelegOpen(false)}
        sessionId={sessionId}
        jury={jury}
      />
    </div>
  );
}

function StudentPickerGroup({
  title,
  list,
  selectedId,
  onPick,
}: {
  title: string;
  list: SessionStudent[];
  selectedId: number | null;
  onPick: (id: number) => void;
}) {
  if (list.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
        {title} <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] text-muted">{list.length}</span>
      </p>
      <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
        {list.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                active
                  ? 'border-accent-200 bg-accent-weak'
                  : 'border-transparent hover:border-line hover:bg-surface',
              )}
            >
              <Avatar first={s.firstName} last={s.lastName} className="h-9 w-9 rounded-lg text-xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {studentName(s)}
                </span>
                <span className="block truncate text-[11px] text-muted">{s.matricule}</span>
              </span>
              {active && (
                <motion.span
                  layoutId="picker-active-dot"
                  className="h-2 w-2 shrink-0 rounded-full bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DelegateModal({
  open,
  onClose,
  sessionId,
  jury,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: number;
  jury: JuryMember[];
}) {
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const candidates = jury.filter((m) => !m.isPresident);

  async function submit() {
    if (!userId) return;
    setLoading(true);
    try {
      await api.post(`/sessions/${sessionId}/timer-delegate`, { userId: Number(userId) });
      toast.success('Contrôle du chronomètre délégué.');
      onClose();
      setUserId('');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Déléguer le contrôle"
      description="Confiez la gestion du chronomètre à un membre du jury (CU-10)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={submit} loading={loading} disabled={!userId}>
            <Send className="h-4 w-4" /> Déléguer
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun membre du jury disponible pour la délégation.
        </p>
      ) : (
        <Field label="Membre du jury" required>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Choisir un membre…</option>
            {candidates.map((m) => (
              <option key={m.userId} value={m.userId}>
                {juryFirstName(m)} {juryLastName(m)}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </Modal>
  );
}
