import { cn } from '@/lib/utils';

type Tone = 'violet' | 'gold' | 'teal' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

// Neutre par défaut ; les teintes sémantiques restent désaturées et discrètes.
const tones: Record<Tone, string> = {
  neutral: 'bg-surface text-muted border border-line',
  violet: 'bg-surface text-muted border border-line',
  teal: 'bg-accent-weak text-accent-700 border border-accent-200',
  success: 'bg-success-soft text-success border border-success-line',
  warning: 'bg-warning-soft text-warning border border-warning-line',
  gold: 'bg-warning-soft text-warning border border-warning-line',
  danger: 'bg-danger-soft text-danger border border-danger-line',
  info: 'bg-info-soft text-info border border-info-line',
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
