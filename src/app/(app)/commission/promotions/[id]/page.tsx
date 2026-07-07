'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import {
  ArrowLeft,
  Clock,
  History,
  Info,
  ListChecks,
  Lock,
  Save,
  SlidersHorizontal,
  Tag,
  TimerReset,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { api, apiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/utils';
import type { Criterion, Promotion } from '@/lib/types';

type PromotionDetail = Promotion & {
  activeGrid: { activeCriteria: number[]; appliedAt?: string };
  criteria: Criterion[];
};

type GridHistory = {
  id: number;
  appliedAt: string;
  activeCriteria: number[];
};

export default function PromotionConfigPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();

  const detailQ = useQuery({
    queryKey: ['promotion', id],
    queryFn: async () => (await api.get<PromotionDetail>(`/promotions/${id}`)).data,
  });
  const gridsQ = useQuery({
    queryKey: ['promotion', id, 'grids'],
    queryFn: async () => (await api.get<GridHistory[]>(`/promotions/${id}/grids`)).data,
  });

  const promotion = detailQ.data;

  if (detailQ.isLoading) {
    return (
      <div>
        <BackLink />
        <LoadingBlock />
      </div>
    );
  }
  if (detailQ.isError || !promotion) {
    return (
      <div>
        <BackLink />
        <EmptyState
          icon={SlidersHorizontal}
          title="Promotion introuvable"
          description="Cette promotion n’existe pas ou n’est plus accessible."
        />
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <PageHeader
        eyebrow={`Promotion ${promotion.code}`}
        title="Configuration de la promotion"
        description={promotion.label}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <IdentityCard
            promotion={promotion}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['promotion', id] });
              qc.invalidateQueries({ queryKey: ['promotions'] });
            }}
          />
          <GridCard promotion={promotion} onSaved={() => { qc.invalidateQueries({ queryKey: ['promotion', id] }); qc.invalidateQueries({ queryKey: ['promotion', id, 'grids'] }); }} />
          <ConfigCard promotion={promotion} onSaved={() => qc.invalidateQueries({ queryKey: ['promotion', id] })} />
        </div>

        <HistoryCard
          grids={gridsQ.data ?? []}
          loading={gridsQ.isLoading}
        />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/commission/promotions"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition hover:gap-2.5 hover:underline"
    >
      <ArrowLeft className="h-4 w-4" /> Toutes les promotions
    </Link>
  );
}

function CardIcon({ icon: Icon }: { icon: React.ComponentType<any> }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-muted">
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Identité                                                            */
/* ------------------------------------------------------------------ */
function IdentityCard({ promotion, onSaved }: { promotion: PromotionDetail; onSaved: () => void }) {
  const [form, setForm] = useState({ code: promotion.code, label: promotion.label });

  useEffect(() => {
    setForm({ code: promotion.code, label: promotion.label });
  }, [promotion.code, promotion.label]);

  const dirty =
    form.code.trim() !== promotion.code || form.label.trim() !== promotion.label;

  const save = useMutation({
    mutationFn: async () =>
      api.patch(`/promotions/${promotion.id}/config`, {
        code: form.code.trim(),
        label: form.label.trim(),
      }),
    onSuccess: () => {
      toast.success('Identité mise à jour.');
      onSaved();
    },
    onError: (err) => {
      const e = err as AxiosError<{ error?: string; code?: string }>;
      if (e.response?.status === 409) {
        toast.error(apiError(err) || 'Ce code est déjà utilisé par une autre promotion.');
      } else {
        toast.error(apiError(err));
      }
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Le code est requis.');
    if (!form.label.trim()) return toast.error('Le libellé est requis.');
    save.mutate();
  };

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start gap-3">
        <CardIcon icon={Tag} />
        <div>
          <h3 className="text-lg font-bold text-ink">Identité</h3>
          <p className="mt-0.5 text-sm text-muted">
            Code et libellé de la promotion. Le code doit rester unique.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Code" hint="Identifiant court, unique">
          <Input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
        </Field>
        <Field label="Libellé" hint="Intitulé complet" className="sm:col-span-2">
          <Input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
        </Field>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty && <Badge tone="warning">Modifications non enregistrées</Badge>}
        <Button type="submit" variant="outline" loading={save.isPending} disabled={!dirty}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </motion.form>
  );
}

/* ------------------------------------------------------------------ */
/* Grille d'évaluation                                                 */
/* ------------------------------------------------------------------ */
function GridCard({ promotion, onSaved }: { promotion: PromotionDetail; onSaved: () => void }) {
  const initial = useMemo(
    () => new Set<number>(promotion.activeGrid?.activeCriteria ?? []),
    [promotion.activeGrid?.activeCriteria],
  );
  const [active, setActive] = useState<Set<number>>(initial);

  useEffect(() => setActive(new Set(initial)), [initial]);

  const criteria = [...(promotion.criteria ?? [])].sort((a, b) => a.number - b.number);

  const dirty =
    active.size !== initial.size || [...active].some((n) => !initial.has(n));

  const toggle = (n: number, on: boolean) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (on) next.add(n);
      else next.delete(n);
      return next;
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      const activeCriteria = [...active].sort((a, b) => a - b);
      return api.put(`/promotions/${promotion.id}/grid`, { activeCriteria });
    },
    onSuccess: () => {
      toast.success('Grille d’évaluation enregistrée.');
      onSaved();
    },
    onError: (err) => {
      const e = err as AxiosError<{ error?: string; code?: string }>;
      if (e.response?.status === 409) {
        toast.error(
          apiError(err) ||
            'Grille gelée : une session est ouverte pour cette promotion (RG-06).',
        );
      } else {
        toast.error(apiError(err));
      }
    },
  });

  const onSubmit = () => {
    if (active.size < 1) {
      toast.error('Au moins un critère doit rester actif (RG-05).');
      return;
    }
    save.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CardIcon icon={ListChecks} />
          <div>
            <h3 className="text-lg font-bold text-ink">Grille d’évaluation</h3>
            <p className="mt-0.5 text-sm text-muted">
              Activez les critères pris en compte dans la cotation de cette promotion.
            </p>
          </div>
        </div>
        <Badge tone="neutral">{active.size} / {criteria.length} actif{active.size > 1 ? 's' : ''}</Badge>
      </div>

      <div className="mt-5 space-y-1.5">
        {criteria.map((c) => {
          const on = active.has(c.number);
          return (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                on ? 'border-line-strong bg-surface' : 'border-transparent hover:bg-surface'
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                  on ? 'bg-accent-weak text-accent-700' : 'bg-surface text-subtle'
                }`}
              >
                {c.number}
              </span>
              <span className={`flex-1 text-sm font-medium ${on ? 'text-ink' : 'text-muted'}`}>
                {c.label}
              </span>
              <Toggle checked={on} onChange={(v) => toggle(c.number, v)} />
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
        <p>
          <span className="font-semibold text-ink">RG-05</span> — au moins un critère doit rester
          actif. <span className="font-semibold text-ink">RG-06</span> — la grille est gelée dès
          qu’une session de cette promotion est ouverte ; toute modification sera refusée.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {dirty && <Badge tone="warning">Modifications non enregistrées</Badge>}
        <Button onClick={onSubmit} loading={save.isPending} disabled={!dirty || active.size < 1}>
          <Save className="h-4 w-4" /> Enregistrer la grille
        </Button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Paramètres                                                          */
/* ------------------------------------------------------------------ */
function ConfigCard({ promotion, onSaved }: { promotion: PromotionDetail; onSaved: () => void }) {
  const [form, setForm] = useState({
    defenseDurationMin: String(Math.round(promotion.defenseDurationSec / 60)),
    alert1Min: String(Math.round(promotion.alert1Sec / 60)),
    alert2Min: String(Math.round(promotion.alert2Sec / 60)),
    modificationWindowMin: String(promotion.modificationWindowMin),
    stdThreshold1: String(promotion.stdThreshold1),
    stdThreshold2: String(promotion.stdThreshold2),
    absThreshold2: String(promotion.absThreshold2),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        defenseDurationSec: Math.round(Number(form.defenseDurationMin) * 60),
        alert1Sec: Math.round(Number(form.alert1Min) * 60),
        alert2Sec: Math.round(Number(form.alert2Min) * 60),
        modificationWindowMin: Number(form.modificationWindowMin),
        stdThreshold1: Number(form.stdThreshold1),
        stdThreshold2: Number(form.stdThreshold2),
        absThreshold2: Number(form.absThreshold2),
      };
      return api.patch(`/promotions/${promotion.id}/config`, payload);
    },
    onSuccess: () => {
      toast.success('Paramètres mis à jour.');
      onSaved();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(form.defenseDurationMin) <= 0) return toast.error('La durée de défense doit être positive.');
    save.mutate();
  };

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card p-6"
    >
      <div className="flex items-start gap-3">
        <CardIcon icon={SlidersHorizontal} />
        <div>
          <h3 className="text-lg font-bold text-ink">Paramètres</h3>
          <p className="mt-0.5 text-sm text-muted">
            Durée de défense, alertes du chronomètre, fenêtre de modification et seuils d’écart.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-subtle">
            <Clock className="h-3.5 w-3.5" /> Chronomètre
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Durée de défense" hint="En minutes">
              <Input type="number" min={1} step={1} value={form.defenseDurationMin} onChange={set('defenseDurationMin')} />
            </Field>
            <Field label="1ʳᵉ alerte" hint="Minutes restantes">
              <Input type="number" min={0} step={1} value={form.alert1Min} onChange={set('alert1Min')} />
            </Field>
            <Field label="2ᵉ alerte" hint="Minutes restantes">
              <Input type="number" min={0} step={1} value={form.alert2Min} onChange={set('alert2Min')} />
            </Field>
          </div>
        </section>

        <section>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-subtle">
            <TimerReset className="h-3.5 w-3.5" /> Fenêtre de modification (RG-09)
          </p>
          <Field label="Délai de modification après validation" hint="Entre 10 et 15 minutes">
            <Select value={form.modificationWindowMin} onChange={set('modificationWindowMin')}>
              {[10, 11, 12, 13, 14, 15].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </Select>
          </Field>
        </section>

        <section>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-subtle">
            <ListChecks className="h-3.5 w-3.5" /> Seuils de détection d’écart (chap. 10.4.3)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Seuil écart-type 1" hint="Alerte niveau 1">
              <Input type="number" min={0} step="0.01" value={form.stdThreshold1} onChange={set('stdThreshold1')} />
            </Field>
            <Field label="Seuil écart-type 2" hint="Alerte niveau 2">
              <Input type="number" min={0} step="0.01" value={form.stdThreshold2} onChange={set('stdThreshold2')} />
            </Field>
            <Field label="Écart absolu 2" hint="Points /20 (niveau 2)">
              <Input type="number" min={0} step="0.01" value={form.absThreshold2} onChange={set('absThreshold2')} />
            </Field>
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" variant="outline" loading={save.isPending}>
          <Save className="h-4 w-4" /> Enregistrer les paramètres
        </Button>
      </div>
    </motion.form>
  );
}

/* ------------------------------------------------------------------ */
/* Historique des grilles                                              */
/* ------------------------------------------------------------------ */
function HistoryCard({ grids, loading }: { grids: GridHistory[]; loading: boolean }) {
  const sorted = [...grids].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card h-fit p-6"
    >
      <div className="flex items-start gap-3">
        <CardIcon icon={History} />
        <div>
          <h3 className="text-lg font-bold text-ink">Historique des grilles</h3>
          <p className="mt-0.5 text-sm text-muted">Chaque version est archivée (RG-06b).</p>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <LoadingBlock label="Chargement de l’historique…" />
        ) : sorted.length === 0 ? (
          <EmptyState icon={Lock} title="Aucune version archivée" description="L’historique s’enrichira à chaque enregistrement de grille." />
        ) : (
          <ol className="divide-y divide-line">
            {sorted.map((g, i) => (
              <li key={g.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{fmtDateTime(g.appliedAt)}</p>
                  {i === 0 && <Badge tone="teal">Actuelle</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...g.activeCriteria]
                    .sort((a, b) => a - b)
                    .map((n) => (
                      <span
                        key={n}
                        className="grid h-6 w-6 place-items-center rounded-md bg-surface text-xs font-bold text-muted"
                      >
                        {n}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </motion.div>
  );
}
