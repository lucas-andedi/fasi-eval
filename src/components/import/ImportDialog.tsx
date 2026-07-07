'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { downloadBase64, fileToBase64 } from './utils';
import type { FileResponse, ImportEntity, ImportResult } from './types';

export function ImportDialog({
  open,
  onClose,
  entity,
  title,
  description,
  sessionId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  entity: ImportEntity;
  title: string;
  description?: string;
  sessionId?: number;
  onDone?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Réinitialise à chaque ouverture.
  useEffect(() => {
    if (open) {
      setResult(null);
      setUploading(false);
      setDownloading(false);
    }
  }, [open]);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const { data } = await api.get<FileResponse>(`/imports/${entity}/template`, {
        params: sessionId != null ? { sessionId } : undefined,
      });
      downloadBase64(data.fileBase64, data.filename || `modele-${entity}.xlsx`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setDownloading(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const body: { fileBase64: string; sessionId?: number } = { fileBase64 };
      if (sessionId != null) body.sessionId = sessionId;

      const { data } = await api.post<ImportResult>(`/imports/${entity}`, body);
      setResult(data);

      const okCount = data.created + (data.updated ?? 0);
      if (data.errors.length > 0) {
        toast.warning(
          `Import terminé avec ${data.errors.length} erreur${data.errors.length > 1 ? 's' : ''}.`,
        );
      } else {
        toast.success(
          `Import réussi — ${okCount} ligne${okCount > 1 ? 's' : ''} traitée${okCount > 1 ? 's' : ''}.`,
        );
      }
      onDone?.();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={title}
      description={description}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Étape 1 — modèle */}
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-muted">
              <FileSpreadsheet className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">1. Partez du modèle</p>
              <p className="mt-0.5 text-xs text-muted">
                Téléchargez le modèle Excel, complétez-le, puis importez-le ci-dessous.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                disabled={downloading}
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition hover:text-accent-hover disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Préparation…' : 'Télécharger le modèle Excel'}
              </button>
            </div>
          </div>
        </div>

        {/* Étape 2 — fichier */}
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">2. Importez votre fichier complété</p>
          <p className="mt-0.5 text-xs text-muted">Format accepté : .xlsx</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={onFile}
          />
          <Button
            variant="outline"
            className="mt-3"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Import en cours…' : 'Choisir un fichier Excel'}
          </Button>
        </div>

        {/* Résultat */}
        {result && <ResultPanel result={result} />}
      </div>
    </Modal>
  );
}

function ResultPanel({ result }: { result: ImportResult }) {
  const hasErrors = result.errors.length > 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {hasErrors ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" /> Import partiel
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Import terminé
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Stat label="créés" value={result.created} tone="accent" />
        {result.updated != null && <Stat label="mis à jour" value={result.updated} tone="neutral" />}
        <Stat label="ignorés" value={result.skipped} tone="neutral" />
        {hasErrors && <Stat label="en erreur" value={result.errors.length} tone="danger" />}
      </div>

      {hasErrors && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-line bg-surface">
          <ul className="divide-y divide-line text-sm">
            {result.errors.map((e, i) => (
              <li key={i} className="flex gap-2 px-3 py-2">
                <span className="shrink-0 font-mono text-xs font-semibold text-danger">
                  Ligne {e.row}
                </span>
                <span className="min-w-0 text-muted">{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.tempPasswords && result.tempPasswords.length > 0 && (
        <TempPasswords items={result.tempPasswords} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'accent' | 'neutral' | 'danger';
}) {
  const toneCls =
    tone === 'accent'
      ? 'border-accent-200 bg-accent-weak text-accent-700'
      : tone === 'danger'
        ? 'border-danger/30 bg-danger/8 text-danger'
        : 'border-line bg-surface text-muted';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium ${toneCls}`}
    >
      <span className="font-bold tabular-nums">{value}</span> {label}
    </span>
  );
}

function TempPasswords({
  items,
}: {
  items: { username: string; tempPassword: string }[];
}) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      const text = items.map((i) => `${i.username}\t${i.tempPassword}`).join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Identifiants copiés.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier.');
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <div>
            <p className="text-sm font-semibold text-ink">Mots de passe temporaires</p>
            <p className="mt-0.5 text-xs text-muted">
              Affichés une seule fois — communiquez-les aux utilisateurs, qui devront les changer à la
              première connexion.
            </p>
          </div>
        </div>
        <Button variant="subtle" size="sm" onClick={copyAll}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copié' : 'Tout copier'}
        </Button>
      </div>
      <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
        {items.map((i) => (
          <li
            key={i.username}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-1.5"
          >
            <span className="truncate font-mono text-xs text-ink/70">@{i.username}</span>
            <code className="select-all font-mono text-sm font-bold text-ink">{i.tempPassword}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
