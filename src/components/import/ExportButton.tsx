'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { downloadBase64 } from './utils';
import type { FileResponse, ImportEntity } from './types';

export function ExportButton({
  entity,
  filenameHint,
  sessionId,
  label = 'Exporter',
  variant = 'outline',
  size,
  className,
}: {
  entity: ImportEntity;
  filenameHint?: string;
  sessionId?: number;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<FileResponse>(`/imports/${entity}/export`, {
        params: sessionId != null ? { sessionId } : undefined,
      });
      downloadBase64(data.fileBase64, data.filename || filenameHint || `${entity}.xlsx`);
      toast.success('Export téléchargé.');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} className={className} onClick={run} loading={loading}>
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
