import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BulletinCard } from './BulletinCard';
import { FileText, Loader2 } from 'lucide-react';
import type { BulletinAnalysis } from '../../types';

interface BulletinViewerProps {
  studentId: string;
  /** Incrémenter pour forcer le rechargement (ex: après nouvel upload) */
  refreshTrigger?: number;
}

export function BulletinViewer({ studentId, refreshTrigger }: BulletinViewerProps) {
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
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
        <p className="text-amber-100/60">Chargement des bulletins...</p>
      </div>
    );
  }

  if (bulletins.length === 0) {
    return (
      <div className="p-8 text-center stone-card rounded-2xl">
        <FileText className="w-16 h-16 text-amber-500/50 mx-auto mb-4" />
        <p className="text-amber-100 font-medium mb-2">Aucun bulletin pour le moment</p>
        <p className="text-amber-100/60 text-sm">
          Ton parent peut uploader tes bulletins dans la configuration. Une fois analysés, tu les verras ici.
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
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                selected?.id === b.id
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
        <div className="lg:col-span-2">
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
