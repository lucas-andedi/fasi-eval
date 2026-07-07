'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  MapPin,
  Users2,
  Activity,
  DoorOpen,
  Gavel,
  Crown,
  UserPlus,
  Trash2,
  Plus,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ScrollText,
  ListChecks,
  Save,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import type { Student, UserRow, StudentStatus } from '@/lib/types';
import { formatSessionDates } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Select } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Toggle } from '@/components/ui/Toggle';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { SessionStatusBadge, StudentStatusBadge } from '@/components/ui/status';
import { ImportButton } from '@/components/import';
import {
  type SessionDetail,
  type SessionStudent,
  type SessionDashboard,
  type DashboardStudent,
  type SessionCriteriaResponse,
  type JuryMember,
  juryFirstName,
  juryLastName,
  juryRoles,
  dashSubmitted,
  dashExpected,
  dashDiscrepancies,
  dsSubmitted,
  dsTotal,
  dsDiscrepancy,
  dsFirstName,
  dsLastName,
  dsPostnom,
  dsMatricule,
} from '../types';
import { studentName } from '@/lib/names';

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [tab, setTab] = useState('jury');

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const raw = (await api.get(`/sessions/${id}`)).data as any;
      // L'API niche students: { regular:[{studentAssignmentId,student,status}], compensation:[...] }.
      // On aplatit vers regular[]/compensation[] de SessionStudent (comportement attendu par la page).
      const flatten = (arr: any[] = []) =>
        arr.map((a) => ({ ...(a.student ?? a), status: a.status, studentAssignmentId: a.studentAssignmentId }));
      const nested = raw.students;
      return {
        ...raw,
        regular: raw.regular ?? flatten(nested?.regular),
        compensation: raw.compensation ?? flatten(nested?.compensation),
      } as SessionDetail;
    },
  });

  const editable = session?.status === 'PREPARATION';

  if (isLoading || !session) {
    return (
      <div>
        <BackLink />
        <LoadingBlock label="Chargement de la session…" />
      </div>
    );
  }

  const jury = session.jury ?? [];
  const regular = session.regular ?? [];
  const compensation = session.compensation ?? [];

  return (
    <div>
      <BackLink />

      <PageHeader
        eyebrow={`Session · ${session.academicYear}`}
        title={session.title}
        description={
          session.promotion ? `${session.promotion.code} — ${session.promotion.label}` : undefined
        }
        action={<SessionActions session={session} />}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-surface px-5 py-3.5 text-sm text-muted"
      >
        <SessionStatusBadge status={session.status} />
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {formatSessionDates(session)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {session.startTime}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-subtle" strokeWidth={1.75} /> {session.room || '—'}
        </span>
        {!editable && (
          <span className="inline-flex items-center gap-1.5 text-subtle">
            <Lock className="h-3.5 w-3.5" /> Grille gelée · jury et étudiants verrouillés
          </span>
        )}
      </motion.div>

      <Tabs
        className="mb-6 flex-wrap"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'jury', label: 'Jury', count: jury.length },
          { value: 'students', label: 'Étudiants', count: regular.length + compensation.length },
          { value: 'criteria', label: "Critères" },
          { value: 'live', label: 'Suivi en temps réel' },
        ]}
      />

      {tab === 'jury' && <JuryTab session={session} editable={editable} />}
      {tab === 'students' && <StudentsTab session={session} editable={editable} />}
      {tab === 'criteria' && <CriteriaTab session={session} editable={editable} />}
      {tab === 'live' && <LiveTab sessionId={id} />}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/commission/sessions"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" /> Toutes les sessions
    </Link>
  );
}

// ————————————————————————————————— Actions d'état —————————————————————————————————

function SessionActions({ session }: { session: SessionDetail }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<null | 'open' | 'deliberation'>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const path = confirm === 'open' ? 'open' : 'deliberation';
      await api.post(`/sessions/${session.id}/${path}`);
      toast.success(confirm === 'open' ? 'Session ouverte. Le jury a été notifié.' : 'Session passée en délibération.');
      qc.invalidateQueries({ queryKey: ['session', String(session.id)] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setConfirm(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {session.status === 'PREPARATION' && (
        <Button variant="primary" onClick={() => setConfirm('open')}>
          <DoorOpen className="h-4 w-4" /> Ouvrir la session
        </Button>
      )}
      {session.status === 'OUVERTE' && (
        <Button onClick={() => setConfirm('deliberation')}>
          <Gavel className="h-4 w-4" /> Passer en délibération
        </Button>
      )}
      {(session.status === 'DELIBERATION' || session.status === 'CLOTUREE') && (
        <Link href={`/commission/deliberation/${session.id}`}>
          <Button>
            <Gavel className="h-4 w-4" /> Délibération
          </Button>
        </Link>
      )}

      <ConfirmDialog
        open={confirm === 'open'}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        loading={busy}
        tone="primary"
        confirmLabel="Ouvrir la session"
        title="Ouvrir la session ?"
        description="La grille d'évaluation sera gelée et le jury notifié. La composition du jury et la liste des étudiants ne pourront plus être modifiées. Assurez-vous qu'un président est désigné et que les étudiants sont inscrits."
      />
      <ConfirmDialog
        open={confirm === 'deliberation'}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        loading={busy}
        confirmLabel="Passer en délibération"
        title="Passer en délibération ?"
        description="Les évaluations en cours seront consolidées et la phase de délibération démarrera. Cette action ne peut être annulée."
      />
    </>
  );
}

// ————————————————————————————————— Onglet Jury (CU-04) —————————————————————————————————

function JuryTab({ session, editable }: { session: SessionDetail; editable: boolean }) {
  const qc = useQueryClient();
  const [compose, setCompose] = useState(false);
  const [removing, setRemoving] = useState<JuryMember | null>(null);
  const [busy, setBusy] = useState(false);
  const jury = session.jury ?? [];
  const key = ['session', String(session.id)];

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await api.delete(`/sessions/${session.id}/jury/${removing.userId}`);
      toast.success('Membre retiré du jury.');
      qc.invalidateQueries({ queryKey: key });
      setRemoving(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Composition du jury"
        subtitle="Membres affectés à cette session. Un président doit être désigné."
        action={
          <Button variant={jury.length ? 'outline' : 'primary'} onClick={() => setCompose(true)} disabled={!editable}>
            <UserPlus className="h-4 w-4" /> Composer le jury
          </Button>
        }
      />

      {!editable && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-subtle">
          <Lock className="h-3.5 w-3.5" /> Session ouverte — la composition du jury est verrouillée.
        </p>
      )}

      <div className="mt-5">
        {jury.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="Aucun membre affecté"
            description="Composez le jury en désignant les membres et le président."
            action={
              editable ? (
                <Button onClick={() => setCompose(true)}>
                  <UserPlus className="h-4 w-4" /> Composer le jury
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {jury.map((m, i) => (
              <motion.li
                key={m.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
              >
                <Avatar first={juryFirstName(m)} last={juryLastName(m)} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold text-ink">
                    {juryFirstName(m)} {juryLastName(m)}
                    {m.isPresident && (
                      <Badge tone="neutral" className="shrink-0">
                        <Crown className="h-3 w-3" /> Président
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-subtle">
                    {m.isPresident ? 'Président' : 'Membre du jury'}
                    {juryRoles(m).length > 0 && (
                      <span className="text-subtle"> · {juryRoles(m).map((r) => ROLE_LABEL[r]).join(' · ')}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setRemoving(m)}
                  disabled={!editable}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink/35 transition hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                  aria-label="Retirer du jury"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <ComposeJuryModal
        open={compose}
        onClose={() => setCompose(false)}
        session={session}
        onSaved={() => qc.invalidateQueries({ queryKey: key })}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        loading={busy}
        tone="danger"
        confirmLabel="Retirer"
        title="Retirer ce membre ?"
        description={
          removing
            ? `${juryFirstName(removing)} ${juryLastName(removing)} sera retiré du jury de cette session.`
            : ''
        }
      />
    </Card>
  );
}

function ComposeJuryModal({
  open,
  onClose,
  session,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionDetail;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [president, setPresident] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: pool, isLoading } = useQuery({
    queryKey: ['jury-pool'],
    queryFn: async () => (await api.get<UserRow[]>('/users/jury-pool')).data,
    enabled: open,
  });

  // Pré-remplit depuis le jury actuel à l'ouverture.
  useEffect(() => {
    if (open) {
      const cur = session.jury ?? [];
      setSelected(new Set(cur.map((m) => m.userId)));
      setPresident(cur.find((m) => m.isPresident)?.userId ?? null);
    }
  }, [open, session.jury]);

  const toggle = (userId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        if (president === userId) setPresident(null);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) {
      toast.error('Sélectionnez au moins un membre.');
      return;
    }
    if (president === null || !selected.has(president)) {
      toast.error('Désignez exactement un président parmi les membres sélectionnés.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/sessions/${session.id}/jury`, {
        members: Array.from(selected).map((userId) => ({
          userId,
          isPresident: userId === president,
        })),
      });
      toast.success('Jury enregistré. Les membres ont été notifiés.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Composer le jury"
      description="Sélectionnez les membres et désignez un unique président."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={submit} loading={saving}>
            Enregistrer le jury
          </Button>
        </>
      }
    >
      {isLoading ? (
        <LoadingBlock label="Chargement des membres…" />
      ) : (pool ?? []).length === 0 ? (
        <EmptyState icon={Users2} title="Aucun membre de jury disponible" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-xs font-semibold text-subtle">
            <span>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
            <span className="inline-flex items-center gap-1">
              <Crown className="h-3.5 w-3.5 text-muted" /> Président
            </span>
          </div>
          <ul className="space-y-2">
            {(pool ?? []).map((u) => {
              const checked = selected.has(u.id);
              return (
                <li
                  key={u.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    checked ? 'border-accent-200 bg-accent-weak' : 'border-line bg-surface'
                  }`}
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(u.id)}
                      className="h-4 w-4 rounded border-line-strong text-accent focus:ring-accent"
                    />
                    <Avatar first={u.firstName} last={u.lastName} className="h-9 w-9 text-xs" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="block truncate text-xs text-subtle">{u.roles.map((r) => ROLE_LABEL[r]).join(' · ')}</span>
                    </span>
                  </label>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      president === u.id
                        ? 'bg-accent text-white'
                        : checked
                          ? 'text-muted hover:bg-surface'
                          : 'pointer-events-none opacity-30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="president"
                      className="sr-only"
                      checked={president === u.id}
                      disabled={!checked}
                      onChange={() => setPresident(u.id)}
                    />
                    <Crown className="h-3.5 w-3.5" /> Président
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}

// ————————————————————————————————— Onglet Étudiants (CU-05) —————————————————————————————————

function StudentsTab({ session, editable }: { session: SessionDetail; editable: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<SessionStudent | null>(null);
  const [busy, setBusy] = useState(false);
  const key = ['session', String(session.id)];

  const regular = session.regular ?? [];
  const compensation = session.compensation ?? [];

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await api.delete(`/sessions/${session.id}/students/${removing.id}`);
      toast.success('Étudiant retiré de la session.');
      qc.invalidateQueries({ queryKey: key });
      setRemoving(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Étudiants inscrits</h3>
          <p className="text-sm text-muted">
            {regular.length + compensation.length} étudiant{regular.length + compensation.length > 1 ? 's' : ''} ·{' '}
            {regular.length} régulier{regular.length > 1 ? 's' : ''}, {compensation.length} en compensation
          </p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={!editable}>
          <Plus className="h-4 w-4" /> Ajouter un étudiant
        </Button>
      </div>

      {!editable && (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle">
          <Lock className="h-3.5 w-3.5" /> Session ouverte — la liste des étudiants est verrouillée.
        </p>
      )}

      <StudentSection
        title="Réguliers"
        tone="accent"
        students={regular}
        editable={editable}
        onRemove={setRemoving}
      />
      <StudentSection
        title="En compensation"
        tone="warning"
        students={compensation}
        editable={editable}
        onRemove={setRemoving}
      />

      <AddStudentModal
        open={adding}
        onClose={() => setAdding(false)}
        session={session}
        onSaved={() => qc.invalidateQueries({ queryKey: key })}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        loading={busy}
        tone="danger"
        confirmLabel="Retirer"
        title="Retirer cet étudiant ?"
        description={
          removing ? `${removing.firstName} ${removing.lastName} sera retiré de cette session.` : ''
        }
      />
    </div>
  );
}

function StudentSection({
  title,
  tone,
  students,
  editable,
  onRemove,
}: {
  title: string;
  tone: 'accent' | 'warning';
  students: SessionStudent[];
  editable: boolean;
  onRemove: (s: SessionStudent) => void;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${tone === 'accent' ? 'bg-accent' : 'bg-warning'}`} />
        <h4 className="font-bold text-ink">{title}</h4>
        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-bold text-muted">
          {students.length}
        </span>
      </div>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-subtle">
          Aucun étudiant dans cette catégorie.
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {students.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
            >
              <Avatar first={s.firstName} last={s.lastName} className="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">
                  {studentName(s)}
                </p>
                <p className="truncate text-xs text-subtle">
                  {s.matricule}
                  {s.department && ` · ${s.department.name}`}
                  {s.option && ` / ${s.option.name}`}
                  {s.originYear ? ` · origine ${s.originYear}` : ''}
                </p>
              </div>
              <StudentStatusBadge status={s.status ?? 'REGULIER'} />
              <button
                onClick={() => onRemove(s)}
                disabled={!editable}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink/35 transition hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                aria-label="Retirer l'étudiant"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddStudentModal({
  open,
  onClose,
  session,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionDetail;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState<number | null>(null);
  const [status, setStatus] = useState<StudentStatus>('REGULIER');
  const [originYear, setOriginYear] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', session.promotionId],
    queryFn: async () =>
      (await api.get<Student[]>('/students', { params: { promotionId: session.promotionId } })).data,
    enabled: open,
  });

  // Exclut les étudiants déjà inscrits.
  const enrolled = useMemo(
    () => new Set([...(session.regular ?? []), ...(session.compensation ?? [])].map((s) => s.id)),
    [session.regular, session.compensation],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (students ?? [])
      .filter((s) => !enrolled.has(s.id))
      .filter(
        (s) =>
          !q ||
          studentName(s).toLowerCase().includes(q) ||
          s.matricule.toLowerCase().includes(q),
      );
  }, [students, enrolled, query]);

  const reset = () => {
    setQuery('');
    setStudentId(null);
    setStatus('REGULIER');
    setOriginYear('');
  };

  const submit = async () => {
    if (!studentId) {
      toast.error('Sélectionnez un étudiant.');
      return;
    }
    if (status === 'COMPENSATION' && !originYear.trim()) {
      toast.error("Renseignez l'année d'origine pour une compensation.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/sessions/${session.id}/students`, {
        studentId,
        status,
        ...(status === 'COMPENSATION' ? { originYear: Number(originYear) } : {}),
      });
      toast.success('Étudiant ajouté à la session.');
      onSaved();
      reset();
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      size="lg"
      title="Ajouter un étudiant"
      description="Choisissez un étudiant de la promotion et son statut d'inscription."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button onClick={submit} loading={saving} disabled={!studentId}>
            Ajouter
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Rechercher un étudiant">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, prénom ou matricule…"
            autoFocus
          />
        </Field>

        <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-line bg-surface p-2">
          {isLoading ? (
            <LoadingBlock label="Chargement des étudiants…" />
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">Aucun étudiant disponible.</p>
          ) : (
            list.map((s) => {
              const active = studentId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStudentId(s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                    active
                      ? 'border-accent-200 bg-accent-weak'
                      : 'border-line bg-paper hover:bg-surface'
                  }`}
                >
                  <Avatar first={s.firstName} last={s.lastName} className="h-9 w-9 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {studentName(s)}
                    </span>
                    <span className="block truncate text-xs text-subtle">
                      {s.matricule}
                      {s.department && ` · ${s.department.name}`}
                      {s.option && ` / ${s.option.name}`}
                    </span>
                  </span>
                  {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />}
                </button>
              );
            })
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Statut" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)}>
              <option value="REGULIER">Régulier</option>
              <option value="COMPENSATION">En compensation</option>
            </Select>
          </Field>
          {status === 'COMPENSATION' && (
            <Field label="Année d'origine" required hint="Année de la session initiale">
              <Input
                type="number"
                value={originYear}
                onChange={(e) => setOriginYear(e.target.value)}
                placeholder="p.ex. 2024"
              />
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ————————————————————————————————— Onglet Critères (per-session) —————————————————————————————————

type CriterionDraft = { id?: number; label: string };

function CriteriaTab({ session, editable }: { session: SessionDetail; editable: boolean }) {
  const qc = useQueryClient();
  const idStr = String(session.id);
  const key = ['session-criteria', idStr];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<SessionCriteriaResponse>(`/sessions/${session.id}/criteria`)).data,
  });

  const [useCustom, setUseCustom] = useState(false);
  const [rows, setRows] = useState<CriterionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [togglingOff, setTogglingOff] = useState(false);

  // Hydrate depuis le serveur à chaque (re)chargement.
  useEffect(() => {
    if (data) {
      setUseCustom(data.useCustomCriteria);
      setRows(data.criteria.map((c) => ({ id: c.id, label: c.label })));
    }
  }, [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['session', idStr] });
  };

  const enableCustom = () => {
    setUseCustom(true);
    if (rows.length === 0) setRows([{ label: '' }]);
  };

  const disableCustom = async () => {
    setTogglingOff(true);
    try {
      await api.patch(`/sessions/${session.id}`, { useCustomCriteria: false });
      setUseCustom(false);
      toast.success('Critères personnalisés désactivés. La grille générale sera appliquée.');
      invalidate();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setTogglingOff(false);
    }
  };

  const onToggle = (v: boolean) => {
    if (!editable) return;
    if (v) enableCustom();
    else disableCustom();
  };

  const setLabel = (i: number, label: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, label } : r)));
  const addRow = () => setRows((rs) => [...rs, { label: '' }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    const cleaned = rows.map((r) => ({ label: r.label.trim() })).filter((r) => r.label);
    if (cleaned.length === 0) {
      toast.error('Ajoutez au moins un critère.');
      return;
    }
    setSaving(true);
    try {
      const { data: saved } = await api.put<SessionCriteriaResponse>(
        `/sessions/${session.id}/criteria`,
        { criteria: cleaned },
      );
      setUseCustom(saved.useCustomCriteria);
      setRows(saved.criteria.map((c) => ({ id: c.id, label: c.label })));
      toast.success('Critères de la session enregistrés.');
      invalidate();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Critères d'évaluation"
        subtitle="Utilisez la grille générale du référentiel, ou définissez des critères propres à cette session."
        action={
          editable && useCustom ? (
            <ImportButton
              entity="session-criteria"
              sessionId={session.id}
              title="Importer les critères"
              description="Importez les critères propres à cette session depuis un fichier Excel. Ils remplaceront la liste actuelle."
              onDone={invalidate}
            />
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="mt-5">
          <LoadingBlock label="Chargement des critères…" />
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                Utiliser des critères personnalisés pour cette session
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {useCustom
                  ? 'Cette session est évaluée avec la grille définie ci-dessous.'
                  : 'Cette session utilise la grille générale du référentiel.'}
              </p>
            </div>
            <Toggle checked={useCustom} onChange={onToggle} disabled={!editable || togglingOff} />
          </div>

          {!editable && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-subtle">
              <Lock className="h-3.5 w-3.5" /> Session ouverte — les critères sont verrouillés (lecture seule).
            </p>
          )}

          {useCustom ? (
            <div className="mt-5 space-y-3">
              {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-subtle">
                  Aucun critère. Ajoutez-en un pour construire la grille de cette session.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {rows.map((r, i) => (
                    <li key={r.id ?? `new-${i}`} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-xs font-bold text-muted tabular-nums">
                        {i + 1}
                      </span>
                      <Input
                        value={r.label}
                        onChange={(e) => setLabel(i, e.target.value)}
                        placeholder="p.ex. Maîtrise technique du sujet"
                        disabled={!editable}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={!editable}
                        aria-label="Retirer le critère"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink/35 transition hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {editable && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Button variant="subtle" size="sm" onClick={addRow}>
                    <Plus className="h-4 w-4" /> Ajouter un critère
                  </Button>
                  <Button onClick={save} loading={saving}>
                    <Save className="h-4 w-4" /> Enregistrer les critères
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-line bg-surface/60 p-4 text-sm text-muted">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
              <p>
                La grille générale du référentiel sera appliquée à cette session.
                {editable && ' Activez l’option ci-dessus pour définir des critères spécifiques.'}
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ————————————————————————————————— Onglet Suivi temps réel —————————————————————————————————

function LiveTab({ sessionId }: { sessionId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-dashboard', sessionId],
    queryFn: async () => (await api.get<SessionDashboard>(`/sessions/${sessionId}/dashboard`)).data,
    refetchInterval: 10_000,
  });

  if (isLoading) return <LoadingBlock label="Chargement du suivi…" />;
  if (isError || !data)
    return (
      <EmptyState
        icon={Activity}
        title="Suivi indisponible"
        description="Le tableau de bord temps réel n'est pas encore disponible pour cette session."
      />
    );

  const submitted = dashSubmitted(data);
  const expected = dashExpected(data);
  const discrepancies = dashDiscrepancies(data);
  const pct = expected > 0 ? Math.round((submitted / expected) * 100) : 0;
  const perStudent = data.perStudentStatus ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Évaluations soumises" value={`${submitted}/${expected}`} icon={CheckCircle2} tone="teal" index={0} />
        <StatCard label="Progression" value={`${pct}%`} icon={Activity} tone="violet" index={1} />
        <StatCard
          label="Écarts détectés"
          value={discrepancies}
          icon={AlertTriangle}
          tone={discrepancies > 0 ? 'danger' : 'violet'}
          index={2}
        />
      </div>

      <Card>
        <CardHeader
          title="Avancement des évaluations"
          subtitle="Actualisé automatiquement toutes les 10 secondes."
          action={
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              En direct
            </span>
          }
        />
        <div className="mt-4">
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          <p className="mt-2 text-xs text-subtle">
            {submitted} sur {expected} évaluations attendues soumises.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Suivi par étudiant" subtitle="État des évaluations reçues et écarts éventuels." />
        <div className="mt-4">
          {perStudent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-subtle">
              Aucune donnée de suivi pour l'instant.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {perStudent.map((s: DashboardStudent, i) => {
                const sub = dsSubmitted(s);
                const tot = dsTotal(s);
                const done = tot > 0 && sub >= tot;
                const flag = dsDiscrepancy(s);
                return (
                  <motion.li
                    key={s.studentId ?? s.id ?? i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
                  >
                    <Avatar first={dsFirstName(s)} last={dsLastName(s)} className="h-9 w-9 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {studentName({ lastName: dsLastName(s), postnom: dsPostnom(s), firstName: dsFirstName(s) })}
                      </p>
                      {dsMatricule(s) && <p className="truncate text-xs text-subtle">{dsMatricule(s)}</p>}
                    </div>
                    {flag && (
                      <Badge tone="danger">
                        <AlertTriangle className="h-3 w-3" /> Écart
                      </Badge>
                    )}
                    <Badge tone={done ? 'success' : 'neutral'}>
                      {sub}/{tot} soumises
                    </Badge>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-xs text-ink/40">
        <ScrollText className="h-3.5 w-3.5" /> Toute action est journalisée (audit).
      </p>
    </div>
  );
}
