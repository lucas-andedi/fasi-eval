'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { fmtDateTime } from '@/lib/utils';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/notifications')).data,
    refetchInterval: 10_000, // polling in-app (chap 7.2.1)
  });
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  const markOne = async (id: number) => {
    await api.post(`/notifications/${id}/read`);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-lg border border-line bg-paper text-muted transition-colors hover:bg-surface hover:text-ink"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-paper">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-line bg-paper shadow-card"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-bold text-ink">Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover">
                  <Check className="h-3.5 w-3.5" /> Tout marquer lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink/45">Aucune notification.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markOne(n.id)}
                    className={`flex w-full gap-3 border-b border-violet-50 px-4 py-3 text-left transition hover:bg-violet-50/60 ${
                      n.read ? 'opacity-70' : ''
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{n.title}</span>
                      <span className="block text-xs text-ink/55">{n.content}</span>
                      <span className="mt-0.5 block text-[11px] text-ink/35">{fmtDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
