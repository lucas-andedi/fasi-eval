'use client';
import { motion } from 'framer-motion';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        {eyebrow && <p className="mb-1 text-sm font-medium text-muted">{eyebrow}</p>}
        <h1 className="font-display text-[26px] font-bold leading-tight text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2.5">{action}</div>}
    </motion.div>
  );
}
