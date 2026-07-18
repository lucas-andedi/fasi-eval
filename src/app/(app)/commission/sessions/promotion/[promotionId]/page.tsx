'use client';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
  CalendarPlus,
  Check,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import type { Promotion } from '@/lib/types';
import { formatSessionDates } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { SessionStatusBadge } from '@/components/ui/status';
import { rowJuryCount, rowStudentCount, type SessionRow } from '../../types';

// —————— Types locaux (le backend enrichit chaque session d'une période) ——————
interface Period {
  id: number;
  name: string;
  isDefault: boolean;
  archived?: boolean;
}
interface SessionRowWithPeriod extends SessionRow {
  period?: { id: number; name: string; isDefault: boolean } | null;
}

const DEFAULT_PERIOD_LABEL = 'Session ordinaire';

function defaultAcademicYear(): string {
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export default function PromotionSessionsPage() {
  const params = useParams<{ promotionId: string }>();
  const promotionId = Number(params.promotionId);
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const {
    data: promotions,
    isLoading: loadingPromos,
    isError: promosError,
  } = useQuery({
    queryKey: ['reference', 'promotions'],
    queryFn: async () => (await api.get<Promotion[]>('/reference/promotions')).data,
  });

  const {
    data: sessions,
    isLoading: loadingSessions,
    isError: sessionsError,
  } = useQuery({
    queryKey: ['sessions', { promotionId }],
    queryFn: async () =>
      (await api.get<SessionRowWithPeriod[]>('/sessions', { params: { promotionId } })).data,
    enabled: Number.isFinite(promotionId),
  });

  const promotion = useMemo(
    () => (promotions ?? []).find((p) => p.id === promotionId),
    [promotions, promotionId],
  );

  const isLoading = loadingPromos || loadingSessions;
  const isError = promosError || sessionsError;

  return (
    <div>
      <button
        onClick={() => router.push('/commission/sessions')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Toutes les promotions
      </button>

      <PageHeader
        eyebrow="Commission · CU-02"
        title={promotion ? promotion.label : 'Promotion'}
        description={
          promotion
            ? `${promotion.code} · Sessions de défense regroupées par période académique.`
            : 'Sessions de défense de la promotion.'
        }
        action={
          <Button onClick={() => setCreating(true)} disabled={!promotion}>
            <Plus className="h-4 w-4" /> Nouvelle session
          </Button>
        }
      />

      {isLoading ? (
        <LoadingBlock label="Chargement des sessions…" />
      ) : isError || !promotion ? (
        <EmptyState
          icon={GraduationCap}
          title="Promotion introuvable"
          description="Cette promotion n'existe pas ou les données n'ont pas pu être chargées."
          action={
            <Button variant="outline" onClick={() => router.push('/commission/sessions')}>
              Retour aux promotions
            </Button>
          }
        />
      ) : (sessions ?? []).length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aucune session pour cette promotion"
          description="Créez la première session de défense pour composer le jury et inscrire les étudiants."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nouvelle session
            </Button>
          }
        />
      ) : (
        <PeriodSections sessions={sessions ?? []} onOpen={(id) => router.push(`/commission/sessions/${id}`)} />
      )}

      {promotion && (
        <CreateSessionModal
          open={creating}
          onClose={() => setCreating(false)}
          promotion={promotion}
        />
      )}
    </div>
  );
}

function PeriodSections({
  sessions,
  onOpen,
}: {
  sessions: SessionRowWithPeriod[];
  onOpen: (id: number) => void;
}) {
  // Regroupe par période. Les sessions sans période rejoignent la période par défaut.
  const groups = useMemo(() => {
    // Identifie la période par défaut parmi celles présentes.
    const defaultPeriod = sessions.find((s) => s.period?.isDefault)?.period ?? null;
    const defaultKey = defaultPeriod?.id ?? '__default__';
    const defaultName = defaultPeriod?.name ?? DEFAULT_PERIOD_LABEL;

    const map = new Map<
      string | number,
      { key: string | number; name: string; isDefault: boolean; items: SessionRowWithPeriod[] }
    >();

    for (const s of sessions) {
      let key: string | number;
      let name: string;
      let isDefault: boolean;
      if (!s.period) {
        key = defaultKey;
        name = defaultName;
        isDefault = true;
      } else {
        key = s.period.id;
        name = s.period.name;
        isDefault = s.period.isDefault;
        if (s.period.isDefault) {
          // fusionne avec le seau par défaut
          key = defaultKey;
        }
      }
      const g = map.get(key) ?? { key, name, isDefault, items: [] };
      g.items.push(s);
      map.set(key, g);
    }

    const arr = [...map.values()];
    arr.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name, 'fr');
    });
    return arr;
  }, [sessions]);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={String(g.key)}>
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="font-display text-base font-bold text-ink">{g.name}</h2>
            <span className="chip bg-surface text-muted">{g.items.length}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((s, i) => (
              <SessionCard key={s.id} session={s} index={i} onOpen={() => onOpen(s.id)} />
            ))}
          </div>
        </section>
      ))}
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

function CreateSessionModal({
  open,
  onClose,
  promotion,
}: {
  open: boolean;
  onClose: () => void;
  promotion: Promotion;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [room, setRoom] = useState('');
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [useCustomCriteria, setUseCustomCriteria] = useState(false);
  const [endDateError, setEndDateError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // —— Périodes ——
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  const { data: periods } = useQuery({
    queryKey: ['reference', 'periods'],
    queryFn: async () => (await api.get<Period[]>('/reference/periods')).data,
    enabled: open,
  });

  // Sélectionne la période par défaut une fois chargée (si l'utilisateur n'a pas choisi).
  const activePeriods = useMemo(() => (periods ?? []).filter((p) => !p.archived), [periods]);
  const resolvedPeriodId = useMemo(() => {
    if (periodId) return periodId;
    const def = activePeriods.find((p) => p.isDefault);
    return def ? String(def.id) : activePeriods[0] ? String(activePeriods[0].id) : '';
  }, [periodId, activePeriods]);

  const reset = () => {
    setTitle('');
    setPeriodId('');
    setDate('');
    setEndDate('');
    setStartTime('09:00');
    setRoom('');
    setAcademicYear(defaultAcademicYear());
    setUseCustomCriteria(false);
    setEndDateError(undefined);
    setAddingPeriod(false);
    setNewPeriodName('');
  };

  const createPeriod = async () => {
    const name = newPeriodName.trim();
    if (!name) {
      toast.error('Saisissez un nom de période.');
      return;
    }
    setCreatingPeriod(true);
    try {
      const { data: created } = await api.post<Period>('/reference/periods', { name });
      toast.success('Période créée.');
      await qc.invalidateQueries({ queryKey: ['reference', 'periods'] });
      setPeriodId(String(created.id));
      setNewPeriodName('');
      setAddingPeriod(false);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? 'Cette période existe déjà.' : apiError(err));
    } finally {
      setCreatingPeriod(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        promotionId: promotion.id,
        date,
        endDate: endDate || null,
        startTime,
        room: room.trim(),
        academicYear: academicYear.trim(),
        periodId: resolvedPeriodId ? Number(resolvedPeriodId) : undefined,
        useCustomCriteria,
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

        <Field label="Promotion">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm">
            <GraduationCap className="h-4 w-4 text-subtle" strokeWidth={1.75} />
            <span className="font-semibold text-ink">{promotion.code}</span>
            <span className="text-muted">· {promotion.label}</span>
          </div>
        </Field>

        <Field label="Période" required hint="Regroupe les sessions (ordinaire, rattrapage…).">
          <div className="space-y-2">
            <Select value={resolvedPeriodId} onChange={(e) => setPeriodId(e.target.value)} required>
              {activePeriods.length === 0 && (
                <option value="" disabled>
                  Aucune période — créez-en une
                </option>
              )}
              {activePeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? ' (par défaut)' : ''}
                </option>
              ))}
            </Select>

            {addingPeriod ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="Nom de la période (p.ex. Session de rattrapage)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      createPeriod();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={creatingPeriod}
                  onClick={createPeriod}
                >
                  <Check className="h-4 w-4" /> Ajouter
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddingPeriod(false);
                    setNewPeriodName('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingPeriod(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-700"
              >
                <Plus className="h-3.5 w-3.5" /> Nouvelle période
              </button>
            )}
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
          <input
            type="checkbox"
            checked={useCustomCriteria}
            onChange={(e) => setUseCustomCriteria(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span className="text-sm">
            <span className="font-medium text-ink">Critères personnalisés</span>
            <span className="mt-0.5 block text-muted">
              Ajuster la grille d'évaluation pour cette session au lieu de la grille par défaut.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
