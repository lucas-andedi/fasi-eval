'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, KeyRound, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from './NotificationBell';
import { SyncIndicator } from './SyncIndicator';
import { useAuth } from '@/lib/auth-store';
import { ROLE_LABEL } from '@/lib/rbac';
import type { AuthUser } from '@/lib/types';

export function Topbar({ user, onMenu }: { user: AuthUser; onMenu: () => void }) {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-paper px-4 sm:px-6">
      <button onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-xl border border-violet-100 bg-white/70 text-ink/60 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden text-sm font-medium text-ink/40 sm:block">
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <SyncIndicator />
        <NotificationBell />
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-paper py-1.5 pl-1.5 pr-3 transition-colors hover:bg-surface"
          >
            <Avatar first={user.firstName} last={user.lastName} className="h-8 w-8 text-xs" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-bold leading-tight text-ink">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-[11px] text-ink/45">{user.roles.map((r) => ROLE_LABEL[r]).join(' · ')}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-ink/40" />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-card"
              >
                <div className="border-b border-violet-100 px-4 py-3">
                  <p className="text-sm font-bold text-ink">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-ink/45">{user.email}</p>
                </div>
                <button
                  onClick={() => { setOpen(false); router.push('/compte/mot-de-passe'); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-violet-50"
                >
                  <KeyRound className="h-4 w-4" /> Changer le mot de passe
                </button>
                <button
                  onClick={async () => { await logout(); router.push('/login'); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/8"
                >
                  <LogOut className="h-4 w-4" /> Se déconnecter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
