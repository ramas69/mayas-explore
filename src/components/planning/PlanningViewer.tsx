import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getVacations, getNextVacation } from '../../lib/schoolCalendars';
import { Calendar, FileText, MapPin, Trash2, ExternalLink } from 'lucide-react';
import { PageLoading } from '../ui/PageLoading';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { SchoolZone } from '../../types';
import { WeeklyProgramTable, type PlanningSlot } from './WeeklyProgramTable';

interface PlanningData {
  id: string;
  student_id: string;
  city_zone: SchoolZone;
  weekly_slots: {
    file_url?: string;
    file_type?: 'image' | 'pdf';
    slots?: PlanningSlot[];
    vacation_slots?: PlanningSlot[];
  };
  created_at: string;
  updated_at: string;
}

const ZONE_LABELS: Record<SchoolZone, string> = {
  A: 'Zone A (Lyon, Besançon, Bordeaux, Grenoble, Dijon...)',
  B: 'Zone B (Aix-Marseille, Amiens, Caen, Lille, Rennes...)',
  C: 'Zone C (Paris, Créteil, Versailles, Montpellier, Toulouse...)',
};

interface PlanningViewerProps {
  studentId: string;
  refreshTrigger?: number;
  /** Afficher boutons Supprimer / Modifier (côté parent) */
  canEdit?: boolean;
  onDeleted?: () => void;
  /** Callback après sauvegarde des créneaux modifiés */
  onSlotsSaved?: () => void;
  /** Masquer le bloc "Emploi du temps enregistré" (évite duplication si géré par PlanningUploader) */
  hideEmploiDuTempsBlock?: boolean;
}

export function PlanningViewer({ studentId, refreshTrigger, canEdit, onDeleted, onSlotsSaved, hideEmploiDuTempsBlock }: PlanningViewerProps) {
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const [bulletins, setBulletins] = useState<{ extracted_data?: { subjects?: { name: string; status?: string }[] } }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadPlanning();
  }, [studentId, refreshTrigger]);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const { data } = await supabase
        .from('bulletin_analyses')
        .select('extracted_data')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);
      setBulletins((data ?? []) as typeof bulletins);
    })();
  }, [studentId, refreshTrigger]);

  const loadPlanning = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('planning')
      .select('*')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) setPlanning(data as PlanningData);
    else setPlanning(null);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <PageLoading message="Chargement du planning..." />
      </div>
    );
  }

  if (!planning) {
    return (
      <div className="p-6 text-center stone-card rounded-2xl">
        <Calendar className="w-12 h-12 text-amber-500/50 mx-auto mb-3" />
        <p className="text-amber-100 font-medium mb-1">Aucun planning configuré</p>
        <p className="text-amber-100/60 text-sm">Tu peux ajouter ton emploi du temps ci-dessus, ou ton parent peut le faire depuis la Configuration.</p>
      </div>
    );
  }

  const ws = planning.weekly_slots || {};
  const fileUrl = ws.file_url;
  const zone = planning.city_zone && ['A', 'B', 'C'].includes(planning.city_zone) ? planning.city_zone : 'A';
  const bulletinSubjects = (bulletins[0]?.extracted_data?.subjects ?? []) as { name: string; status?: string }[];
  const vacations = getVacations(zone);
  const nextVacation = getNextVacation(zone);

  return (
    <div className="space-y-6">
      {/* Zone scolaire + prochaines vacances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-900/50 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="font-medium">Zone scolaire</span>
          </div>
          <p className="text-amber-100">{ZONE_LABELS[zone]}</p>
        </div>
        {nextVacation && (
          <div className="p-4 bg-slate-900/50 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Prochaines vacances</span>
            </div>
            <p className="text-amber-100">
              {nextVacation.name} : {nextVacation.start.toLocaleDateString('fr-FR')} → {nextVacation.end.toLocaleDateString('fr-FR')}
            </p>
          </div>
        )}
      </div>

      {/* Emploi du temps - pas d'affichage image, juste label + actions */}
      {!hideEmploiDuTempsBlock && fileUrl && (
        <div className="stone-card rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-amber-100 font-medium">Emploi du temps enregistré</span>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" /> Voir
            </a>
          </div>
          {canEdit && (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-rose-400 hover:bg-rose-500/20 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
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
                  const ws = planning.weekly_slots as { file_url?: string };
                  if (ws?.file_url) {
                    const match = ws.file_url.match(/\/planning\/(.+)$/);
                    if (match?.[1]) {
                      await supabase.storage.from('planning').remove([match[1]]);
                    }
                  }
                  await supabase.from('planning').delete().eq('student_id', studentId);
                  loadPlanning();
                  onDeleted?.();
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Programme de la semaine (même affichage que Dashboard, modifiable) */}
      <WeeklyProgramTable
        weeklySlots={ws}
        bulletinSubjects={bulletinSubjects}
        city_zone={zone}
        editable={canEdit}
        onSave={canEdit ? async (slots, isVacation) => {
          const updated = { ...ws };
          if (isVacation) updated.vacation_slots = slots;
          else updated.slots = slots;
          await supabase
            .from('planning')
            .update({ weekly_slots: updated })
            .eq('student_id', studentId);
          loadPlanning();
          onSlotsSaved?.();
        } : undefined}
      />

      {/* Calendrier des vacances */}
      <div className="stone-card rounded-2xl p-6">
        <h3 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          Vacances scolaires Zone {zone}{' '}
          {(() => {
            const d = new Date();
            const y = d.getFullYear();
            const m = d.getMonth();
            const schoolYear = m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
            return `(${schoolYear})`;
          })()}
        </h3>
        <div className="space-y-2">
          {vacations.map((v, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-amber-500/10 last:border-0">
              <span className="text-amber-100 font-medium">{v.name}</span>
              <span className="text-amber-100/70 text-sm">
                {v.start.toLocaleDateString('fr-FR')} – {v.end.toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
