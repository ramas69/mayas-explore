import { useEffect } from 'react';
import { X, Target, BookOpen, Sparkles } from 'lucide-react';
import { getGradeFromStatus } from '../../lib/bulletinUtils';
import type { Subject, Curriculum } from '../../types';
import type { BulletinSubjectStatus } from '../../types';

interface BulletinSubjectData {
  name: string;
  grade?: number;
  trend?: 'up' | 'down' | 'stable';
  priority?: 'high' | 'medium' | 'low';
  status?: BulletinSubjectStatus;
  gauge_niveau?: number | null;
  appreciation_prof?: string;
  points_blocage?: string[];
}

interface SubjectCardModalProps {
  subject: Subject;
  bulletinData: BulletinSubjectData | null;
  bulletinExtras?: { weak_points?: string[]; recommendations?: string[] };
  curriculum: Curriculum[];
  onClose: () => void;
  /** Nouvelle conversation avec le Gardien (chat) */
  onNewChat: (chapter: Curriculum) => void;
  /** Historique des conversations (Grimoire) */
  onShowGrimoire: () => void;
}

function getStatusNeon(status?: BulletinSubjectStatus, priority?: string) {
  const s = status ?? (priority === 'high' ? 'danger' : priority === 'medium' ? 'reviser' : 'ok');
  switch (s) {
    case 'danger':
      return { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)', label: 'Danger' };
    case 'surveiller':
      return { main: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', label: 'À surveiller' };
    case 'reviser':
      return { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', label: 'À réviser' };
    case 'ok':
    default:
      return { main: '#00f3ff', glow: 'rgba(0, 243, 255, 0.4)', label: 'OK' };
  }
}

// Icônes depuis public/icons_matieres/
const SUBJECT_ICON_PATHS: Record<string, string> = {
  'Maths': '/icons_matieres/mathematiques.svg',
  'Français': '/icons_matieres/francais.svg',
  'Histoire-Géo': '/icons_matieres/histoire_geographie.svg',
  'SVT': '/icons_matieres/svt.svg',
  'Physique-Chimie': '/icons_matieres/physique_chimie.svg',
  'Anglais': '/icons_matieres/anglais.svg',
  'Espagnol': '/icons_matieres/espagnol.svg',
  'Théologie': '/icons_matieres/philosophie.svg',
  'Arts': '/icons_matieres/arts_plastiques.svg',
  'EPS': '/icons_matieres/eps.svg',
  'Musique': '/icons_matieres/musique.svg',
  'Technologie': '/icons_matieres/technologie.svg',
};

export function SubjectCardModal({
  subject,
  bulletinData,
  bulletinExtras,
  curriculum,
  onClose,
  onNewChat,
  onShowGrimoire,
}: SubjectCardModalProps) {
  const status = (bulletinData?.status ?? (bulletinData?.priority === 'high' ? 'danger' : bulletinData?.priority === 'medium' ? 'reviser' : 'ok')) as BulletinSubjectStatus;
  const neon = bulletinData ? getStatusNeon(status, bulletinData?.priority) : getStatusNeon('ok');
  const nextChapter = curriculum.find(c => c.status !== 'maitrise') ?? curriculum[0];
  const fallbackChapter = curriculum.length === 0 ? {
    id: `mentor-${subject}`,
    student_id: '',
    subject,
    chapter_name: subject,
    source: 'manual' as const,
    status: 'pas_vu' as const,
    order_index: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;
  const chapterToUse = nextChapter ?? fallbackChapter;
  const interactionProgress = curriculum.length > 0
    ? Math.round((curriculum.filter((c) => c.status === 'maitrise').length / curriculum.length) * 100)
    : 0;
  const appreciation = bulletinData?.appreciation_prof ?? null;
  const pointsBlocage = bulletinData?.points_blocage ?? [];
  const artefact = chapterToUse ? `Badge « ${chapterToUse.chapter_name} »` : 'Prochain chapitre débloqué';
  const grade = bulletinData ? getGradeFromStatus(bulletinData.status) : 0;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center pt-8 sm:pt-12 pb-4 sm:pb-6 px-4 sm:px-6 overflow-y-auto overscroll-contain"
      onClick={onClose}
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(26, 44, 77, 0.8) 0%, rgba(5, 8, 12, 0.95) 100%)',
        animation: 'subjectModalFadeIn 0.3s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes subjectModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes subjectCardEnter {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes circuitMove {
          0% { left: 0; opacity: 0; }
          50% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes holoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .holo-card-subject {
          background: rgba(12, 18, 28, 0.95);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          overflow: hidden;
        }
        .stone-bubble {
          background: linear-gradient(135deg, #eaddcf, #cbbba0);
          color: #2a2215;
          border: 2px dashed rgba(138, 122, 90, 0.6);
          box-shadow: 0 5px 15px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.2);
        }
      `}</style>
      <div
        className="holo-card-subject relative w-full max-w-lg my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: `1px solid ${neon.main}`,
          boxShadow: `0 0 25px ${neon.glow}, inset 0 0 40px ${neon.glow.replace('0.4', '0.08')}`,
          animation: 'subjectCardEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Circuit trace animée */}
        <div
          className="absolute h-px w-24 opacity-50 z-20 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${neon.main}, transparent)`,
            animation: 'circuitMove 4s infinite linear',
            top: '12%',
          }}
        />

        {/* Coins tech (style holonomic) */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg opacity-60" style={{ borderColor: neon.main }} />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg opacity-60" style={{ borderColor: neon.main }} />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg opacity-60" style={{ borderColor: neon.main }} />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 rounded-br-lg opacity-60" style={{ borderColor: neon.main }} />
          {/* Détails SVG tech */}
          <svg className="absolute top-24 left-2 opacity-50" width="10" height="40">
            <rect width="2" height="40" fill={neon.main} />
            <rect y="10" width="8" height="2" fill={neon.main} />
            <rect y="30" width="6" height="2" fill={neon.main} />
          </svg>
          <svg className="absolute bottom-24 right-2 opacity-50 rotate-180" width="10" height="40">
            <rect width="2" height="40" fill={neon.main} />
            <rect y="10" width="8" height="2" fill={neon.main} />
            <rect y="30" width="6" height="2" fill={neon.main} />
          </svg>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 pt-6 sm:pt-8 z-10 max-h-[85vh] sm:max-h-[70vh] overflow-y-auto overscroll-contain">
          {/* Zone avatar / icône (gauche) */}
          <div className="flex-shrink-0 w-full sm:w-36 flex flex-col items-center">
            <div
              className="w-full h-40 rounded-xl flex justify-center items-center relative overflow-hidden"
              style={{
                border: `1px solid ${neon.main}66`,
                background: 'rgba(0, 10, 20, 0.6)',
                boxShadow: `inset 0 0 30px ${neon.glow}`,
              }}
            >
              <div
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  background: `linear-gradient(to bottom, transparent 40%, ${neon.main} 50%, transparent 60%)`,
                  backgroundSize: '100% 4px',
                  animation: 'scan 6s linear infinite',
                }}
              />
              <span className="relative z-10 flex items-center justify-center" style={{ animation: 'holoFloat 4s ease-in-out infinite' }}>
                <img
                  src={SUBJECT_ICON_PATHS[subject] || '/icons_matieres/arts_plastiques.svg'}
                  alt={subject}
                  className="w-16 h-16 object-contain"
                />
              </span>
            </div>
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold tracking-wider" style={{ color: neon.main }}>
                {neon.label}
              </div>
              <div className="text-xs text-gray-400">Bulletin analysé</div>
            </div>
          </div>

          {/* Zone contenu (droite) - bulles style pierre */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-['Cinzel_Decorative'] text-lg font-bold text-white">
                {subject}
              </h3>
              <button
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
                style={{ color: neon.main }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grille : Niveau bulletin + Progression */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bulletinData && (
                <div className="stone-bubble px-4 py-3 rounded-xl">
                  <p className="text-xs text-amber-900/70 mb-2">Niveau bulletin</p>
                  <div className="gauge-maya h-2.5 mb-2">
                    <div
                      className="gauge-maya-fill"
                      style={{ width: `${(grade / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: neon.main }}>
                    {neon.label}
                  </p>
                </div>
              )}
              {curriculum.length > 0 && (
                <div className="stone-bubble px-4 py-3 rounded-xl">
                  <p className="text-xs text-amber-900/70 mb-2">Progression IA</p>
                  <div className="gauge-maya h-2.5 mb-2">
                    <div
                      className="gauge-maya-fill"
                      style={{ width: `${interactionProgress}%` }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-amber-900">{interactionProgress}% maîtrisés</p>
                </div>
              )}
            </div>

            {/* Artefact à gagner */}
            {chapterToUse && (
              <div className="stone-bubble px-4 py-3 rounded-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-900/70 mb-0.5">Artefact à gagner</p>
                  <p className="text-sm font-medium text-amber-950">{artefact}</p>
                </div>
              </div>
            )}

            {/* Appréciation clé du prof */}
            {appreciation && (
              <div className="stone-bubble px-4 py-3 rounded-xl">
                <p className="text-xs text-amber-900/70 mb-1">Appréciation clé du prof</p>
                <p className="text-sm text-amber-950 italic">&quot;{appreciation}&quot;</p>
              </div>
            )}

            {/* Points faibles (niveau bulletin) */}
            {bulletinExtras?.weak_points && bulletinExtras.weak_points.length > 0 && (
              <div className="stone-bubble px-4 py-3 rounded-xl">
                <p className="text-xs text-amber-900/70 mb-1">Points faibles (bulletin)</p>
                <ul className="text-sm text-amber-950 space-y-0.5">
                  {bulletinExtras.weak_points.slice(0, 3).map((w, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-600">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                  {bulletinExtras.weak_points.length > 3 && (
                    <li className="text-xs text-amber-900/60">+{bulletinExtras.weak_points.length - 3} autres</li>
                  )}
                </ul>
              </div>
            )}
            {/* Recommandations du bulletin (niveau global) */}
            {bulletinExtras?.recommendations && bulletinExtras.recommendations.length > 0 && (
              <div className="stone-bubble px-4 py-3 rounded-xl">
                <p className="text-xs text-amber-900/70 mb-1">Recommandations du bulletin</p>
                <ul className="text-sm text-amber-950 space-y-0.5">
                  {bulletinExtras.recommendations.slice(0, 3).map((r, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-600">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                  {bulletinExtras.recommendations.length > 3 && (
                    <li className="text-xs text-amber-900/60">+{bulletinExtras.recommendations.length - 3} autres</li>
                  )}
                </ul>
              </div>
            )}
            {/* Points de blocage identifiés */}
            {pointsBlocage.length > 0 && (
              <div className="stone-bubble px-4 py-3 rounded-xl">
                <p className="text-xs text-amber-900/70 mb-1">Points de blocage identifiés</p>
                <ul className="text-sm text-amber-950 space-y-0.5">
                  {pointsBlocage.slice(0, 3).map((p, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-rose-600">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                  {pointsBlocage.length > 3 && (
                    <li className="text-xs text-amber-900/60">+{pointsBlocage.length - 3} autres</li>
                  )}
                </ul>
              </div>
            )}

            {/* Chapitres */}
            {curriculum.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: neon.main }} />
                  Chapitres ({curriculum.filter(c => c.status === 'maitrise').length}/{curriculum.length})
                </h4>
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {curriculum.slice(0, 3).map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between text-sm py-0.5">
                      <span className="truncate text-white/80">{ch.chapter_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        ch.status === 'maitrise' ? 'bg-emerald-500/30 text-emerald-300' :
                        ch.status === 'vu_en_classe' ? 'bg-amber-500/30 text-amber-300' :
                        'bg-slate-500/30 text-slate-400'
                      }`}>
                        {ch.status === 'maitrise' ? '✓' : ch.status === 'vu_en_classe' ? '...' : '🔒'}
                      </span>
                    </div>
                  ))}
                  {curriculum.length > 3 && <p className="text-xs text-white/40">+{curriculum.length - 3} autres</p>}
                </div>
              </div>
            )}

            {!bulletinData && (
              <div className="stone-bubble px-4 py-3 rounded-xl text-center">
                <p className="text-sm text-amber-900/70">Aucune donnée de bulletin.</p>
                <p className="text-xs text-amber-900/50 mt-1">Ton parent peut uploader un bulletin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Zone actions */}
        <div className="px-6 pb-6 space-y-3">
          <div
            className="flex flex-col sm:flex-row gap-3 rounded-xl p-2"
            style={{
              background: '#1e272e',
              border: '1px solid rgba(72, 84, 96, 0.8)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {chapterToUse && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNewChat(chapterToUse);
                }}
                className="flex-1 py-2.5 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: neon.main,
                  color: status === 'danger' ? '#fff' : '#000',
                  boxShadow: `0 0 15px ${neon.glow}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Target className="w-4 h-4" />
                Voir le Gardien
              </button>
            )}
            <button
              onClick={onShowGrimoire}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Voir le Grimoire
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
