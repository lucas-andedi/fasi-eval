import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

export function Avatar({
  first,
  last,
  className,
}: {
  first?: string;
  last?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid place-items-center rounded-full border border-line bg-surface font-semibold text-muted select-none',
        'h-10 w-10 text-[13px]',
        className,
      )}
    >
      {initials(first, last)}
    </span>
  );
}
