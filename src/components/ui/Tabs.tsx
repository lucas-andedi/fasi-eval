'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: string; label: React.ReactNode; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex gap-1 rounded-xl border border-line bg-surface p-1', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-active"
                className="absolute inset-0 -z-10 rounded-lg border border-line bg-paper shadow-soft"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {t.label}
            {t.count !== undefined && (
              <span className={cn('ml-1.5 text-xs', active ? 'text-muted' : 'text-subtle')}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
