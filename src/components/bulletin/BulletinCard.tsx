import { useState, useEffect } from 'react';
import { FileText, TrendingDown, TrendingUp, ExternalLink } from 'lucide-react';
import type { BulletinAnalysis, BulletinSubjectStatus } from '../../types';

interface BulletinCardProps {
  analysis: BulletinAnalysis;
  showFileLink?: boolean;
  /** Si fourni, permet de modifier le statut et appelle après sauvegarde */
  onUpdate?: (updated: BulletinAnalysis) => void;
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-rose-400" />;
    default:
      return <div className="w-4 h-4 rounded-full bg-amber-400" />;
  }
}

function getStatusStyle(status?: string, priority?: string) {
  const s = status ?? priority;
  switch (s) {
    case 'danger':
    case 'high':
      return { label: 'Danger', class: 'text-rose-400 bg-rose-500/20 border border-rose-500/40' };
    case 'surveiller':
      return { label: 'À surveiller', class: 'text-orange-400 bg-orange-500/20 border border-orange-500/40' };
    case 'reviser':
    case 'medium':
      return { label: 'À réviser', class: 'text-amber-400 bg-amber-500/20 border border-amber-500/40' };
    case 'ok':
    case 'low':
    default:
      return { label: 'OK', class: 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40' };
  }
}

const STATUS_OPTIONS: BulletinSubjectStatus[] = ['ok', 'reviser', 'surveiller', 'danger'];

export function BulletinCard({ analysis, showFileLink = true, onUpdate }: BulletinCardProps) {
  const [localData, setLocalData] = useState(analysis.extracted_data);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  useEffect(() => {
    setLocalData(analysis.extracted_data);
  }, [analysis.id, analysis.extracted_data]);
  const data = localData;
  const canEdit = !!onUpdate;
  const date = new Date(analysis.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="p-6 stone-card rounded-xl space-y-4">
      {/* Header: fichier + date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <span className="text-amber-100 font-medium">
            {analysis.file_name || 'Bulletin'}
          </span>
        </div>
        <span className="text-amber-100/50 text-sm">{date}</span>
      </div>

      {showFileLink && (
        <a
          href={analysis.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
        >
          <ExternalLink className="w-4 h-4" />
          Voir le fichier
        </a>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-900/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-golden">{data.overall_average}</p>
          <p className="text-xs text-amber-100/60">Moyenne générale</p>
        </div>
        <div className="p-3 bg-slate-900/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-rose-400">
            {data.weak_points?.length ?? 0}
          </p>
          <p className="text-xs text-amber-100/60">Points à renforcer</p>
        </div>
      </div>

      {/* Matières */}
      <div>
        <h4 className="font-bold text-amber-100 mb-2 text-sm flex items-center gap-2">
          Détail par matière
          {canEdit && (
            <span className="text-xs text-amber-100/50 font-normal">
              Clique sur une matière pour modifier son statut
            </span>
          )}
        </h4>
        <div className="space-y-2">
          {data.subjects?.map((subject: any, index: number) => {
            const currentStatus = (subject.status ?? (subject.priority === 'high' ? 'danger' : subject.priority === 'medium' ? 'reviser' : 'ok')) as BulletinSubjectStatus;
            const statusToPriority = (s: BulletinSubjectStatus) => s === 'danger' ? 'high' : s === 'surveiller' || s === 'reviser' ? 'medium' : 'low';
            const style = getStatusStyle(currentStatus);
            const isEditing = editingIndex === index;
            const handleStatusChange = (newStatus: BulletinSubjectStatus) => {
              const newSubjects = [...(data.subjects || [])];
              newSubjects[index] = { ...subject, status: newStatus, priority: statusToPriority(newStatus) };
              const newData = { ...data, subjects: newSubjects };
              setLocalData(newData);
              onUpdate?.({ ...analysis, extracted_data: newData });
              setEditingIndex(null);
            };
            return (
              <div
                key={index}
                className={`flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg gap-2 ${canEdit ? 'cursor-pointer hover:bg-slate-900/70' : ''}`}
                onClick={() => canEdit && (isEditing ? setEditingIndex(null) : setEditingIndex(index))}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getTrendIcon(subject.trend)}
                  <span className="text-amber-100 text-sm truncate">{subject.name}</span>
                </div>
                <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {canEdit && isEditing ? (
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(s).class}`}
                        >
                          {getStatusStyle(s).label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${style.class}`}
                    >
                      {style.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommandations */}
      {data.recommendations?.length > 0 && (
        <div>
          <h4 className="font-bold text-amber-100 mb-2 text-sm">Recommandations</h4>
          <ul className="space-y-1">
            {data.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-sm text-amber-100/80 flex gap-2">
                <span className="text-amber-400">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
