'use client';
import { RefreshCw, WifiOff, Check } from 'lucide-react';
import { useSync } from '@/lib/offline';
import { cn } from '@/lib/utils';

/** Indicateur de connectivité + synchronisation (barre supérieure). */
export function SyncIndicator() {
  const { online, pending, syncing, syncNow } = useSync();

  // Hors ligne
  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted">
        <WifiOff className="h-3.5 w-3.5 text-warning" />
        Hors ligne
        {pending > 0 && (
          <span className="ml-0.5 rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold text-warning">
            {pending} en attente
          </span>
        )}
      </span>
    );
  }

  // En ligne avec des éléments à synchroniser → bouton Synchroniser
  if (pending > 0 || syncing) {
    return (
      <button
        onClick={() => syncNow()}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent-200 bg-accent-weak px-2.5 py-1.5 text-xs font-semibold text-accent-700 transition hover:brightness-95 disabled:opacity-70"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
        {syncing ? 'Synchronisation…' : `Synchroniser (${pending})`}
      </button>
    );
  }

  // En ligne, tout est synchronisé — pastille discrète
  return (
    <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-muted sm:inline-flex">
      <Check className="h-3.5 w-3.5 text-accent" />
      À jour
    </span>
  );
}
