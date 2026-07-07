'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  ScrollText,
  ArrowRight,
  ShieldCheck,
  Clock3,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { UserRow, Role } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/rbac';
import { fmtDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';

const ROLE_ORDER: Role[] = ['ADMIN', 'COMMISSION', 'JURY'];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<UserRow[]>('/users')).data,
  });

  const users = data ?? [];
  const total = users.length;
  const active = users.filter((u) => u.active).length;

  const byRole = ROLE_ORDER.map((role) => ({
    role,
    count: users.filter((u) => (u.roles ?? []).includes(role)).length,
  }));

  const recent = [...users]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Tableau de bord"
        description="Pilotez les comptes utilisateurs et surveillez l'activité du système FASI·Eval. Chaque action est tracée."
        action={
          <Badge tone="neutral">
            <ShieldCheck className="h-3.5 w-3.5 text-muted" /> Rôle ADMIN
          </Badge>
        }
      />

      {isLoading ? (
        <LoadingBlock label="Chargement des comptes…" />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total comptes" value={total} icon={Users} tone="violet" index={0} />
            <StatCard
              label="Comptes actifs"
              value={active}
              hint={total ? `${Math.round((active / total) * 100)}% du total` : undefined}
              icon={UserCheck}
              tone="teal"
              index={1}
            />
            <StatCard
              label="Comptes suspendus"
              value={total - active}
              icon={Clock3}
              tone="violet"
              index={2}
            />
            <StatCard
              label="Administrateurs"
              value={byRole.find((r) => r.role === 'ADMIN')?.count ?? 0}
              icon={ShieldCheck}
              tone="violet"
              index={3}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Breakdown by role */}
            <Card className="lg:col-span-1">
              <CardHeader title="Répartition par rôle" subtitle="Comptes par profil d'accès" />
              <div className="mt-5 space-y-3">
                {byRole.map(({ role, count }) => {
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={role}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-muted">{ROLE_LABEL[role]}</span>
                        <span className="tabular font-bold text-ink">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-ink/70"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Quick actions */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2 lg:content-start">
              <QuickAction
                href="/admin/users"
                icon={Users}
                title="Gestion des comptes"
                description="Créer, modifier, activer ou réinitialiser les comptes utilisateurs."
              />
              <QuickAction
                href="/admin/audit"
                icon={ScrollText}
                title="Journaux système"
                description="Consulter l'historique complet et immuable des actions."
              />

              {/* Recent accounts */}
              <Card className="sm:col-span-2">
                <CardHeader
                  title="Comptes récemment créés"
                  subtitle="Les derniers profils ajoutés au système"
                  action={
                    <Link
                      href="/admin/users"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
                    >
                      Tout voir <ArrowRight className="h-4 w-4" />
                    </Link>
                  }
                />
                {recent.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState title="Aucun compte" description="Aucun utilisateur n'a encore été créé." />
                  </div>
                ) : (
                  <motion.ul
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="mt-4 divide-y divide-line"
                  >
                    {recent.map((u) => (
                      <motion.li
                        key={u.id}
                        variants={item}
                        className="flex items-center gap-3 py-3"
                      >
                        <Avatar first={u.firstName} last={u.lastName} className="h-9 w-9 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="truncate text-xs text-muted">@{u.username}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(u.roles ?? []).map((r) => (
                            <Badge key={r} tone="neutral">{ROLE_LABEL[r]}</Badge>
                          ))}
                        </div>
                        <span className="hidden w-24 shrink-0 text-right text-xs text-subtle sm:block">
                          {fmtDate(u.createdAt)}
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
      <Link
        href={href}
        className="card group flex h-full flex-col p-5 transition-shadow hover:shadow-card"
      >
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-muted">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
        <p className="mt-1 flex-1 text-sm text-muted">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          Ouvrir
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}
