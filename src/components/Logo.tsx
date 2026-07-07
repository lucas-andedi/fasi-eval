import { cn } from '@/lib/utils';

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('relative inline-grid place-items-center rounded-[9px] bg-ink', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" width={size * 0.6} height={size * 0.6} fill="none">
        <path d="M10 7h13v3.4H13.4v4.2H21v3.4h-7.6V25H10V7Z" fill="white" />
      </svg>
      <span
        className="absolute rounded-full bg-accent"
        style={{ width: size * 0.16, height: size * 0.16, right: size * 0.16, bottom: size * 0.16 }}
      />
    </span>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={compact ? 30 : 34} />
      {!compact && (
        <span className="font-display text-[17px] font-bold tracking-tight text-ink">
          FASI<span className="text-accent">·</span>Eval
        </span>
      )}
    </div>
  );
}
