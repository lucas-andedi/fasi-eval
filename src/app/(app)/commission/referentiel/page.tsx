'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  ListChecks,
  Building2,
  FolderTree,
} from 'lucide-react';

import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input } from '@/components/ui/Input';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { ImportButton, ExportButton } from '@/components/import';

// ————————————————————————————————— Types —————————————————————————————————

type Criterion = { id: number; number: number; label: string; archived: boolean };
type Option = { id: number; name: string; departmentId: number };
type Department = { id: number; name: string; options: Option[] };

// ————————————————————————————————— Page —————————————————————————————————

export default function ReferentielPage() {
  const [tab, setTab] = useState('criteria');

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Référentiel"
        description="Gérez les critères d'évaluation et la structure départements / options."
      />

      <Tabs
        className="mb-6 flex-wrap"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'criteria', label: "Critères d'évaluation" },
          { value: 'departments', label: 'Départements & options' },
        ]}
      />

      {tab === 'criteria' ? <CriteriaTab /> : <DepartmentsTab />}
    </div>
  );
}

// ————————————————————————————————— Onglet Critères —————————————————————————————————

function CriteriaTab() {
  const qc = useQueryClient();
  const key = ['criteria', 'all'];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<Criterion[]>('/criteria', { params: { includeArchived: 1 } })).data,
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [deleting, setDeleting] = useState<Criterion | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const criteria = [...(data ?? [])].sort((a, b) => a.number - b.number);

  const toggleArchive = async (c: Criterion) => {
    setBusyId(c.id);
    try {
      await api.post(`/criteria/${c.id}/${c.archived ? 'restore' : 'archive'}`);
      toast.success(c.archived ? 'Critère restauré.' : 'Critère archivé.');
      invalidate();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await api.delete(`/criteria/${deleting.id}`);
      toast.success('Critère supprimé.');
      invalidate();
      setDeleting(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyDelete(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Critères d'évaluation"
        subtitle="Chaque critère est noté par le jury. Archivez un critère pour le retirer des nouvelles grilles sans altérer l'historique."
        action={
          <div className="flex flex-wrap gap-2.5">
            <ExportButton entity="criteria" filenameHint="criteres.xlsx" />
            <ImportButton
              entity="criteria"
              title="Importer des critères"
              description="Ajoutez ou mettez à jour les critères du référentiel général depuis un fichier Excel."
              onDone={invalidate}
            />
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Ajouter un critère
            </Button>
          </div>
        }
      />

      <div className="mt-5">
        {isLoading ? (
          <LoadingBlock label="Chargement des critères…" />
        ) : criteria.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Aucun critère"
            description="Ajoutez le premier critère d'évaluation pour construire la grille."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Ajouter un critère
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {criteria.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex items-center gap-4 px-4 py-3.5 ${c.archived ? 'opacity-55' : ''}`}
              >
                <span className="w-6 shrink-0 text-right font-display text-sm font-semibold text-subtle tabular-nums">
                  {c.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                  {c.label}
                </span>
                {c.archived && (
                  <Badge tone="neutral" className="shrink-0">
                    Archivé
                  </Badge>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <IconAction label="Renommer" onClick={() => setEditing(c)}>
                    <Pencil className="h-4 w-4" />
                  </IconAction>
                  <IconAction
                    label={c.archived ? 'Restaurer' : 'Archiver'}
                    onClick={() => toggleArchive(c)}
                    disabled={busyId === c.id}
                  >
                    {c.archived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </IconAction>
                  <IconAction label="Supprimer" danger onClick={() => setDeleting(c)}>
                    <Trash2 className="h-4 w-4" />
                  </IconAction>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Création */}
      <CriterionFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={invalidate}
      />
      {/* Renommage */}
      <CriterionFormModal
        open={!!editing}
        criterion={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busyDelete}
        tone="danger"
        confirmLabel="Supprimer"
        title="Supprimer ce critère ?"
        description={
          deleting
            ? `« ${deleting.label} » sera définitivement supprimé. Si le critère a déjà servi à des évaluations, préférez l'archiver.`
            : ''
        }
      />
    </Card>
  );
}

function CriterionFormModal({
  open,
  criterion,
  onClose,
  onSaved,
}: {
  open: boolean;
  criterion?: Criterion;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editMode = !!criterion;
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // Réinitialise le champ à chaque ouverture.
  const [seededFor, setSeededFor] = useState<number | 'new' | null>(null);
  const seedKey = criterion?.id ?? 'new';
  if (open && seededFor !== seedKey) {
    setLabel(criterion?.label ?? '');
    setSeededFor(seedKey);
  }
  if (!open && seededFor !== null) setSeededFor(null);

  const submit = async () => {
    const value = label.trim();
    if (!value) {
      toast.error('Le libellé est requis.');
      return;
    }
    setSaving(true);
    try {
      if (editMode) {
        await api.patch(`/criteria/${criterion!.id}`, { label: value });
        toast.success('Critère renommé.');
      } else {
        await api.post('/criteria', { label: value });
        toast.success('Critère ajouté.');
      }
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
      size="md"
      title={editMode ? 'Renommer le critère' : 'Ajouter un critère'}
      description={
        editMode
          ? 'Modifiez le libellé affiché dans la grille d’évaluation.'
          : 'Le numéro est attribué automatiquement à la suite des critères existants.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={submit} loading={saving}>
            {editMode ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <Field label="Libellé du critère" required>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="p.ex. Maîtrise technique du sujet"
          autoFocus
        />
      </Field>
    </Modal>
  );
}

// ————————————————————————————————— Onglet Départements & options —————————————————————————————————

function DepartmentsTab() {
  const qc = useQueryClient();
  const key = ['departments'];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<Department[]>('/departments')).data,
  });

  const [creating, setCreating] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const departments = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Départements & options</h3>
          <p className="text-sm text-muted">
            {departments.length} département{departments.length > 1 ? 's' : ''} · structure de rattachement des étudiants.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Ajouter un département
        </Button>
      </div>

      {isLoading ? (
        <LoadingBlock label="Chargement des départements…" />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun département"
          description="Créez un premier département, puis ajoutez-y ses options."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Ajouter un département
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {departments.map((d, i) => (
            <DepartmentCard key={d.id} department={d} index={i} onChanged={invalidate} />
          ))}
        </div>
      )}

      <DepartmentFormModal open={creating} onClose={() => setCreating(false)} onSaved={invalidate} />
    </div>
  );
}

function DepartmentCard({
  department,
  index,
  onChanged,
}: {
  department: Department;
  index: number;
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [deletingOption, setDeletingOption] = useState<Option | null>(null);
  const [busyOption, setBusyOption] = useState(false);

  const removeDepartment = async () => {
    setBusyDelete(true);
    try {
      await api.delete(`/departments/${department.id}`);
      toast.success('Département supprimé.');
      onChanged();
      setDeleting(false);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyDelete(false);
    }
  };

  const removeOption = async () => {
    if (!deletingOption) return;
    setBusyOption(true);
    try {
      await api.delete(`/options/${deletingOption.id}`);
      toast.success('Option supprimée.');
      onChanged();
      setDeletingOption(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyOption(false);
    }
  };

  const options = department.options ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted">
              <FolderTree className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h4 className="truncate font-display text-[17px] font-bold text-ink">{department.name}</h4>
              <p className="text-xs text-subtle">
                {options.length} option{options.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconAction label="Renommer" onClick={() => setRenaming(true)}>
              <Pencil className="h-4 w-4" />
            </IconAction>
            <IconAction label="Supprimer" danger onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4" />
            </IconAction>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          {options.length === 0 ? (
            <p className="text-sm text-subtle">Aucune option dans ce département.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {options.map((o) => (
                <li
                  key={o.id}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-3 pr-1.5 text-sm text-ink"
                >
                  <span className="font-medium">{o.name}</span>
                  <button
                    onClick={() => setEditingOption(o)}
                    className="grid h-6 w-6 place-items-center rounded-full text-subtle transition hover:bg-paper hover:text-ink"
                    aria-label={`Renommer l'option ${o.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingOption(o)}
                    className="grid h-6 w-6 place-items-center rounded-full text-subtle transition hover:bg-danger/10 hover:text-danger"
                    aria-label={`Supprimer l'option ${o.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button variant="subtle" size="sm" className="mt-3" onClick={() => setAddingOption(true)}>
            <Plus className="h-4 w-4" /> Ajouter une option
          </Button>
        </div>
      </Card>

      {/* Renommage département */}
      <DepartmentFormModal
        open={renaming}
        department={department}
        onClose={() => setRenaming(false)}
        onSaved={onChanged}
      />

      {/* Ajout option */}
      <OptionFormModal
        open={addingOption}
        departmentId={department.id}
        departmentName={department.name}
        onClose={() => setAddingOption(false)}
        onSaved={onChanged}
      />
      {/* Renommage option */}
      <OptionFormModal
        open={!!editingOption}
        departmentId={department.id}
        departmentName={department.name}
        option={editingOption ?? undefined}
        onClose={() => setEditingOption(null)}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={removeDepartment}
        loading={busyDelete}
        tone="danger"
        confirmLabel="Supprimer"
        title="Supprimer ce département ?"
        description={`« ${department.name} » sera supprimé. Cette action est impossible si des options ou des étudiants y sont rattachés.`}
      />
      <ConfirmDialog
        open={!!deletingOption}
        onClose={() => setDeletingOption(null)}
        onConfirm={removeOption}
        loading={busyOption}
        tone="danger"
        confirmLabel="Supprimer"
        title="Supprimer cette option ?"
        description={
          deletingOption
            ? `« ${deletingOption.name} » sera supprimée. Cette action est impossible si des étudiants y sont rattachés.`
            : ''
        }
      />
    </motion.div>
  );
}

function DepartmentFormModal({
  open,
  department,
  onClose,
  onSaved,
}: {
  open: boolean;
  department?: Department;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editMode = !!department;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [seededFor, setSeededFor] = useState<number | 'new' | null>(null);
  const seedKey = department?.id ?? 'new';
  if (open && seededFor !== seedKey) {
    setName(department?.name ?? '');
    setSeededFor(seedKey);
  }
  if (!open && seededFor !== null) setSeededFor(null);

  const submit = async () => {
    const value = name.trim();
    if (!value) {
      toast.error('Le nom est requis.');
      return;
    }
    setSaving(true);
    try {
      if (editMode) {
        await api.patch(`/departments/${department!.id}`, { name: value });
        toast.success('Département renommé.');
      } else {
        await api.post('/departments', { name: value });
        toast.success('Département ajouté.');
      }
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
      size="md"
      title={editMode ? 'Renommer le département' : 'Ajouter un département'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={submit} loading={saving}>
            {editMode ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <Field label="Nom du département" required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="p.ex. Génie Informatique"
          autoFocus
        />
      </Field>
    </Modal>
  );
}

function OptionFormModal({
  open,
  departmentId,
  departmentName,
  option,
  onClose,
  onSaved,
}: {
  open: boolean;
  departmentId: number;
  departmentName: string;
  option?: Option;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editMode = !!option;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [seededFor, setSeededFor] = useState<number | 'new' | null>(null);
  const seedKey = option?.id ?? 'new';
  if (open && seededFor !== seedKey) {
    setName(option?.name ?? '');
    setSeededFor(seedKey);
  }
  if (!open && seededFor !== null) setSeededFor(null);

  const submit = async () => {
    const value = name.trim();
    if (!value) {
      toast.error('Le nom est requis.');
      return;
    }
    setSaving(true);
    try {
      if (editMode) {
        await api.patch(`/options/${option!.id}`, { name: value });
        toast.success('Option renommée.');
      } else {
        await api.post('/options', { name: value, departmentId });
        toast.success('Option ajoutée.');
      }
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
      size="md"
      title={editMode ? "Renommer l'option" : 'Ajouter une option'}
      description={`Département : ${departmentName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={submit} loading={saving}>
            {editMode ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <Field label="Nom de l'option" required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="p.ex. Génie Logiciel"
          autoFocus
        />
      </Field>
    </Modal>
  );
}

// ————————————————————————————————— Bouton d'action discret —————————————————————————————————

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg text-ink/40 transition disabled:pointer-events-none disabled:opacity-30 ${
        danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-surface hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
