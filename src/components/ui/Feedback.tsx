'use client';
import { cn } from '@/lib/utils';
import { Loader2, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-accent', className)} />;
}

export function LoadingBlock({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink/50">
      <Spinner />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<any>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center"
    >
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-line bg-paper text-muted">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
