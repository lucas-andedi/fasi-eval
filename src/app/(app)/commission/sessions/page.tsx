'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, CalendarClock, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import type { Promotion } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import type { SessionRow } from './types';

const STATUS_LABELS: Record<string, string> = {
  PREPARATION: 'en préparation',
  OUVERTE: 'ouverte',
  DELIBERATION: 'en délibération',
  CLOTUREE: 'clôturée',
};
const STATUS_LABELS_PLURAL: Record<string, string> = {
  PREPARATION: 'en préparation',
  OUVERTE: 'ouvertes',
  DELIBERATION: 'en délibération',
  CLOTUREE: 'clôturées',
};
const STATUS_ORDER = ['OUVERTE', 'DELIBERATION', 'PREPARATION', 'CLOTUREE'];

function statusBreakdown(counts: Record<string, number>): string {
  const parts = STATUS_ORDER.filter((s) => counts[s]).map((s) => {
    const n = counts[s];
    return `${n} ${n > 1 ? STATUS_LABELS_PLURAL[s] : STATUS_LABELS[s]}`;
  });
  return parts.join(' · ');
}

export default function SessionsPromotionsPage() {
  const router = useRouter();

  const { data: promotions, isLoading: loadingPromos } = useQuery({
    queryKey: ['reference', 'promotions'],
    queryFn: async () => (await api.get<Promotion[]>('/reference/promotions')).data,
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<SessionRow[]>('/sessions')).data,
  });

  const isLoading = loadingPromos || loadingSessions;

  const byPromotion = useMemo(() => {
    const map = new Map<number, { total: number; counts: Record<string, number> }>();
    for (const s of sessions ?? []) {
      const entry = map.get(s.promotionId) ?? { total: 0, counts: {} };
      entry.total += 1;
      entry.counts[s.status] = (entry.counts[s.status] ?? 0) + 1;
      map.set(s.promotionId, entry);
    }
    return map;
  }, [sessions]);

  const totalSessions = sessions?.length ?? 0;
  const totalPromotions = promotions?.length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Commission · CU-02"
        title="Sessions par promotion"
        description={
          totalPromotions > 0
            ? `${totalPromotions} promotion${totalPromotions > 1 ? 's' : ''} · ${totalSessions} session${totalSessions > 1 ? 's' : ''} de défense. Ouvrez une promotion pour créer une session.`
            : 'Sélectionnez une promotion pour planifier et piloter ses sessions de soutenance.'
        }
      />

      {isLoading ? (
        <LoadingBlock label="Chargement des promotions…" />
      ) : (promotions ?? []).length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune promotion"
          description="Les promotions doivent être définies avant de planifier des sessions de défense."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(promotions ?? []).map((promo, i) => {
            const entry = byPromotion.get(promo.id);
            const total = entry?.total ?? 0;
            const breakdown = entry ? statusBreakdown(entry.counts) : '';
            return (
              <PromotionCard
                key={promo.id}
                promo={promo}
                total={total}
                breakdown={breakdown}
                index={i}
                onOpen={() => router.push(`/commission/sessions/promotion/${promo.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PromotionCard({
  promo,
  total,
  breakdown,
  index,
  onOpen,
}: {
  promo: Promotion;
  total: number;
  breakdown: string;
  index: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      onClick={onOpen}
      className="card group relative overflow-hidden p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-weak text-accent-700">
            <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="truncate font-display text-lg font-bold text-ink">{promo.label}</h3>
          <p className="mt-0.5 text-sm font-semibold text-muted">{promo.code}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-1" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <CalendarClock className="h-4 w-4 text-subtle" strokeWidth={1.75} />
          {total} session{total > 1 ? 's' : ''}
        </span>
        {breakdown ? (
          <span className="inline-flex items-center gap-1.5 truncate text-muted">
            <Layers className="h-3.5 w-3.5 text-subtle" strokeWidth={1.75} />
            {breakdown}
          </span>
        ) : (
          <span className="text-subtle">Aucune session</span>
        )}
      </div>
    </motion.button>
  );
}
