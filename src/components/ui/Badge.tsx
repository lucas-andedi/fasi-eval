import { cn } from '@/lib/utils';

type Tone = 'violet' | 'gold' | 'teal' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

// Neutre par défaut ; les teintes sémantiques restent désaturées et discrètes.
const tones: Record<Tone, string> = {
  neutral: 'bg-surface text-muted border border-line',
  violet: 'bg-surface text-muted border border-line',
  teal: 'bg-accent-weak text-accent-700 border border-accent-200',
  success: 'bg-[#eef3ee] text-success border border-[#dbe7dd]',
  warning: 'bg-[#f6f1e5] text-warning border border-[#ece3cf]',
  gold: 'bg-[#f6f1e5] text-warning border border-[#ece3cf]',
  danger: 'bg-[#f7eceb] text-danger border border-[#eed7d4]',
  info: 'bg-[#eaeff4] text-info border border-[#d9e2ea]',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={cn('chip', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
