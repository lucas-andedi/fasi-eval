'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { initOffline } from '@/lib/offline';

// v2 : le modèle de données a changé (rôles multiples, postnom, endDate…). Bumper la clé
// écarte tous les caches persistés d'avant la refonte (évite les plantages de forme).
const RQ_CACHE_KEY = 'fasi.rqcache.v2';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 15_000,
            gcTime: 24 * 60 * 60 * 1000, // conserve en mémoire pour l'usage hors-ligne
          },
        },
      }),
  );

  // Persistance du cache (lectures consultables hors-ligne) + init de la couche offline.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RQ_CACHE_KEY);
      if (raw) {
        const entries = JSON.parse(raw) as [unknown, unknown][];
        for (const [key, data] of entries) client.setQueryData(key as never, data as never);
      }
    } catch {
      /* cache illisible : on ignore */
    }

    initOffline(client);

    let t: ReturnType<typeof setTimeout>;
    const unsub = client.getQueryCache().subscribe(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          const entries = client
            .getQueryCache()
            .getAll()
            .filter((q) => q.state.status === 'success' && q.state.data !== undefined)
            .slice(0, 120)
            .map((q) => [q.queryKey, q.state.data]);
          localStorage.setItem(RQ_CACHE_KEY, JSON.stringify(entries));
        } catch {
          /* quota dépassé : on ignore */
        }
      }, 800);
    });
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            border: '1px solid rgba(13,146,104,0.16)',
            fontFamily: 'var(--font-sans)',
          },
        }}
        richColors
      />
    </QueryClientProvider>
  );
}
