'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { api, apiError, getAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { homeFor } from '@/lib/rbac';

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const first = params.get('first') === '1';
  const { user, refresh } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) router.replace('/login');
    else if (!user) refresh();
  }, [user, refresh, router]);

  const rules = [
    { ok: next.length >= 8, label: 'Au moins 8 caractères' },
    { ok: /[A-Z]/.test(next), label: 'Une majuscule' },
    { ok: /[a-z]/.test(next), label: 'Une minuscule' },
    { ok: /\d/.test(next), label: 'Un chiffre' },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return toast.error('Les mots de passe ne correspondent pas.');
    if (!rules.every((r) => r.ok)) return toast.error('Le mot de passe ne respecte pas la politique.');
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      toast.success('Mot de passe mis à jour.');
      await refresh();
      const u = useAuth.getState().user;
      router.replace(u ? homeFor(u.roles) : '/login');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} />
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
            {first ? 'Sécurisez votre compte' : 'Changer le mot de passe'}
          </h1>
          <p className="mt-1 text-sm text-ink/55">
            {first ? 'Première connexion : définissez un nouveau mot de passe.' : 'Choisissez un nouveau mot de passe.'}
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <Field label="Mot de passe actuel">
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoFocus />
          </Field>
          <Field label="Nouveau mot de passe">
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-violet-50/70 p-3">
            {rules.map((r) => (
              <div key={r.label} className={`flex items-center gap-1.5 text-xs font-medium ${r.ok ? 'text-success' : 'text-ink/40'}`}>
                <ShieldCheck className="h-3.5 w-3.5" /> {r.label}
              </div>
            ))}
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            <KeyRound className="h-4 w-4" /> Enregistrer
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
