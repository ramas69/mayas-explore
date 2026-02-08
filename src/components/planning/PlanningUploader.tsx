import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import { pdfToImageUrls } from '../../lib/pdfToImages';
import { Upload, FileText, Image, Loader2, CheckCircle, AlertCircle, Sparkles, ExternalLink, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { SchoolZone } from '../../types';

interface PlanningUploaderProps {
  studentId: string;
  cityZone: SchoolZone;
  onUploadComplete?: (fileUrl: string, fileType: 'image' | 'pdf') => void;
  /** Fichier déjà enregistré (évite la duplication avec PlanningViewer) */
  existingFileUrl?: string | null;
  onDelete?: () => void;
}

export function PlanningUploader({
  studentId,
  cityZone,
  onUploadComplete,
  existingFileUrl,
  onDelete,
}: PlanningUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setIsAnalyzing(false);
      setError(null);

      try {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const basePath = `${studentId}/${timestamp}`;
        const fileName = `${basePath}.${fileExt}`;
        const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';

        const { error: uploadError } = await supabase.storage
          .from('planning')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const fileUrl = supabase.storage.from('planning').getPublicUrl(fileName).data.publicUrl;

        setIsUploading(false);
        setIsAnalyzing(true);

        // Récupérer le dernier bulletin pour les matières de l'élève (équilibrage pédagogique)
        let bulletinSubjects: { name: string; status?: string }[] = [];
        const { data: bulletins } = await supabase
          .from('bulletin_analyses')
          .select('extracted_data')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (bulletins?.extracted_data?.subjects) {
          bulletinSubjects = bulletins.extracted_data.subjects as { name: string; status?: string }[];
        }

        // Appel IA pour proposer les créneaux de révision
        let body: { fileUrl?: string; fileType: string; studentId: string; cityZone: string; pageImageUrls?: string[]; bulletinSubjects?: { name: string; status?: string }[] };
        if (fileType === 'pdf') {
          const pageImageUrls = await pdfToImageUrls(file, async (blob, pageIndex) => {
            const pageFileName = `${basePath}_page_${pageIndex}.jpg`;
            const { error: pageErr } = await supabase.storage
              .from('planning')
              .upload(pageFileName, blob, { contentType: 'image/jpeg' });
            if (pageErr) throw pageErr;
            return supabase.storage.from('planning').getPublicUrl(pageFileName).data.publicUrl;
          });
          body = { fileType: 'pdf_pages' as const, studentId, cityZone, pageImageUrls, bulletinSubjects };
        } else {
          body = { fileUrl, fileType, studentId, cityZone, bulletinSubjects };
        }

        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
        if (sessionError || !session?.access_token) {
          throw new Error('Session expirée. Reconnecte-toi.');
        }

        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
          'analyze-planning',
          {
            body,
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );

        if (analysisError) {
          const msg = (analysisError as { error?: string }).error ?? analysisError.message;
          throw new Error(msg);
        }
        if (!analysisResult || analysisResult.error) {
          throw new Error(analysisResult?.error || 'Échec de l\'analyse IA');
        }

        const slots = Array.isArray(analysisResult.slots) ? analysisResult.slots : [];
        const vacationSlots = Array.isArray(analysisResult.vacation_slots) ? analysisResult.vacation_slots : [];

        await supabase.from('planning').upsert(
          {
            student_id: studentId,
            city_zone: cityZone,
            weekly_slots: { file_url: fileUrl, file_type: fileType, slots, vacation_slots: vacationSlots },
          },
          { onConflict: 'student_id' }
        );

        setUploadedFile(fileUrl);
        onUploadComplete?.(fileUrl, fileType);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsUploading(false);
        setIsAnalyzing(false);
      }
    },
    [studentId, cityZone, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const hasExistingFile = existingFileUrl && !uploadedFile;

  return (
    <div className="space-y-4">
      <label className="block text-amber-100/80 text-sm">Emploi du temps (image ou PDF)</label>
      {hasExistingFile && (
        <div className="p-4 bg-slate-900/50 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-amber-100 font-medium text-sm">Fichier enregistré</span>
            <a
              href={existingFileUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" /> Voir
            </a>
          </div>
          {onDelete && (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
              <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Supprimer l'emploi du temps ?"
                description="L'emploi du temps et tous les créneaux analysés seront définitivement supprimés. Cette action est irréversible."
                confirmLabel="Supprimer"
                cancelLabel="Annuler"
                variant="danger"
                onConfirm={async () => {
                  const match = existingFileUrl!.match(/\/planning\/(.+)$/);
                  if (match?.[1]) {
                    await supabase.storage.from('planning').remove([match[1]]);
                  }
                  await supabase.from('planning').delete().eq('student_id', studentId);
                  onDelete();
                }}
              />
            </>
          )}
        </div>
      )}
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          isDragActive
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/5'
        }`}
      >
        <input {...getInputProps()} />
        {isUploading || isAnalyzing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <p className="text-amber-100 text-sm">{isUploading ? 'Upload en cours...' : 'IA analyse l\'emploi du temps et propose des créneaux...'}</p>
            {isAnalyzing && (
              <p className="text-amber-100/60 text-xs flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Créneaux de révision proposés par l'IA
              </p>
            )}
          </div>
        ) : uploadedFile ? (
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle className="w-6 h-6" />
            <span className="text-sm">Planning enregistré. Tu peux en uploader un autre.</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadedFile(null);
              }}
              className="text-amber-400 text-xs hover:underline ml-2"
            >
              Remplacer
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center bg-amber-500/20 rounded-full">
              <Upload className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-amber-100 text-sm">
              {isDragActive ? 'Dépose le fichier ici' : 'Glisse ton emploi du temps ou clique'}
            </p>
            <p className="text-xs text-amber-100/50 mt-1">PDF, PNG ou JPG (max 10 Mo)</p>
            <div className="flex justify-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-amber-100/40">
                <FileText className="w-4 h-4" /> PDF
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-100/40">
                <Image className="w-4 h-4" /> Image
              </span>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="stone-alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
