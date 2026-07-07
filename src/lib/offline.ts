'use client';
import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';

/**
 * Couche hors-ligne (connexion faible sur le site de déploiement).
 * - Lectures : le cache React Query est persisté (voir providers.tsx) → consultables hors-ligne.
 * - Écritures : en cas de coupure, les mutations sont mises en FILE D'ATTENTE (outbox localStorage)
 *   puis rejouées automatiquement au retour du réseau, ou manuellement via « Synchroniser ».
 */

export type OutboxMethod = 'post' | 'patch' | 'put' | 'delete';
export interface OutboxItem {
  id: string;
  method: OutboxMethod;
  url: string; // relatif à /api/v1
  data?: unknown;
  label: string; // libellé lisible pour l'utilisateur
  createdAt: number;
  tries: number;
}

const OUTBOX_KEY = 'fasi.outbox.v1';
let queryClient: QueryClient | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

// ─────────────── Store réactif (état de synchronisation) ───────────────
interface SyncState {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncAt: number | null;
  failed: { label: string; error: string; at: number }[];
  refresh: () => void;
  syncNow: () => Promise<void>;
}

export const useSync = create<SyncState>((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pending: loadOutbox().length,
  syncing: false,
  lastSyncAt: null,
  failed: [],
  refresh: () => set({ pending: loadOutbox().length }),
  syncNow: async () => {
    await flushOutbox();
  },
}));

// ─────────────── Persistance de la file ───────────────
function loadOutbox(): OutboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as OutboxItem[];
  } catch {
    return [];
  }
}
function saveOutbox(items: OutboxItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  useSync.setState({ pending: items.length });
}

export function outboxItems(): OutboxItem[] {
  return loadOutbox();
}

function enqueue(item: Omit<OutboxItem, 'id' | 'createdAt' | 'tries'>) {
  const items = loadOutbox();
  items.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), tries: 0 });
  saveOutbox(items);
}

// ─────────────── Détection réseau ───────────────
function isNetworkError(err: unknown): boolean {
  const e = err as { response?: unknown; code?: string; message?: string };
  if (e?.response) return false; // le serveur a répondu (4xx/5xx) → erreur métier, pas réseau
  return (
    e?.code === 'ERR_NETWORK' ||
    e?.code === 'ECONNABORTED' ||
    /network|timeout|failed/i.test(e?.message ?? '')
  );
}

/** Effectue une mutation ; si le réseau est coupé, la met en file et renvoie {queued:true}. */
export async function apiMutate(
  method: OutboxMethod,
  url: string,
  data: unknown,
  opts: { label: string },
): Promise<{ ok: boolean; queued?: boolean; data?: unknown }> {
  const online = useSync.getState().online;
  if (online) {
    try {
      const res = await api.request({ method, url, data });
      return { ok: true, data: res.data };
    } catch (err) {
      if (isNetworkError(err)) {
        enqueue({ method, url, data, label: opts.label });
        useSync.setState({ online: false });
        return { ok: true, queued: true };
      }
      throw err;
    }
  }
  enqueue({ method, url, data, label: opts.label });
  return { ok: true, queued: true };
}

/** Rejoue la file d'attente en séquence. Auto au retour réseau, ou via le bouton Synchroniser. */
export async function flushOutbox(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (useSync.getState().syncing) return;
  let items = loadOutbox();
  if (items.length === 0) return;
  useSync.setState({ syncing: true });
  const failures: SyncState['failed'] = [];
  try {
    for (const item of [...items]) {
      try {
        await api.request({ method: item.method, url: item.url, data: item.data });
        items = loadOutbox().filter((i) => i.id !== item.id);
        saveOutbox(items);
      } catch (err) {
        if (isNetworkError(err)) {
          // toujours hors-ligne : on s'arrête, on réessaiera plus tard
          useSync.setState({ online: false });
          break;
        }
        // erreur métier (validation/conflit) → on retire de la file et on signale
        const e = err as { response?: { data?: { error?: string } } };
        failures.push({ label: item.label, error: e?.response?.data?.error ?? 'Erreur', at: Date.now() });
        items = loadOutbox().filter((i) => i.id !== item.id);
        saveOutbox(items);
      }
    }
    if (queryClient) queryClient.invalidateQueries();
    useSync.setState({ lastSyncAt: Date.now(), failed: failures });
  } finally {
    useSync.setState({ syncing: false });
  }
}

// ─────────────── Ping santé (navigator.onLine n'est pas fiable) ───────────────
async function ping(): Promise<boolean> {
  try {
    const origin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`${origin}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

/** Initialise la couche hors-ligne (appelé une fois côté client). */
export function initOffline(qc: QueryClient) {
  queryClient = qc;
  if (typeof window === 'undefined') return;
  useSync.setState({ pending: loadOutbox().length, online: navigator.onLine });

  const goOnline = async () => {
    const ok = await ping();
    useSync.setState({ online: ok });
    if (ok) flushOutbox();
  };
  window.addEventListener('online', goOnline);
  window.addEventListener('offline', () => useSync.setState({ online: false }));

  // Ping périodique : bascule online/offline + auto-sync
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = setInterval(async () => {
    const ok = await ping();
    const was = useSync.getState().online;
    useSync.setState({ online: ok });
    if (ok && (!was || loadOutbox().length > 0)) flushOutbox();
  }, 15000);

  // Premier essai de synchro au démarrage
  goOnline();
}
