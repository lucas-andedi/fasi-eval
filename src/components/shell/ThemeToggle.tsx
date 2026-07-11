'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@/lib/theme';

/** Bascule clair / sombre — style aligné sur la cloche de notifications. */
export function ThemeToggle() {
  const resolved = useTheme((s) => s.resolved);
  const toggle = useTheme((s) => s.toggle);

  // Évite un flash d'icône incohérent avant l'hydratation du thème.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolved === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-line bg-paper text-muted transition-colors hover:bg-surface hover:text-ink"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={mounted && isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
          transition={{ duration: 0.18 }}
          className="grid place-items-center"
        >
          {mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
