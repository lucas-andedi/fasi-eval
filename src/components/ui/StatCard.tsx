'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Palette d'appoint douce : un peu de couleur, tamisée, pour rythmer les tableaux de bord.
const PALETTE = [
  'bg-accent-weak text-accent-700',
  'bg-amber-soft text-amber-ink',
  'bg-sky-soft text-sky-ink',
  'bg-rose-soft text-rose-ink',
  'bg-grape-soft text-grape-ink',
];
const SEMANTIC: Record<string, string> = {
  teal: 'bg-accent-weak text-accent-700',
  gold: 'bg-amber-soft text-amber-ink',
  danger: 'bg-rose-soft text-danger',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<any>;
  tone?: 'violet' | 'gold' | 'teal' | 'danger';
  index?: number;
}) {
  const iconTone = (tone && SEMANTIC[tone]) || PALETTE[index % PALETTE.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="card card-hover p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 font-display text-[28px] font-bold leading-none text-ink tabular">{value}</p>
          {hint && <p className="mt-2 text-xs text-subtle">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', iconTone)}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
