'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import type { AxiosError } from 'axios';
import { ArrowLeft, ArrowRight, ChevronRight, ClipboardList, ShieldAlert, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { EvalStatusBadge, StudentStatusBadge } from '@/components/ui/status';
import { EmptyState, LoadingBlock } from '@/components/ui/Feedback';
import { ConfidentialityBanner, MiniProgress, type MyStudentRow } from '../_shared';
import { studentName } from '@/lib/names';
import { ImportButton } from '@/components/import';

function readName(r: MyStudentRow) {
  const first = r.student?.firstName ?? r.firstName ?? '';
  const last = r.student?.lastName ?? r.lastName ?? '';
  const postnom = r.student?.postnom ?? r.postnom ?? null;
  return { first, last, full: studentName({ lastName: last, postnom, firstName: first }) || 'Étudiant' };
}
function readMatricule(r: MyStudentRow) {
  return r.student?.matricule ?? r.matricule ?? '—';
}
function readStudentId(r: MyStudentRow) {
  return r.student?.id ?? r.studentId;
}

export default function EtudiantsAEvaluerPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-students', sessionId],
    queryFn: async () =>
      (await api.get<MyStudentRow[]>('/evaluations/my-students', { params: { sessionId } })).data,
    enabled: !!sessionId,
    retry: false,
  });

  const forbidden = (error as AxiosError)?.response?.status === 403;

  const rows = data ?? [];
  const total = rows.length;
  const submitted = rows.filter((r) => r.status === 'VALIDEE' || r.status === 'VERROUILLEE').length;
  const todo = rows.filter((r) => r.status === 'BROUILLON').length;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/jury"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 transition hover:text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" /> Mes sessions
      </Link>

      <PageHeader
        eyebrow="Saisie des évaluations"
        title="Étudiants à évaluer"
        description="Renseignez votre évaluation pour chaque étudiant de cette session."
        action={
          <ImportButton
            entity="notes"
            sessionId={Number(sessionId)}
            label="Importer les cotes (Excel)"
            title="Importer les cotes"
            description="Importez vos cotes pour les étudiants de cette session depuis un fichier Excel. Elles sont enregistrées comme brouillon : vous devrez ensuite valider chaque étudiant pour les rendre définitives."
            onDone={() => qc.invalidateQueries({ queryKey: ['my-students', sessionId] })}
          />
        }
      />

      {!isLoading && !isError && total > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Évaluations soumises" value={`${submitted}/${total}`} icon={Users} tone="teal" index={0} />
          <StatCard label="Restant à faire" value={todo} icon={ClipboardList} tone="gold" index={1} />
          <StatCard
            label="Progression"
            value={`${total > 0 ? Math.round((submitted / total) * 100) : 0}%`}
            tone="violet"
            index={2}
          />
        </div>
      )}

      <div className="mb-6">
        <ConfidentialityBanner subtle />
      </div>

      {isLoading ? (
        <LoadingBlock label="Chargement des étudiants…" />
      ) : forbidden ? (
        <EmptyState
          icon={ShieldAlert}
          title="Accès non autorisé"
          description="Vous n'êtes pas affecté à cette session."
        />
      ) : isError ? (
        <EmptyState
          icon={ClipboardList}
          title="Impossible de charger la liste"
          description="Une erreur est survenue. Vérifiez que la session vous est bien affectée."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun étudiant à évaluer"
          description="Cette session ne comporte aucun étudiant à votre charge pour le moment."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper/70">
          {rows.map((r, i) => {
            const name = readName(r);
            const studentId = readStudentId(r);
            const filled = r.submittedCount ?? 0;
            const totalCriteria = r.totalCriteria ?? 0;
            return (
              <motion.div
                key={studentId ?? i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/jury/${sessionId}/${studentId}`}
                  className="group flex items-center gap-4 border-b border-violet-50 px-4 py-3.5 transition last:border-b-0 hover:bg-violet-50/60 sm:px-5"
                >
                  <Avatar first={name.first} last={name.last} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-ink">{name.full}</span>
                      <StudentStatusBadge status={r.studentStatus ?? 'REGULIER'} />
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-ink/45">{readMatricule(r)}</p>
                  </div>

                  {totalCriteria > 0 && (
                    <div className="hidden sm:block">
                      <MiniProgress filled={filled} total={totalCriteria} />
                    </div>
                  )}

                  <EvalStatusBadge status={r.status} />

                  <ChevronRight className="h-5 w-5 shrink-0 text-violet-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-violet-500" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {!isLoading && total > 0 && (
        <p className="mt-6 flex items-center justify-end gap-1.5 text-xs text-ink/40">
          Cliquez sur un étudiant pour ouvrir le formulaire d'évaluation
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      )}
    </div>
  );
}
