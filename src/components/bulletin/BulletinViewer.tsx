import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BulletinCard } from './BulletinCard';
import { FileText, Calendar } from 'lucide-react';
import { PageLoading } from '../ui/PageLoading';
import type { BulletinAnalysis } from '../../types';

interface BulletinViewerProps {
  studentId: string;
  /** Incrémenter pour forcer le rechargement (ex: après nouvel upload) */
  refreshTrigger?: number;
  onGeneratePlanning?: () => void;
}

export function BulletinViewer({ studentId, refreshTrigger, onGeneratePlanning }: BulletinViewerProps) {
  const [bulletins, setBulletins] = useState<BulletinAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadBulletins();
  }, [studentId, refreshTrigger]);

  const loadBulletins = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bulletin_analyses')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (!error) setBulletins((data as BulletinAnalysis[]) || []);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <PageLoading message="Chargement des bulletins..." />
      </div>
    );
  }

  if (bulletins.length === 0) {
    return (
      <div className="p-8 text-center stone-card rounded-2xl">
        <FileText className="w-16 h-16 text-amber-500/50 mx-auto mb-4" />
        <p className="text-amber-100 font-medium mb-2">Aucun bulletin pour le moment</p>
        <p className="text-amber-100/60 text-sm">
          Tu peux ajouter ton bulletin ci-dessus, ou ton parent peut le faire depuis la Configuration.
        </p>
      </div>
    );
  }

  const selected = bulletins.find((b) => b.id === selectedId) ?? bulletins[0];

  return (
    <div className="space-y-6">
      <h3 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100">
        Mes bulletins analysés
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des bulletins */}
        <div className="space-y-2">
          {bulletins.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selected?.id === b.id
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-100'
                : 'bg-slate-900/50 border border-transparent text-amber-100/70 hover:bg-amber-500/10'
                }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="truncate">
                  {b.file_name || `Bulletin du ${new Date(b.created_at).toLocaleDateString('fr-FR')}`}
                </span>
              </div>
              <p className="text-xs text-amber-100/50 mt-1">
                {b.semester ? b.semester.replace(/(\d{4})-S(\d)/, 'Sem. $2 ($1)') + ' • ' : ''}
                Moyenne: {b.extracted_data?.overall_average ?? '-'} • {new Date(b.created_at).toLocaleDateString('fr-FR')}
              </p>
            </button>
          ))}
        </div>

        {/* Détail de l'analyse sélectionnée */}
        <div className="lg:col-span-2 space-y-4">
          {selected && onGeneratePlanning && (
            <div className="flex justify-end">
              <button
                onClick={onGeneratePlanning}
                className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-2 shadow-lg shadow-amber-900/20 text-sm"
              >
                <Calendar className="w-4 h-4" />
                Proposer un planning de révisions
              </button>
            </div>
          )}

          {selected && (
            <BulletinCard
              analysis={selected}
              onUpdate={async (updated) => {
                const { error } = await supabase
                  .from('bulletin_analyses')
                  .update({ extracted_data: updated.extracted_data })
                  .eq('id', updated.id);
                if (!error) {
                  setBulletins((prev) =>
                    prev.map((b) => (b.id === updated.id ? updated : b))
                  );
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
