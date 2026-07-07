'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Gauge, ScrollText, Radar, Timer, FileSpreadsheet } from 'lucide-react';
import { Wordmark } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { getAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { homeFor } from '@/lib/rbac';

const FEATURES = [
  { icon: ShieldCheck, title: 'Confidentialité stricte', text: 'Les notes restent isolées entre membres du jury ; la consolidation est anonymisée.' },
  { icon: Gauge, title: 'Calcul automatique', text: 'Moyennes par critère et note finale sur 20, sans consolidation manuelle.' },
  { icon: Radar, title: 'Détection des écarts', text: 'Écart-type et écart absolu, avec deux niveaux de sévérité configurables.' },
  { icon: Timer, title: 'Chronomètre résilient', text: 'Fonctionne localement dans le navigateur, même en cas de coupure réseau.' },
  { icon: ScrollText, title: 'Traçabilité complète', text: "Journal d'audit horodaté et non modifiable, de la saisie à la publication." },
  { icon: FileSpreadsheet, title: 'Export CISNET', text: 'Fichiers .xlsx structurés, directement exploitables par la Faculté.' },
];

export default function Landing() {
  const router = useRouter();
  const refresh = useAuth((s) => s.refresh);

  useEffect(() => {
    if (getAccessToken()) {
      refresh().then(() => {
        const u = useAuth.getState().user;
        if (u) router.replace(homeFor(u.roles));
      });
    }
  }, [refresh, router]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-5xl px-6">
        <header className="flex items-center justify-between py-5">
          <Wordmark />
          <Link href="/login">
            <Button variant="outline" size="sm">Se connecter</Button>
          </Link>
        </header>

        <section className="border-t border-line pt-16 sm:pt-24">
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-muted"
          >
            Faculté des Sciences Informatiques · Université Protestante au Congo
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-ink sm:text-[56px]"
          >
            La cotation des défenses, centralisée et fiable.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted"
          >
            Saisie confidentielle, calculs automatiques, détection des écarts, délibération tracée
            et export CISNET — un seul outil pour toute la chaîne d'évaluation.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/login">
              <Button size="lg">Accéder à mon espace <ArrowRight className="h-4 w-4" strokeWidth={1.75} /></Button>
            </Link>
            <a href="#fonctionnalites">
              <Button size="lg" variant="ghost">Voir les fonctionnalités</Button>
            </a>
          </motion.div>
        </section>

        <section id="fonctionnalites" className="grid gap-x-10 gap-y-9 py-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <f.icon className="h-5 w-5 text-ink" strokeWidth={1.75} />
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </motion.div>
          ))}
        </section>

        <footer className="border-t border-line py-7 text-sm text-subtle">
          © {new Date().getFullYear()} FASI·Eval — Référence CDC-FASI-EVAL-2025. Document interne UPC.
        </footer>
      </div>
    </div>
  );
}
