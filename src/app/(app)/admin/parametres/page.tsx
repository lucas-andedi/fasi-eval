'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Database, Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Feedback';
import { api, apiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/utils';

type Settings = {
  id: number;
  maxLoginAttempts: number;
  lockDurationMin: number;
  sessionIdleMin: number;
  auditRetentionYears: number;
  notificationRetentionDays: number;
  updatedAt: string;
};

type FormState = {
  maxLoginAttempts: string;
  lockDurationMin: string;
  sessionIdleMin: string;
  auditRetentionYears: string;
  notificationRetentionDays: string;
};

const FIELDS = [
  'maxLoginAttempts',
  'lockDurationMin',
  'sessionIdleMin',
  'auditRetentionYears',
  'notificationRetentionDays',
] as const;

const BOUNDS: Record<(typeof FIELDS)[number], { min: number; max: number; label: string }> = {
  maxLoginAttempts: { min: 1, max: 10, label: 'Le verrouillage doit être compris entre 1 et 10 tentatives.' },
  lockDurationMin: { min: 1, max: 1440, label: 'La durée de verrouillage doit être comprise entre 1 et 1440 minutes.' },
  sessionIdleMin: { min: 5, max: 240, label: "L'expiration de session doit être comprise entre 5 et 240 minutes." },
  auditRetentionYears: { min: 1, max: 30, label: "La conservation du journal d'audit doit être comprise entre 1 et 30 ans." },
  notificationRetentionDays: { min: 1, max: 365, label: 'La conservation des notifications doit être comprise entre 1 et 365 jours.' },
};

function toForm(s: Settings): FormState {
  return {
    maxLoginAttempts: String(s.maxLoginAttempts),
    lockDurationMin: String(s.lockDurationMin),
    sessionIdleMin: String(s.sessionIdleMin),
    auditRetentionYears: String(s.auditRetentionYears),
    notificationRetentionDays: String(s.notificationRetentionDays),
  };
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<Settings>('/settings')).data,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Paramètres système"
        description="Sécurité des accès, expiration de session et rétention — appliqués sans redéploiement."
      />
      {settingsQ.isLoading || !settingsQ.data ? (
        <LoadingBlock label="Chargement des paramètres…" />
      ) : (
        <SettingsForm
          settings={settingsQ.data}
          onSaved={() => qc.invalidateQueries({ queryKey: ['settings'] })}
        />
      )}
    </div>
  );
}

function CardIcon({ icon: Icon }: { icon: React.ComponentType<any> }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-muted">
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </div>
  );
}

function SettingsForm({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const initial = useMemo(() => toForm(settings), [settings]);
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => setForm(initial), [initial]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const dirty = FIELDS.some((k) => form[k].trim() !== initial[k]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, number> = {};
      for (const k of FIELDS) {
        if (form[k].trim() !== initial[k]) payload[k] = Number(form[k]);
      }
      return api.patch('/settings', payload);
    },
    onSuccess: () => {
      toast.success('Paramètres enregistrés.');
      onSaved();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const k of FIELDS) {
      const raw = form[k].trim();
      const n = Number(raw);
      const b = BOUNDS[k];
      if (raw === '' || !Number.isInteger(n) || n < b.min || n > b.max) {
        toast.error(b.label);
        return;
      }
    }
    save.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Sécurité des accès */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex items-start gap-3">
          <CardIcon icon={ShieldCheck} />
          <div>
            <h3 className="text-lg font-bold text-ink">Sécurité des accès</h3>
            <p className="mt-0.5 text-sm text-muted">
              Verrouillage des comptes et expiration des sessions inactives.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Verrouillage après N tentatives échouées" hint="RG-01 · entre 1 et 10 tentatives">
            <Input
              type="number"
              min={1}
              max={10}
              step={1}
              value={form.maxLoginAttempts}
              onChange={set('maxLoginAttempts')}
            />
          </Field>
          <Field label="Durée de verrouillage (minutes)" hint="RG-01 · entre 1 et 1440 minutes">
            <Input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={form.lockDurationMin}
              onChange={set('lockDurationMin')}
            />
          </Field>
          <Field label="Expiration de session par inactivité (minutes)" hint="RG-02b · entre 5 et 240 minutes">
            <Input
              type="number"
              min={5}
              max={240}
              step={1}
              value={form.sessionIdleMin}
              onChange={set('sessionIdleMin')}
            />
          </Field>
        </div>
      </motion.div>

      {/* Rétention des données */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card p-6"
      >
        <div className="flex items-start gap-3">
          <CardIcon icon={Database} />
          <div>
            <h3 className="text-lg font-bold text-ink">Rétention des données</h3>
            <p className="mt-0.5 text-sm text-muted">
              Durée de conservation du journal d'audit et des notifications.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Conservation du journal d'audit (années)" hint="RG-27 · entre 1 et 30 ans">
            <Input
              type="number"
              min={1}
              max={30}
              step={1}
              value={form.auditRetentionYears}
              onChange={set('auditRetentionYears')}
            />
          </Field>
          <Field label="Conservation des notifications in-app (jours)" hint="Entre 1 et 365 jours">
            <Input
              type="number"
              min={1}
              max={365}
              step={1}
              value={form.notificationRetentionDays}
              onChange={set('notificationRetentionDays')}
            />
          </Field>
        </div>
      </motion.div>

      {/* Barre d'action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-subtle">
          Dernière mise à jour : {fmtDateTime(settings.updatedAt)}
        </p>
        <div className="flex items-center justify-end gap-3">
          {dirty && <Badge tone="warning">Modifications non enregistrées</Badge>}
          <Button type="submit" loading={save.isPending} disabled={!dirty}>
            <Save className="h-4 w-4" /> Enregistrer les paramètres
          </Button>
        </div>
      </div>
    </form>
  );
}
