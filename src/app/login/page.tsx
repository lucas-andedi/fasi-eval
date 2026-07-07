'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Wordmark, Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-store';
import { apiError } from '@/lib/api';
import { homeFor } from '@/lib/rbac';

const DEMO = [
  ['Commission', 'commission'],
  ['Président', 'president'],
  ['Jury', 'jury1'],
  ['Mixte', 'mixte'],
  ['Admin', 'admin'],
] as const;

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuth((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      toast.success(`Bienvenue, ${user.firstName}.`);
      if (user.mustChangePassword) router.replace('/compte/mot-de-passe?first=1');
      else router.replace(homeFor(user.roles));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau éditorial sobre */}
      <div className="relative hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-display text-[17px] font-bold tracking-tight text-white">
            FASI<span className="text-accent">·</span>Eval
          </span>
        </div>
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-md font-display text-[34px] font-bold leading-tight text-white"
          >
            Chaque note compte. Chaque décision est tracée.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="mt-4 max-w-md leading-relaxed text-white/60"
          >
            Le système d'évaluation des projets académiques de la Faculté des Sciences
            Informatiques — confidentiel, rigoureux, conçu pour vos défenses.
          </motion.p>
        </div>
        <div className="flex gap-10 text-white/70">
          <div><p className="font-display text-2xl font-bold text-white">20</p><p className="mt-1 text-xs text-white/50">cas d'usage</p></div>
          <div><p className="font-display text-2xl font-bold text-white">30</p><p className="mt-1 text-xs text-white/50">règles de gestion</p></div>
          <div><p className="font-display text-2xl font-bold text-white">5</p><p className="mt-1 text-xs text-white/50">rôles sécurisés</p></div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center bg-paper px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Wordmark /></div>

          <h1 className="font-display text-2xl font-bold text-ink">Connexion</h1>
          <p className="mt-1.5 text-sm text-muted">Saisissez vos identifiants pour accéder à votre espace.</p>

          {params.get('expired') && (
            <div className="mt-4 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-muted">
              Votre session a expiré. Merci de vous reconnecter.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Identifiant">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="p. ex. commission" autoFocus required />
            </Field>
            <Field label="Mot de passe">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </Field>
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Se connecter <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </form>

          <div className="mt-8 border-t border-line pt-5">
            <p className="text-xs text-subtle">Comptes de démonstration — mot de passe <span className="font-mono text-muted">Passw0rd!</span></p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {DEMO.map(([label, u]) => (
                <button
                  key={u}
                  onClick={() => { setUsername(u); setPassword('Passw0rd!'); }}
                  className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-subtle">
            <Link href="/" className="font-medium text-muted hover:text-ink">← Retour à l'accueil</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
