'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight,
  Clock,
  ListChecks,
  Pencil,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input } from '@/components/ui/Input';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { api, apiError } from '@/lib/api';
import type { Criterion, Promotion } from '@/lib/types';

type PromotionRow = Promotion & {
  activeGrid?: { activeCriteria: number[] };
  criteria?: Criterion[];
  _count?: { activeCriteria?: number };
};

function activeCount(p: PromotionRow): number | null {
  if (p.activeGrid?.activeCriteria) return p.activeGrid.activeCriteria.length;
  if (p._count?.activeCriteria !== undefined) return p._count.activeCriteria;
  return null;
}

export default function PromotionsPage() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [removing, setRemoving] = useState<PromotionRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => (await api.get<PromotionRow[]>('/promotions')).data,
  });
  const promotions = data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Promotions & critères"
        description="Choisissez une promotion pour ajuster sa grille d’évaluation et ses paramètres de cotation."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nouvelle promotion
          </Button>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : promotions.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Aucune promotion"
          description="Créez une première promotion pour commencer à configurer sa grille d’évaluation."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nouvelle promotion
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {promotions.map((p, i) => {
            const minutes = Math.round(p.defenseDurationSec / 60);
            const active = activeCount(p);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="card flex h-full flex-col p-6 transition hover:border-line-strong">
                  <div className="flex items-start justify-between">
                    <span className="font-display text-4xl font-bold text-ink">{p.code}</span>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-muted">
                      <Settings2 className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                  </div>

                  <p className="mt-2 text-sm font-medium text-muted">{p.label}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge tone="neutral">
                      <Clock className="h-3.5 w-3.5" /> {minutes} min de défense
                    </Badge>
                    {active !== null && (
                      <Badge tone="neutral">
                        <ListChecks className="h-3.5 w-3.5" /> {active} critère{active > 1 ? 's' : ''} actif{active > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-6 flex-1" />

                  <div className="mt-2 flex items-center gap-2">
                    <Link href={`/commission/promotions/${p.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        Configurer
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(p)}
                      aria-label={`Modifier ${p.code}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemoving(p)}
                      aria-label={`Supprimer ${p.code}`}
                      className="text-ink/45 hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <CreatePromotionModal open={creating} onClose={() => setCreating(false)} />
      <EditPromotionModal promotion={editing} onClose={() => setEditing(null)} />
      <DeletePromotionDialog promotion={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Création                                                            */
/* ------------------------------------------------------------------ */
function CreatePromotionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({ code: '', label: '', defenseDurationMin: '30' });

  const reset = () => setForm({ code: '', label: '', defenseDurationMin: '30' });

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        label: form.label.trim(),
      };
      const min = Number(form.defenseDurationMin);
      if (form.defenseDurationMin.trim() !== '' && min > 0) {
        payload.defenseDurationSec = Math.round(min * 60);
      }
      return (await api.post<Promotion>('/promotions', payload)).data;
    },
    onSuccess: (created) => {
      toast.success('Promotion créée.');
      qc.invalidateQueries({ queryKey: ['promotions'] });
      reset();
      onClose();
      if (created?.id) router.push(`/commission/promotions/${created.id}`);
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error(apiError(err) || 'Ce code est déjà utilisé par une autre promotion.');
      } else {
        toast.error(apiError(err));
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Le code est requis.');
    if (!form.label.trim()) return toast.error('Le libellé est requis.');
    const min = Number(form.defenseDurationMin);
    if (form.defenseDurationMin.trim() !== '' && (!Number.isFinite(min) || min <= 0)) {
      return toast.error('La durée de défense doit être positive.');
    }
    create.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nouvelle promotion"
      description="Définissez le code, le libellé et la durée de défense par défaut."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={create.isPending}
          >
            Annuler
          </Button>
          <Button onClick={submit} loading={create.isPending}>
            Créer la promotion
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required hint="Identifiant court, unique">
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="p.ex. L3"
              autoFocus
            />
          </Field>
          <Field label="Durée de défense" hint="En minutes">
            <Input
              type="number"
              min={1}
              step={1}
              value={form.defenseDurationMin}
              onChange={(e) => setForm((f) => ({ ...f, defenseDurationMin: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Libellé" required hint="Intitulé complet de la promotion">
          <Input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="p.ex. Licence 3 — Informatique"
          />
        </Field>
        {/* Soumission au clavier */}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Édition                                                             */
/* ------------------------------------------------------------------ */
function EditPromotionModal({
  promotion,
  onClose,
}: {
  promotion: PromotionRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const open = !!promotion;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifier la promotion"
      description="Mettez à jour le code, le libellé et la durée de défense."
    >
      {promotion && (
        <EditPromotionForm
          promotion={promotion}
          onClose={onClose}
          onSaved={() => qc.invalidateQueries({ queryKey: ['promotions'] })}
        />
      )}
    </Modal>
  );
}

function EditPromotionForm({
  promotion,
  onClose,
  onSaved,
}: {
  promotion: PromotionRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    code: promotion.code,
    label: promotion.label,
    defenseDurationMin: String(Math.round(promotion.defenseDurationSec / 60)),
  });

  const save = useMutation({
    mutationFn: async () => {
      const min = Number(form.defenseDurationMin);
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        label: form.label.trim(),
      };
      if (form.defenseDurationMin.trim() !== '' && min > 0) {
        payload.defenseDurationSec = Math.round(min * 60);
      }
      return api.patch(`/promotions/${promotion.id}/config`, payload);
    },
    onSuccess: () => {
      toast.success('Promotion mise à jour.');
      onSaved();
      onClose();
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error(apiError(err) || 'Ce code est déjà utilisé par une autre promotion.');
      } else {
        toast.error(apiError(err));
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Le code est requis.');
    if (!form.label.trim()) return toast.error('Le libellé est requis.');
    const min = Number(form.defenseDurationMin);
    if (form.defenseDurationMin.trim() !== '' && (!Number.isFinite(min) || min <= 0)) {
      return toast.error('La durée de défense doit être positive.');
    }
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" required hint="Identifiant court, unique">
          <Input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            autoFocus
          />
        </Field>
        <Field label="Durée de défense" hint="En minutes">
          <Input
            type="number"
            min={1}
            step={1}
            value={form.defenseDurationMin}
            onChange={(e) => setForm((f) => ({ ...f, defenseDurationMin: e.target.value }))}
          />
        </Field>
      </div>
      <Field label="Libellé" required hint="Intitulé complet de la promotion">
        <Input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        />
      </Field>

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>
          Annuler
        </Button>
        <Button type="submit" loading={save.isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Suppression                                                         */
/* ------------------------------------------------------------------ */
function DeletePromotionDialog({
  promotion,
  onClose,
}: {
  promotion: PromotionRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!promotion) return;
    setBusy(true);
    try {
      await api.delete(`/promotions/${promotion.id}`);
      toast.success('Promotion supprimée.');
      qc.invalidateQueries({ queryKey: ['promotions'] });
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={!!promotion}
      onClose={onClose}
      onConfirm={remove}
      loading={busy}
      tone="danger"
      confirmLabel="Supprimer"
      title="Supprimer cette promotion ?"
      description={
        promotion
          ? `La promotion « ${promotion.code} — ${promotion.label} » sera définitivement supprimée. Cette action est refusée si des sessions ou des étudiants y sont rattachés.`
          : ''
      }
    />
  );
}
