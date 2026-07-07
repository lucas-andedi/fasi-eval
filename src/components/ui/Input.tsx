'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-xl border border-line-strong bg-paper px-3.5 text-sm text-ink placeholder:text-subtle ' +
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 ' +
  'disabled:opacity-60 disabled:bg-surface';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-10', className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, 'py-2.5 min-h-[92px] resize-y', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(base, 'h-10 appearance-none pr-9 cursor-pointer', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label && (
        <span className="block text-sm font-medium text-ink">
          {label} {required && <span className="text-danger">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-xs font-medium text-danger">{error}</span>
      ) : (
        hint && <span className="block text-xs text-subtle">{hint}</span>
      )}
    </label>
  );
}
