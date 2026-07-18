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
  KeyRound,
  Mail,
  Power,
  PowerOff,
  Copy,
  Check,
  ShieldCheck,
  Users as UsersIcon,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import type { UserRow, Role } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/rbac';
import { fmtDateTime } from '@/lib/utils';
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

const ROLES = Object.keys(ROLE_LABEL) as Role[];

type CreatedInfo = { user: UserRow; tempPassword: string };

export default function AdminUsersPage() {
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all' | Role>('all');
  const [active, setActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [credential, setCredential] = useState<{ tempPassword: string; user: UserRow; kind: 'create' | 'reset' } | null>(null);
  const [confirm, setConfirm] = useState<{ user: UserRow; action: 'activate' | 'deactivate' } | null>(null);
  const [confirmReset, setConfirmReset] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { role, active, q }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (role !== 'all') params.role = role;
      if (active !== 'all') params.active = active === 'active' ? 'true' : 'false';
      if (q.trim()) params.q = q.trim();
      return (await api.get<UserRow[]>('/users', { params })).data;
    },
  });

  const users = data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  // ---- Mutations ----
  const createMut = useMutation({
    mutationFn: async (body: { username: string; firstName: string; lastName: string; email: string; roles: Role[] }) =>
      (await api.post<CreatedInfo>('/users', body)).data,
    onSuccess: (res) => {
      invalidate();
      setCreateOpen(false);
      setCredential({ tempPassword: res.tempPassword, user: res.user, kind: 'create' });
      toast.success(`Compte de ${res.user.firstName} ${res.user.lastName} créé.`);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const editMut = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Partial<Pick<UserRow, 'firstName' | 'lastName' | 'email' | 'roles'>> }) =>
      (await api.patch<UserRow>(`/users/${id}`, body)).data,
    onSuccess: () => {
      invalidate();
      setEditUser(null);
      toast.success('Compte mis à jour.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'activate' | 'deactivate' }) =>
      (await api.post(`/users/${id}/${action}`)).data,
    onSuccess: (_d, v) => {
      invalidate();
      setConfirm(null);
      toast.success(v.action === 'activate' ? 'Compte activé.' : 'Compte désactivé.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const resetMut = useMutation({
    mutationFn: async (user: UserRow) => ({
      res: (await api.post<{ tempPassword: string; emailed: boolean }>(`/users/${user.id}/reset-password`)).data,
      user,
    }),
    onSuccess: ({ res, user }) => {
      invalidate();
      setConfirmReset(null);
      setCredential({ tempPassword: res.tempPassword, user, kind: 'reset' });
      toast.success(
        res.emailed
          ? `Mot de passe réinitialisé — accès envoyés à ${user.email}.`
          : 'Mot de passe réinitialisé. E-mail indisponible : communiquez les accès affichés.',
      );
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const resendMut = useMutation({
    mutationFn: async (user: UserRow) => ({
      res: (await api.post<{ tempPassword: string; emailed: boolean }>(`/users/${user.id}/resend-credentials`)).data,
      user,
    }),
    onSuccess: ({ res, user }) => {
      invalidate();
      setCredential({ tempPassword: res.tempPassword, user, kind: 'reset' });
      toast.success(
        res.emailed
          ? `Accès renvoyés par e-mail à ${user.email}.`
          : 'E-mail indisponible : communiquez les accès affichés.',
      );
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const activeCount = useMemo(() => users.filter((u) => u.active).length, [users]);

  return (
    <div>
      <PageHeader
        eyebrow="Administration · CU-18"
        title="Gestion des comptes"
        description="Créez et administrez les comptes des acteurs de la plateforme. Chaque opération est journalisée."
        action={
          <>
            <ExportButton entity="users" filenameHint="comptes.xlsx" />
            <ImportButton
              entity="users"
              title="Importer des comptes"
              description="Créez ou mettez à jour des comptes en masse depuis un fichier Excel. Un mot de passe temporaire est généré pour chaque nouveau compte."
              onDone={invalidate}
            />
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Nouveau compte
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
            placeholder="Rechercher un nom, identifiant ou e-mail…"
            className="pl-10"
          />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value as 'all' | Role)} className="sm:w-56">
          <option value="all">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
        <Select value={active} onChange={(e) => setActive(e.target.value as typeof active)} className="sm:w-44">
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Suspendus</option>
        </Select>
      </motion.div>

      {isLoading ? (
        <LoadingBlock label="Chargement des comptes…" />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Aucun compte trouvé"
          description="Aucun utilisateur ne correspond à vos critères. Ajustez les filtres ou créez un compte."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Nouveau compte
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            <span className="font-bold text-ink">{users.length}</span> compte{users.length > 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold text-accent">{activeCount} actif{activeCount > 1 ? 's' : ''}</span>
          </p>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Desktop : tableau */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Nom</TH>
                    <TH>Identifiant</TH>
                    <TH>E-mail</TH>
                    <TH>Rôle</TH>
                    <TH>Statut</TH>
                    <TH>Dernière connexion</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {users.map((u) => (
                    <TR key={u.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar first={u.firstName} last={u.lastName} className="h-9 w-9 text-xs" />
                          <span className="font-semibold text-ink">
                            {u.firstName} {u.lastName}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <span className="font-mono text-xs text-ink/60">@{u.username}</span>
                      </TD>
                      <TD className="text-muted">{u.email}</TD>
                      <TD>
                        <div className="flex flex-wrap gap-1.5">
                          {u.roles.map((r) => (
                            <Badge key={r} tone="neutral">{ROLE_LABEL[r]}</Badge>
                          ))}
                        </div>
                      </TD>
                      <TD>
                        {u.active ? (
                          <Badge tone="success" dot>
                            Actif
                          </Badge>
                        ) : (
                          <Badge tone="neutral" dot>
                            Suspendu
                          </Badge>
                        )}
                      </TD>
                      <TD className="text-xs text-subtle">
                        {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Jamais'}
                      </TD>
                      <TD className="text-right">
                        <RowMenu
                          user={u}
                          onEdit={() => setEditUser(u)}
                          onToggle={() => setConfirm({ user: u, action: u.active ? 'deactivate' : 'activate' })}
                          onReset={() => setConfirmReset(u)}
                          onResend={() => resendMut.mutate(u)}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            {/* Mobile : liste de cartes empilées */}
            <div className="space-y-3 md:hidden">
              {users.map((u) => (
                <div key={u.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar first={u.firstName} last={u.lastName} className="h-10 w-10 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="truncate font-mono text-xs text-ink/60">@{u.username}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <RowMenu
                        user={u}
                        onEdit={() => setEditUser(u)}
                        onToggle={() => setConfirm({ user: u, action: u.active ? 'deactivate' : 'activate' })}
                        onReset={() => setConfirmReset(u)}
                        onResend={() => resendMut.mutate(u)}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {u.roles.map((r) => (
                      <Badge key={r} tone="neutral">{ROLE_LABEL[r]}</Badge>
                    ))}
                    {u.active ? (
                      <Badge tone="success" dot>
                        Actif
                      </Badge>
                    ) : (
                      <Badge tone="neutral" dot>
                        Suspendu
                      </Badge>
                    )}
                  </div>

                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-xs font-medium text-subtle">E-mail</dt>
                      <dd className="min-w-0 break-all text-muted">{u.email}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-xs font-medium text-subtle">Dernière connexion</dt>
                      <dd className="min-w-0 text-ink/70">
                        {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Jamais'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* Create modal */}
      <UserFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau compte"
        description="Un mot de passe temporaire sera généré et communiqué à l'utilisateur."
        submitLabel="Créer le compte"
        loading={createMut.isPending}
        withUsername
        onSubmit={(v) => createMut.mutate(v)}
      />

      {/* Edit modal */}
      <UserFormModal
        key={editUser?.id ?? 'edit'}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Modifier le compte"
        description={editUser ? `@${editUser.username}` : undefined}
        submitLabel="Enregistrer"
        loading={editMut.isPending}
        initial={editUser ?? undefined}
        onSubmit={(v) => {
          if (!editUser) return;
          editMut.mutate({
            id: editUser.id,
            body: { firstName: v.firstName, lastName: v.lastName, email: v.email, roles: v.roles },
          });
        }}
      />

      {/* Credential modal (temp password) */}
      <CredentialModal info={credential} onClose={() => setCredential(null)} />

      {/* Confirm activate/deactivate */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && toggleMut.mutate({ id: confirm.user.id, action: confirm.action })}
        loading={toggleMut.isPending}
        tone={confirm?.action === 'deactivate' ? 'danger' : 'primary'}
        confirmLabel={confirm?.action === 'deactivate' ? 'Désactiver' : 'Activer'}
        title={confirm?.action === 'deactivate' ? 'Désactiver ce compte ?' : 'Activer ce compte ?'}
        description={
          confirm
            ? confirm.action === 'deactivate'
              ? `${confirm.user.firstName} ${confirm.user.lastName} ne pourra plus se connecter tant que le compte reste suspendu.`
              : `${confirm.user.firstName} ${confirm.user.lastName} pourra de nouveau accéder à la plateforme.`
            : ''
        }
      />

      {/* Confirm reset password */}
      <ConfirmDialog
        open={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        onConfirm={() => confirmReset && resetMut.mutate(confirmReset)}
        loading={resetMut.isPending}
        tone="gold"
        confirmLabel="Réinitialiser"
        title="Réinitialiser le mot de passe ?"
        description={
          confirmReset
            ? `Un nouveau mot de passe temporaire sera généré pour ${confirmReset.firstName} ${confirmReset.lastName}. L'ancien deviendra invalide.`
            : ''
        }
      />
    </div>
  );
}

/* ---------------- Row actions menu ---------------- */
function RowMenu({
  user,
  onEdit,
  onToggle,
  onReset,
  onResend,
}: {
  user: UserRow;
  onEdit: () => void;
  onToggle: () => void;
  onReset: () => void;
  onResend: () => void;
}) {
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
            className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-paper p-1 text-left shadow-card"
          >
            <MenuItem icon={Pencil} label="Modifier" onClick={() => act(onEdit)} />
            <MenuItem icon={Mail} label="Renvoyer les accès (e-mail)" onClick={() => act(onResend)} />
            <MenuItem icon={KeyRound} label="Réinitialiser le mot de passe" onClick={() => act(onReset)} />
            <div className="my-1 h-px bg-line" />
            {user.active ? (
              <MenuItem icon={PowerOff} label="Désactiver" tone="danger" onClick={() => act(onToggle)} />
            ) : (
              <MenuItem icon={Power} label="Activer" tone="success" onClick={() => act(onToggle)} />
            )}
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
  tone?: 'default' | 'danger' | 'success';
}) {
  const toneCls =
    tone === 'danger'
      ? 'text-danger hover:bg-danger/8'
      : tone === 'success'
        ? 'text-success hover:bg-accent-weak'
        : 'text-muted hover:bg-surface';
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

/* ---------------- User create/edit form modal ---------------- */
type FormValues = { username: string; firstName: string; lastName: string; email: string; roles: Role[] };

function UserFormModal({
  open,
  onClose,
  title,
  description,
  submitLabel,
  loading,
  withUsername,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel: string;
  loading?: boolean;
  withUsername?: boolean;
  initial?: UserRow;
  onSubmit: (v: FormValues) => void;
}) {
  const [values, setValues] = useState<FormValues>({
    username: initial?.username ?? '',
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    email: initial?.email ?? '',
    roles: initial?.roles ?? ['JURY'],
  });

  // Reset when opening for a different user / create
  useEffect(() => {
    if (open) {
      setValues({
        username: initial?.username ?? '',
        firstName: initial?.firstName ?? '',
        lastName: initial?.lastName ?? '',
        email: initial?.email ?? '',
        roles: initial?.roles ?? ['JURY'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const toggleRole = (r: Role) =>
    setValues((s) => ({
      ...s,
      roles: s.roles.includes(r) ? s.roles.filter((x) => x !== r) : [...s.roles, r],
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (values.roles.length === 0) return;
    onSubmit(values);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Prénom" required>
            <Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} required autoFocus />
          </Field>
          <Field label="Nom" required>
            <Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          </Field>
        </div>

        {withUsername && (
          <Field label="Identifiant" required hint="Sert à la connexion — unique.">
            <Input
              value={values.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="p.ex. j.dupont"
              required
            />
          </Field>
        )}

        <Field label="Adresse e-mail" required>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="prenom.nom@fasi.cd"
            required
          />
        </Field>

        <Field label="Rôles" required hint="Sélectionnez au moins un rôle. Les rôles sont cumulables.">
          <div className="flex flex-col gap-2">
            {ROLES.map((r) => {
              const on = values.roles.includes(r);
              return (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                    on ? 'border-accent-200 bg-accent-weak' : 'border-line bg-surface hover:bg-paper'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleRole(r)}
                    className="h-4 w-4 rounded border-line-strong text-accent focus:ring-accent"
                  />
                  <span className="font-medium text-ink">{ROLE_LABEL[r]}</span>
                </label>
              );
            })}
          </div>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading} disabled={values.roles.length === 0}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Temp password reveal modal ---------------- */
function CredentialModal({
  info,
  onClose,
}: {
  info: { tempPassword: string; user: UserRow; kind: 'create' | 'reset' } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (info) setCopied(false);
  }, [info]);

  const copy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.tempPassword);
      setCopied(true);
      toast.success('Mot de passe copié.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier.');
    }
  };

  return (
    <Modal
      open={!!info}
      onClose={onClose}
      title={info?.kind === 'reset' ? 'Mot de passe réinitialisé' : 'Compte créé'}
      size="sm"
      footer={<Button onClick={onClose}>J&apos;ai noté le mot de passe</Button>}
    >
      {info && (
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {info.user.firstName} {info.user.lastName}
              </p>
              <p className="text-xs text-muted">@{info.user.username} · {info.user.email}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            Voici le mot de passe temporaire. Il ne sera affiché{' '}
            <span className="font-semibold text-warning">qu&apos;une seule fois</span> — transmettez-le à
            l&apos;utilisateur, qui devra le changer à sa première connexion.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface p-2 pl-4">
            <code className="flex-1 select-all font-mono text-base font-bold text-ink">
              {info.tempPassword}
            </code>
            <Button variant="primary" size="sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
