'use client';
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { ImportDialog } from './ImportDialog';
import type { ImportEntity } from './types';

export function ImportButton({
  entity,
  title,
  description,
  sessionId,
  onDone,
  label = 'Importer',
  variant = 'outline',
  size,
  className,
}: {
  entity: ImportEntity;
  title: string;
  description?: string;
  sessionId?: number;
  onDone?: () => void;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> {label}
      </Button>
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        entity={entity}
        title={title}
        description={description}
        sessionId={sessionId}
        onDone={onDone}
      />
    </>
  );
}
