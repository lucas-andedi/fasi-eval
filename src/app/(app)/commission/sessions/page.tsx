'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarClock,
  Plus,
  MapPin,
  Clock,
  Users2,
  GraduationCap,
  ArrowRight,
  CalendarPlus,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import type { Promotion } from '@/lib/types';
import { formatSessionDates } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { SessionStatusBadge } from '@/components/ui/status';
import { ImportButton, ExportButton } from '@/components/import';
import {
  SESSION_STATUS_TABS,
  rowJuryCount,
  rowStudentCount,
  type SessionRow,
} from './types';

function defaultAcademicYear(): string {
  const now = new Date();
  // Année académique démarrant en septembre.
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export default function SessionsListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState('ALL');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<SessionRow[]>('/sessions')).data,
  });

  const sessions = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: sessions.length };
    for (const s of sessions) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [sessions]);

  const filtered = useMemo(
    () => (tab === 'ALL' ? sessions : sessions.filter((s) => s.status === tab)),
    [sessions, tab],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Commission · CU-02"
        title="Sessions de défense"
        description="Planifiez et pilotez les sessions de soutenance : jury, étudiants et suivi en temps réel."
        action={
          <>
            <ExportButton entity="sessions" filenameHint="sessions.xlsx" />
            <ImportButton
              entity="sessions"
              title="Importer des sessions"
              description="Créez ou mettez à jour des sessions de défense en masse depuis un fichier Excel."
              onDone={() => qc.invalidateQueries({ queryKey: ['sessions'] })}
            />
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nouvelle session
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-6 flex-wrap"
        value={tab}
        onChange={setTab}
        tabs={SESSION_STATUS_TABS.map((t) => ({
          value: t.value,
          label: t.label,
          count: counts[t.value] ?? 0,
        }))}
      />

      {isLoading ? (
        <LoadingBlock label="Chargement des sessions…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={tab === 'ALL' ? 'Aucune session pour l’instant' : 'Aucune session dans cet état'}
          description={
            tab === 'ALL'
              ? 'Créez votre première session de défense pour composer le jury et inscrire les étudiants.'
              : 'Changez de filtre pour voir les autres sessions.'
          }
          action={
            tab === 'ALL' ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Nouvelle session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => (
            <SessionCard key={s.id} session={s} index={i} onOpen={() => router.push(`/commission/sessions/${s.id}`)} />
          ))}
        </div>
      )}

      <CreateSessionModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function SessionCard({
  session,
  index,
  onOpen,
}: {
  session: SessionRow;
  index: number;
  onOpen: () => void;
}) {
  const promo = session.promotion;
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      onClick={onOpen}
      className="card group relative overflow-hidden p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold text-ink">{session.title}</h3>
          {promo && (
            <p className="mt-0.5 text-sm text-muted">
              <span className="font-semibold text-ink">{promo.code}</span> · {promo.label}
            </p>
          )}
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {formatSessionDates(session)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {session.startTime}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {session.room || '—'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-subtle">{session.academicYear}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Users2 className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {rowJuryCount(session)} jury
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <GraduationCap className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {rowStudentCount(session)} étudiants
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-1" />
      </div>
    </motion.button>
  );
}

function CreateSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [room, setRoom] = useState('');
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [endDateError, setEndDateError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const { data: promotions } = useQuery({
    queryKey: ['reference', 'promotions'],
    queryFn: async () => (await api.get<Promotion[]>('/reference/promotions')).data,
    enabled: open,
  });

  const reset = () => {
    setTitle('');
    setPromotionId('');
    setDate('');
    setEndDate('');
    setStartTime('09:00');
    setRoom('');
    setAcademicYear(defaultAcademicYear());
    setEndDateError(undefined);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotionId) {
      toast.error('Sélectionnez une promotion.');
      return;
    }
    if (endDate && date && endDate < date) {
      setEndDateError('La date de fin doit être postérieure ou égale à la date de début.');
      toast.error('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }
    setEndDateError(undefined);
    setSaving(true);
    try {
      const { data: created } = await api.post<{ id: number }>('/sessions', {
        title: title.trim(),
        promotionId: Number(promotionId),
        date,
        endDate: endDate || null,
        startTime,
        room: room.trim(),
        academicYear: academicYear.trim(),
      });
      toast.success('Session créée.');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      reset();
      onClose();
      router.push(`/commission/sessions/${created.id}`);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(apiError(err) || 'Conflit de salle ou d’horaire pour cette session.');
      } else {
        toast.error(apiError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nouvelle session de défense"
      description="Définissez le cadre de la soutenance. La grille active de la promotion sera appliquée."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="create-session-form" loading={saving}>
            <CalendarPlus className="h-4 w-4" /> Créer la session
          </Button>
        </>
      }
    >
      <form id="create-session-form" onSubmit={submit} className="space-y-4">
        <Field label="Intitulé de la session" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p.ex. Soutenances L3 Génie Logiciel — Session 1"
            required
            autoFocus
          />
        </Field>

        <Field label="Promotion" required>
          <div className="relative">
            <Select value={promotionId} onChange={(e) => setPromotionId(e.target.value)} required>
              <option value="" disabled>
                Choisir une promotion…
              </option>
              {(promotions ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.label}
                </option>
              ))}
            </Select>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date de début" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setEndDateError(undefined);
              }}
              required
            />
          </Field>
          <Field
            label="Date de fin"
            hint="Optionnel — pour une session étalée sur plusieurs jours."
            error={endDateError}
          >
            <Input
              type="date"
              value={endDate}
              min={date || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setEndDateError(undefined);
              }}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heure de début" required>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
          <Field label="Salle" required>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="p.ex. Amphi B" required />
          </Field>
        </div>

        <Field label="Année académique" required hint="Format AAAA-AAAA">
          <Input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2025-2026"
            required
          />
        </Field>
      </form>
    </Modal>
  );
}
