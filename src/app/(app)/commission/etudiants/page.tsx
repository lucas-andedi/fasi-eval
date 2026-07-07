'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  GraduationCap,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import type { Student, Promotion, Department } from '@/lib/types';
import { studentName } from '@/lib/names';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input, Select, Field } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { ImportButton, ExportButton } from '@/components/import';

/** RG-04 : les promotions L3/L4 exigent un département ET une option. */
function requiresRattachement(code?: string): boolean {
  const c = (code ?? '').trim().toUpperCase();
  return c === 'L3' || c === 'L4';
}

export default function CommissionEtudiantsPage() {
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [promotionId, setPromotionId] = useState<'all' | number>('all');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);

  const { data: promotions = [] } = useQuery({
    queryKey: ['reference', 'promotions'],
    queryFn: async () => (await api.get<Promotion[]>('/reference/promotions')).data,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['reference', 'departments'],
    queryFn: async () => (await api.get<Department[]>('/reference/departments')).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', promotionId, q],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (promotionId !== 'all') params.promotionId = String(promotionId);
      if (q.trim()) params.q = q.trim();
      return (await api.get<Student[]>('/students', { params })).data;
    },
  });

  const students = data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['students'] });

  // ---- Mutations ----
  const createMut = useMutation({
    mutationFn: async (body: StudentPayload) => (await api.post<Student>('/students', body)).data,
    onSuccess: (s) => {
      invalidate();
      setCreateOpen(false);
      toast.success(`Étudiant ${studentName(s)} ajouté.`);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const editMut = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: StudentPayload }) =>
      (await api.patch<Student>(`/students/${id}`, body)).data,
    onSuccess: () => {
      invalidate();
      setEditStudent(null);
      toast.success('Étudiant mis à jour.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/students/${id}`)).data,
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
      toast.success('Étudiant supprimé.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const l3l4Count = useMemo(
    () => students.filter((s) => requiresRattachement(s.promotion?.code)).length,
    [students],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Référentiel"
        title="Étudiants"
        description="Gérez la liste des étudiants et leur rattachement (L3/L4)."
        action={
          <>
            <ExportButton entity="students" filenameHint="etudiants.xlsx" />
            <ImportButton
              entity="students"
              title="Importer des étudiants"
              description="Ajoutez ou mettez à jour des étudiants en masse depuis un fichier Excel."
              onDone={invalidate}
            />
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Nouvel étudiant
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un nom ou un matricule…"
            className="pl-10"
          />
        </div>
        <Select
          value={promotionId === 'all' ? 'all' : String(promotionId)}
          onChange={(e) => setPromotionId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="sm:w-64"
        >
          <option value="all">Toutes les promotions</option>
          {promotions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.label}
            </option>
          ))}
        </Select>
      </motion.div>

      {isLoading ? (
        <LoadingBlock label="Chargement des étudiants…" />
      ) : students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucun étudiant trouvé"
          description="Aucun étudiant ne correspond à vos critères. Ajustez les filtres ou ajoutez un étudiant."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Nouvel étudiant
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            <span className="font-bold text-ink">{students.length}</span> étudiant{students.length > 1 ? 's' : ''}
            {l3l4Count > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-accent">
                  {l3l4Count} en L3/L4
                </span>
              </>
            )}
          </p>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Desktop : tableau */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Nom</TH>
                    <TH>Matricule</TH>
                    <TH>Promotion</TH>
                    <TH>Département / Option</TH>
                    <TH>Sujet</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {students.map((s) => (
                    <TR key={s.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar first={s.firstName} last={s.lastName} className="h-9 w-9 text-xs" />
                          <span className="font-semibold text-ink">
                            {studentName(s)}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <span className="font-mono text-xs text-ink/60">{s.matricule}</span>
                      </TD>
                      <TD>
                        {s.promotion?.code ? (
                          <Badge tone="neutral">{s.promotion.code}</Badge>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TD>
                      <TD>
                        {s.department?.name ? (
                          <div className="leading-tight">
                            <span className="text-ink/80">{s.department.name}</span>
                            {s.option?.name && (
                              <span className="block text-xs text-subtle">{s.option.name}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TD>
                      <TD>
                        {s.projectSubject ? (
                          <span className="block max-w-[220px] truncate text-muted" title={s.projectSubject}>
                            {s.projectSubject}
                          </span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TD>
                      <TD className="text-right">
                        <RowMenu
                          onEdit={() => setEditStudent(s)}
                          onDelete={() => setConfirmDelete(s)}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            {/* Mobile : liste de cartes empilées */}
            <div className="space-y-3 md:hidden">
              {students.map((s) => (
                <div key={s.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar first={s.firstName} last={s.lastName} className="h-10 w-10 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">
                          {studentName(s)}
                        </p>
                        <p className="font-mono text-xs text-ink/60">{s.matricule}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {s.promotion?.code ? (
                        <Badge tone="neutral">{s.promotion.code}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-xs font-medium text-subtle">Département</dt>
                      <dd className="min-w-0 text-ink/80">
                        {s.department?.name ? (
                          <>
                            {s.department.name}
                            {s.option?.name && (
                              <span className="block text-xs text-subtle">{s.option.name}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-xs font-medium text-subtle">Sujet</dt>
                      <dd className="min-w-0 text-muted">
                        {s.projectSubject ? s.projectSubject : <span className="text-subtle">—</span>}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3">
                    <Button variant="ghost" size="sm" onClick={() => setEditStudent(s)}>
                      <Pencil className="h-4 w-4" /> Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/8"
                      onClick={() => setConfirmDelete(s)}
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* Create modal */}
      <StudentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvel étudiant"
        description="Renseignez l'identité et le rattachement de l'étudiant."
        submitLabel="Ajouter l'étudiant"
        loading={createMut.isPending}
        promotions={promotions}
        departments={departments}
        onSubmit={(v) => createMut.mutate(v)}
      />

      {/* Edit modal */}
      <StudentFormModal
        key={editStudent?.id ?? 'edit'}
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        title="Modifier l'étudiant"
        description={editStudent ? studentName(editStudent) : undefined}
        submitLabel="Enregistrer"
        loading={editMut.isPending}
        promotions={promotions}
        departments={departments}
        initial={editStudent ?? undefined}
        onSubmit={(v) => {
          if (!editStudent) return;
          editMut.mutate({ id: editStudent.id, body: v });
        }}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        loading={deleteMut.isPending}
        tone="danger"
        confirmLabel="Supprimer"
        title="Supprimer cet étudiant ?"
        description={
          confirmDelete
            ? `${studentName(confirmDelete)} (${confirmDelete.matricule}) sera retiré du référentiel. Cette action est irréversible.`
            : ''
        }
      />
    </div>
  );
}

/* ---------------- Row actions menu ---------------- */
function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const act = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-paper p-1 text-left shadow-card"
          >
            <MenuItem icon={Pencil} label="Modifier" onClick={() => act(onEdit)} />
            <div className="my-1 h-px bg-line" />
            <MenuItem icon={Trash2} label="Supprimer" tone="danger" onClick={() => act(onDelete)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  const toneCls = tone === 'danger' ? 'text-danger hover:bg-danger/8' : 'text-muted hover:bg-surface';
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${toneCls}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

/* ---------------- Student create/edit form modal ---------------- */
type StudentPayload = {
  matricule: string;
  firstName: string;
  lastName: string;
  postnom?: string | null;
  promotionId: number;
  departmentId?: number | null;
  optionId?: number | null;
  projectSubject?: string | null;
};

type FormValues = {
  matricule: string;
  firstName: string;
  lastName: string;
  postnom: string;
  promotionId: string;
  departmentId: string;
  optionId: string;
  projectSubject: string;
};

function StudentFormModal({
  open,
  onClose,
  title,
  description,
  submitLabel,
  loading,
  promotions,
  departments,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel: string;
  loading?: boolean;
  promotions: Promotion[];
  departments: Department[];
  initial?: Student;
  onSubmit: (v: StudentPayload) => void;
}) {
  const buildInitial = (): FormValues => ({
    matricule: initial?.matricule ?? '',
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    postnom: initial?.postnom ?? '',
    promotionId: initial?.promotionId ? String(initial.promotionId) : '',
    departmentId: initial?.departmentId ? String(initial.departmentId) : '',
    optionId: initial?.optionId ? String(initial.optionId) : '',
    projectSubject: initial?.projectSubject ?? '',
  });

  const [values, setValues] = useState<FormValues>(buildInitial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  // Reset when opening for a different student / create
  useEffect(() => {
    if (open) {
      setValues(buildInitial());
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const selectedPromo = promotions.find((p) => String(p.id) === values.promotionId);
  const rattachementRequired = requiresRattachement(selectedPromo?.code);

  // Options filtrées selon le département choisi (RG-04)
  const selectedDept = departments.find((d) => String(d.id) === values.departmentId);
  const availableOptions = selectedDept?.options ?? [];

  // Si le département change et que l'option ne lui appartient plus, on la réinitialise.
  useEffect(() => {
    if (values.optionId && !availableOptions.some((o) => String(o.id) === values.optionId)) {
      set('optionId', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.departmentId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof FormValues, string>> = {};

    if (!values.matricule.trim()) next.matricule = 'Le matricule est requis.';
    if (!values.firstName.trim()) next.firstName = 'Le prénom est requis.';
    if (!values.lastName.trim()) next.lastName = 'Le nom est requis.';
    if (!values.promotionId) next.promotionId = 'La promotion est requise.';

    // RG-04 : L3/L4 → département + option obligatoires
    if (rattachementRequired) {
      if (!values.departmentId) next.departmentId = 'Le département est obligatoire pour une promotion L3/L4.';
      if (!values.optionId) next.optionId = "L'option est obligatoire pour une promotion L3/L4.";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      toast.error('Veuillez corriger les champs signalés.');
      return;
    }

    const payload: StudentPayload = {
      matricule: values.matricule.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      postnom: values.postnom.trim() || null,
      promotionId: Number(values.promotionId),
      projectSubject: values.projectSubject.trim() || null,
    };

    if (rattachementRequired) {
      payload.departmentId = Number(values.departmentId);
      payload.optionId = Number(values.optionId);
    } else {
      // Rattachement optionnel pour les autres promotions : on n'envoie que si renseigné.
      payload.departmentId = values.departmentId ? Number(values.departmentId) : null;
      payload.optionId = values.optionId ? Number(values.optionId) : null;
    }

    onSubmit(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nom" required error={errors.lastName}>
            <Input
              value={values.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Postnom" hint="Optionnel">
            <Input value={values.postnom} onChange={(e) => set('postnom', e.target.value)} />
          </Field>
          <Field label="Prénom" required error={errors.firstName}>
            <Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Matricule" required error={errors.matricule}>
            <Input
              value={values.matricule}
              onChange={(e) => set('matricule', e.target.value)}
              placeholder="p.ex. 21-3045"
              className="font-mono"
            />
          </Field>
          <Field label="Promotion" required error={errors.promotionId}>
            <Select value={values.promotionId} onChange={(e) => set('promotionId', e.target.value)}>
              <option value="" disabled>
                Sélectionner…
              </option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {rattachementRequired && (
          <div className="rounded-xl border border-accent-200 bg-accent-weak/50 p-3">
            <p className="mb-3 text-xs font-medium text-accent-700">
              Promotion {selectedPromo?.code} — le département et l&apos;option sont obligatoires (RG-04).
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Département" required error={errors.departmentId}>
                <Select
                  value={values.departmentId}
                  onChange={(e) => set('departmentId', e.target.value)}
                >
                  <option value="" disabled>
                    Sélectionner…
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Option"
                required
                error={errors.optionId}
                hint={!values.departmentId ? 'Choisissez d’abord un département.' : undefined}
              >
                <Select
                  value={values.optionId}
                  onChange={(e) => set('optionId', e.target.value)}
                  disabled={!values.departmentId}
                >
                  <option value="" disabled>
                    Sélectionner…
                  </option>
                  {availableOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        )}

        <Field label="Sujet du projet" hint="Optionnel — intitulé du projet de fin d'études.">
          <Input
            value={values.projectSubject}
            onChange={(e) => set('projectSubject', e.target.value)}
            placeholder="p.ex. Plateforme de gestion des soutenances"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
