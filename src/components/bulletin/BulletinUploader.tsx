import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { BulletinCard } from './BulletinCard';
import { StoneSelect } from '../ui/StoneSelect';
import { supabase } from '../../lib/supabase';
import { pdfToImageUrls } from '../../lib/pdfToImages';
import type { BulletinAnalysis } from '../../types';

interface BulletinUploaderProps {
  studentId: string;
  onAnalysisComplete?: (analysis: BulletinAnalysis) => void;
  onStartRevisions?: () => void;
}

// Année scolaire en cours (France : sept-juin)
function getSchoolYearSemesters(): { value: string; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const startYear = month >= 9 ? year : year - 1;
  const label = `${startYear}-${startYear + 1}`;
  return [
    { value: `${startYear}-S1`, label: `Semestre 1 (${label})` },
    { value: `${startYear}-S2`, label: `Semestre 2 (${label})` },
  ];
}

export function BulletinUploader({ studentId, onAnalysisComplete, onStartRevisions }: BulletinUploaderProps) {
  const [semester, setSemester] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BulletinAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const semesterOptions = getSchoolYearSemesters();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!semester) {
      setError('Choisis d\'abord le semestre concerné.');
      return;
    }
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const basePath = `${studentId}/${timestamp}`;
      const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';

      // Upload fichier original à Supabase Storage
      const fileName = `${basePath}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('bulletins')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const fileUrl = supabase.storage.from('bulletins').getPublicUrl(fileName).data.publicUrl;

      setIsUploading(false);
      setIsAnalyzing(true);

      // Pour PDF : convertir chaque page en image et uploader (chunks)
      let body: { fileUrl: string; fileType: string; studentId: string; pageImageUrls?: string[] };
      if (fileType === 'pdf') {
        const pageImageUrls = await pdfToImageUrls(file, async (blob, pageIndex) => {
          const pageFileName = `${basePath}_page_${pageIndex}.jpg`;
          const { error: pageErr } = await supabase.storage
            .from('bulletins')
            .upload(pageFileName, blob, { contentType: 'image/jpeg' });
          if (pageErr) throw pageErr;
          return supabase.storage.from('bulletins').getPublicUrl(pageFileName).data.publicUrl;
        });
        body = { fileUrl, fileType: 'pdf_pages' as const, studentId, pageImageUrls };
      } else {
        body = { fileUrl, fileType, studentId };
      }

      /*
      // Rafraîchir la session puis récupérer le token (CAUSES HANG)
      // const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      */

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.access_token) {
        throw new Error('Session expirée. Reconnecte-toi.');
      }

      console.log('[BulletinUploader] Calling Edge Function via direct fetch...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/analyze-bulletin`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body)
      });

      let analysisResult;
      try {
        analysisResult = await response.json();
      } catch (e) {
        throw new Error("Réponse invalide du serveur d'analyse");
      }

      if (!response.ok) {
        const msg = analysisResult?.error || analysisResult?.message || "Erreur lors de l'analyse";
        throw new Error(msg);
      }

      if (!analysisResult || analysisResult.error) {
        throw new Error(analysisResult?.error || 'Échec de l\'analyse');
      }

      // Upsert : un bulletin par semestre — met à jour si existe, sinon insert (garde les anciennes données)
      const { data: existing } = await supabase
        .from('bulletin_analyses')
        .select('id')
        .eq('student_id', studentId)
        .eq('semester', semester)
        .maybeSingle();

      let savedAnalysis: BulletinAnalysis;
      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('bulletin_analyses')
          .update({
            file_url: fileUrl,
            file_name: file.name,
            file_type: fileType,
            extracted_data: analysisResult,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (updateError) throw updateError;
        savedAnalysis = updated as BulletinAnalysis;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('bulletin_analyses')
          .insert({
            student_id: studentId,
            semester,
            file_url: fileUrl,
            file_name: file.name,
            file_type: fileType,
            extracted_data: analysisResult,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        savedAnalysis = inserted as BulletinAnalysis;
      }

      setAnalysis(savedAnalysis);
      onAnalysisComplete?.(savedAnalysis);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  }, [studentId, semester, onAnalysisComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="space-y-6">
      {/* Sélection du semestre */}
      {!analysis && (
        <div>
          <label className="block text-amber-100/80 text-sm mb-2">Pour quel semestre ?</label>
          <StoneSelect
            value={semester}
            onValueChange={(v) => { setSemester(v); setError(null); }}
            options={semesterOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
            placeholder="Choisir le semestre"
          />
          <p className="text-xs text-amber-100/50 mt-1">Un bulletin par semestre. Tes anciens bulletins sont conservés.</p>
        </div>
      )}

      {/* Upload Zone */}
      {!analysis && (
        <div
          {...getRootProps()}
          className={`p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragActive
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/5'
            }`}
        >
          <input {...getInputProps()} />

          <div className="text-center">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <LoadingSpinner size="lg" className="mb-4" />
                <p className="text-amber-100">Téléchargement en cours...</p>
              </div>
            ) : isAnalyzing ? (
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <LoadingSpinner size="lg" />
                  <span className="absolute inset-0 flex items-center justify-center text-lg">🔍</span>
                </div>
                <p className="text-amber-100">L'Exploratrice analyse ton bulletin...</p>
                <p className="text-sm text-amber-100/50 mt-2">
                  Identification des zones prioritaires
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-amber-500/20 rounded-full">
                  <Upload className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-lg font-medium text-amber-100 mb-2">
                  {!semester
                    ? 'Choisis d\'abord le semestre ci-dessus'
                    : isDragActive
                      ? 'Dépose ton bulletin ici'
                      : 'Upload ton bulletin'}
                </p>
                <p className="text-sm text-amber-100/50 mb-4">
                  PDF, PNG ou JPG (max 10MB)
                </p>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-amber-100/40">
                    <FileText className="w-4 h-4" />
                    <span>PDF</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-100/40">
                    <Image className="w-4 h-4" />
                    <span>Image</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="stone-alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Success Header */}
          <div className="stone-alert-success">
            <CheckCircle className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="font-bold">Analyse complète !</h3>
              <p className="text-sm opacity-90">
                L'Exploratrice a identifié tes zones prioritaires. Clique sur une matière pour modifier son statut.
              </p>
            </div>
          </div>

          <BulletinCard
            analysis={analysis}
            showFileLink={true}
            onUpdate={async (updated) => {
              const { error } = await supabase
                .from('bulletin_analyses')
                .update({ extracted_data: updated.extracted_data })
                .eq('id', updated.id);
              if (!error) setAnalysis(updated);
            }}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setAnalysis(null)}
              className="flex-1 py-3 border border-amber-500/30 text-amber-400 rounded-xl hover:bg-amber-500/10 transition-colors"
            >
              Analyser un autre bulletin
            </button>
            <button
              onClick={() => onStartRevisions?.()}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Proposer un planning de révisions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
