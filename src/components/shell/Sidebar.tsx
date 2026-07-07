'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import { Wordmark } from '@/components/Logo';
import { navFor, ROLE_LABEL } from '@/lib/rbac';
import type { AuthUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export function Sidebar({ user, onNavigate }: { user: AuthUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navFor(user.roles);

  // On n'active QUE l'item le plus spécifique (préfixe le plus long), sinon la page d'accueil
  // (« /commission », « /admin ») resterait active sur toutes ses sous-pages.
  const activeHref = items
    .map((i) => i.href)
    .filter((h) => pathname === h || pathname.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="flex h-full flex-col px-3 py-5">
      <div className="px-2 pb-6">
        <Wordmark />
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = (Icons[item.icon as keyof typeof Icons] ?? Icons.Circle) as React.ComponentType<{
            className?: string;
            strokeWidth?: number;
          }>;
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active ? 'bg-surface font-semibold text-ink' : 'font-medium text-muted hover:bg-surface hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-ink' : 'text-subtle')} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-line bg-surface px-3.5 py-3">
        <p className="text-xs text-subtle">Connecté en tant que</p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{user.roles.map((r) => ROLE_LABEL[r]).join(' · ')}</p>
        <p className="mt-1.5 text-xs text-subtle">Université Protestante au Congo · FSI</p>
      </div>
    </div>
  );
}
