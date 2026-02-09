import { useEffect, useState } from 'react';
import { X, BookOpen, MessageSquare } from 'lucide-react';
import { PageLoading } from '../ui/PageLoading';
import { getSessions } from '../../lib/supabase';
import type { Subject, Session } from '../../types';

interface GrimoireModalProps {
  subject: Subject;
  studentId: string;
  onClose: () => void;
  onLoadSession: (session: Session) => void;
}

export function GrimoireModal({ subject, studentId, onClose, onLoadSession }: GrimoireModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await getSessions(studentId, 50, subject);
      setSessions(data ?? []);
      setLoading(false);
    };
    if (studentId) load();
    else setLoading(false);
  }, [studentId, subject]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return `Aujourd'hui ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000) return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(26, 44, 77, 0.95) 0%, rgba(5, 8, 12, 0.98) 100%)',
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden stone-card border-2 border-amber-500/30 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-amber-500/20 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 flex items-center gap-3">
              <span className="text-3xl">📖</span>
              Grimoire - {subject}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-amber-500/10 transition-colors text-amber-400"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-amber-100/70 text-sm mt-2">
            Historique de tes conversations avec le Gardien dans cette matière.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12">
              <PageLoading message="Chargement de l'historique..." />
            </div>
          ) : sessions.length === 0 ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed border-amber-500/20 rounded-xl bg-slate-900/30">
              <BookOpen className="w-16 h-16 text-amber-500/40" />
              <p className="text-amber-100/50 text-sm">Aucune conversation pour l&apos;instant</p>
              <p className="text-amber-100/40 text-xs">Clique sur &quot;Voir le Gardien&quot; pour commencer une nouvelle expédition !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onLoadSession(session)}
                  className="w-full text-left p-4 rounded-xl bg-slate-800/60 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/30">
                    <MessageSquare className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-amber-100 truncate">
                      {session.chapter || subject}
                    </p>
                    <p className="text-xs text-amber-100/50">
                      {formatDate(session.start_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
