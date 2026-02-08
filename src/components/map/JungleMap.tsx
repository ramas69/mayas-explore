import { useState, useEffect } from 'react';
import { useCurriculumStore } from '../../stores/curriculumStore';
import { supabase } from '../../lib/supabase';
import { Compass, BookOpen, FileText, Pen } from 'lucide-react';
import type { Subject, Curriculum } from '../../types';
import type { BulletinAnalysis, BulletinSubjectStatus } from '../../types';
import { SUBJECT_ORDER } from '../../lib/programmeScolaire';
import { getSubjectsFromBulletin, findBulletinDataForSubject } from '../../lib/subjectMapping';
import { getGradeFromStatus } from '../../lib/bulletinUtils';
import { SubjectCardModal } from './SubjectCardModal';

interface JungleMapProps {
  studentId: string;
  /** Nouvelle conversation : crée session et ouvre chat */
  onSelectChapter: (chapter: Curriculum) => void;
  /** Historique des conversations pour une matière */
  onShowGrimoire?: (subject: Subject) => void;
}

// Icônes depuis public/icons_matieres/
const SUBJECT_ICON_PATHS: Record<Subject, string> = {
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

// Positions des régions sur la carte (en %) - bien espacées, à l'intérieur du container
const REGION_POSITIONS: Record<Subject, { top: string; left: string }> = {
  'Français': { top: '16%', left: '24%' },
  'Maths': { top: '14%', left: '52%' },
  'Histoire-Géo': { top: '16%', left: '82%' },
  'SVT': { top: '36%', left: '18%' },
  'Physique-Chimie': { top: '36%', left: '44%' },
  'Anglais': { top: '32%', left: '74%' },
  'Espagnol': { top: '56%', left: '20%' },
  'Théologie': { top: '52%', left: '54%' },
  'Arts': { top: '74%', left: '32%' },
  'EPS': { top: '66%', left: '78%' },
  'Musique': { top: '62%', left: '48%' },
  'Technologie': { top: '76%', left: '62%' },
};

export function JungleMap({ studentId, onSelectChapter, onShowGrimoire }: JungleMapProps) {
  const { curriculum, progress, isLoading } = useCurriculumStore();
  const [hoveredSubject, setHoveredSubject] = useState<Subject | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [bulletins, setBulletins] = useState<BulletinAnalysis[]>([]);

  useEffect(() => {
    if (!studentId) return;
    supabase
      .from('bulletin_analyses')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setBulletins((data as BulletinAnalysis[]) || []));
  }, [studentId]);

  const getChaptersBySubject = (subject: Subject) =>
    curriculum.filter(c => c.subject === subject).sort((a, b) => a.order_index - b.order_index);

  // Statut basé sur le bulletin (données analysées) pour correspondre aux bulletins de l'élève
  const getSubjectStatus = (subject: Subject): 'locked' | 'in_progress' | 'mastered' | 'danger' => {
    const bulletinData = getBulletinDataForSubject(subject);
    if (bulletinData?.status) {
      if (bulletinData.status === 'ok') return 'mastered';
      if (bulletinData.status === 'danger') return 'danger';
      if (['reviser', 'surveiller'].includes(bulletinData.status)) return 'in_progress';
    }
    // Fallback curriculum si pas de bulletin
    const chapters = getChaptersBySubject(subject);
    if (chapters.length === 0) return 'locked';
    const mastered = chapters.filter(c => c.status === 'maitrise').length;
    if (mastered === chapters.length) return 'mastered';
    if (chapters.some(c => c.status === 'vu_en_classe' || c.status === 'maitrise')) return 'in_progress';
    return 'locked';
  };

  // Données bulletin pour une matière (dernier bulletin), avec correspondance des noms
  const getBulletinDataForSubject = (subject: Subject) => {
    const latest = bulletins[0];
    if (!latest?.extracted_data?.subjects) return null;
    const found = findBulletinDataForSubject(latest.extracted_data.subjects as { name: string; status?: string }[], subject);
    return found ? { ...found, status: found.status as BulletinSubjectStatus | undefined } : null;
  };

  // Afficher les matières du bulletin analysé, ou fallback sur toutes si pas de bulletin
  const bulletinSubjects = getSubjectsFromBulletin(bulletins[0]?.extracted_data?.subjects);
  const subjectsToShow =
    bulletinSubjects.length > 0
      ? SUBJECT_ORDER.filter((s) => bulletinSubjects.includes(s))
      : SUBJECT_ORDER;

  // Afficher le loading uniquement quand on n'a pas encore de données
  if (isLoading && curriculum.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const SubjectCard = ({ subject, index }: { subject: Subject; index: number }) => {
    const status = getSubjectStatus(subject);
    const bulletinData = getBulletinDataForSubject(subject);
    const grade = bulletinData ? getGradeFromStatus(bulletinData.status) : null;
    const subjProgress = progress.bySubject[subject];
    return (
      <button
        key={subject}
        type="button"
        onClick={() => setSelectedSubject(subject)}
        onMouseEnter={() => setHoveredSubject(subject)}
        onMouseLeave={() => setHoveredSubject(null)}
        onTouchStart={() => setHoveredSubject(subject)}
        onTouchEnd={() => setTimeout(() => setHoveredSubject(null), 200)}
        className={`relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 text-left active:scale-[0.98] ${
          status === 'locked'
            ? 'bg-slate-800/80 border-slate-600/50 opacity-75'
            : status === 'danger'
            ? 'bg-rose-900/70 border-rose-500/60 shadow-rose-500/20 shadow-lg'
            : status === 'mastered'
            ? 'bg-emerald-900/70 border-emerald-500/60 shadow-emerald-500/20 shadow-lg'
            : 'bg-amber-900/70 border-amber-500/60 shadow-amber-500/20 shadow-lg'
        } ${status !== 'locked' ? 'card-border-light' : ''}`}
        style={status !== 'locked' ? { ['--border-light-duration' as string]: `${5 + (index % 5) * 1.5}s` } : undefined}
      >
        {status !== 'locked' && <div className="card-border-light-dot" aria-hidden />}
        {status === 'locked' && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-400/40 to-slate-600/30 pointer-events-none" />
        )}
        <img
          src={SUBJECT_ICON_PATHS[subject]}
          alt={subject}
          className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <span className="block font-bold text-amber-100 truncate">{subject}</span>
          {subjProgress && (
            <span className="text-sm text-amber-200/70">
              {subjProgress.completed} / {subjProgress.total} maîtrisés
            </span>
          )}
        </div>
        {grade != null && (
          <div className="gauge-maya w-16 flex-shrink-0">
            <div
              className="gauge-maya-fill"
              style={{ width: `${(grade / 20) * 100}%` }}
            />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-12rem)] md:min-h-[calc(100vh-6rem)] overflow-hidden rounded-xl sm:rounded-2xl border border-amber-500/20 touch-pan-y">
      {/* Carte de fond : jungle - MASQUÉE sur mobile */}
      <div
        className="hidden md:block absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(/feature-map.jpg)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-slate-900/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.4)_100%)]" />
      </div>

      {/* Chemins décoratifs - MASQUÉS sur mobile */}
      <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M 18% 18% Q 30% 12% 45% 14% Q 58% 16% 72% 20% M 18% 18% Q 12% 35% 12% 48% M 45% 14% Q 35% 35% 38% 55% M 72% 20% Q 70% 40% 72% 58% M 12% 48% Q 25% 65% 45% 62% M 38% 55% Q 50% 60% 78% 58%"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="3"
          strokeDasharray="8 4"
        />
      </svg>

      {/* Vue mobile : cartes en colonne / grille - fond uni sans map */}
      <div className="md:hidden flex flex-col h-full overflow-y-auto pb-2 bg-slate-900/50 rounded-xl">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-amber-600/40 mb-4 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-amber-200">Progression</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-amber-200/70 mt-1">
            {progress.completed} / {progress.total} temples conquis ({progress.percentage}%)
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 content-start">
          {subjectsToShow.length > 0 ? (
            subjectsToShow.map((subject, index) => (
              <SubjectCard key={subject} subject={subject} index={index} />
            ))
          ) : (
            <div className="col-span-2 p-6 text-center text-amber-100/60 text-sm">
              <Compass className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Analyse un bulletin pour voir tes matières ici.</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-amber-500/20 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-900/70 border border-rose-500" />
            <span className="text-[10px] text-amber-100/60">Danger</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-900/70 border border-amber-500" />
            <span className="text-[10px] text-amber-100/60">En cours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-900/70 border border-emerald-500" />
            <span className="text-[10px] text-amber-100/60">Maîtrisé</span>
          </div>
        </div>
      </div>

      {/* Vue desktop : carte avec régions en position absolue */}
      <div className="hidden md:block absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 pointer-events-auto">
      {subjectsToShow.map((subject, index) => {
        const pos = REGION_POSITIONS[subject];
        const status = getSubjectStatus(subject);
        const bulletinData = getBulletinDataForSubject(subject);
        const grade = bulletinData ? getGradeFromStatus(bulletinData.status) : null;
        const subjProgress = progress.bySubject[subject];
        const isHovered = hoveredSubject === subject;

        return (
          <div
            key={subject}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer group active:scale-95 min-w-[56px] min-h-[52px]"
            style={{ top: pos.top, left: pos.left, zIndex: isHovered ? 50 : 10 + index }}
            onMouseEnter={() => setHoveredSubject(subject)}
            onMouseLeave={() => setHoveredSubject(null)}
            onClick={() => setSelectedSubject(subject)}
            onTouchStart={() => setHoveredSubject(subject)}
            onTouchEnd={() => setTimeout(() => setHoveredSubject(null), 200)}
          >
            {/* Marqueur doré (badge maya) animé */}
            <div
              className={`absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full transition-all duration-300 ${
                status === 'locked' ? 'opacity-40' : 'opacity-100'
              } ${isHovered ? 'scale-125' : ''} ${status !== 'locked' ? 'badge-float badge-glow' : ''}`}
              style={{
                animationDelay: `${index * 0.32}s`,
                ['--badge-glow-duration' as string]: `${2.4 + (index % 5) * 0.7}s`,
                ['--badge-shimmer-duration' as string]: `${3.2 + (index % 7) * 0.5}s`,
              }}
            >
              <div className="relative badge-shimmer bg-transparent">
                <img
                  src="/step3-badge.png"
                  alt="Badge"
                  className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 object-contain drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]"
                />
              </div>
            </div>

            {/* Structure / Temple (région) */}
            <div
              className={`relative w-14 h-12 sm:w-20 sm:h-16 lg:w-24 lg:h-20 rounded-md sm:rounded-lg transition-all duration-300 ${status !== 'locked' ? 'card-border-light' : ''} ${
                status === 'locked'
                  ? 'bg-slate-800/80 border border-slate-600/50 shadow-xl'
                  : status === 'danger'
                  ? 'bg-rose-900/70 border-2 border-rose-500/60 shadow-rose-500/20 shadow-xl'
                  : status === 'mastered'
                  ? 'bg-emerald-900/70 border-2 border-emerald-500/60 shadow-emerald-500/20 shadow-xl'
                  : 'bg-amber-900/70 border-2 border-amber-500/60 shadow-amber-500/20 shadow-xl'
              } ${status === 'locked' ? 'opacity-60' : ''} ${isHovered ? 'scale-110 z-10' : ''}`}
              style={status !== 'locked' ? { ['--border-light-duration' as string]: `${5 + (index % 5) * 1.5}s` } : undefined}
            >
              {/* Point lumineux qui suit la bordure */}
              {status !== 'locked' && (
                <div className="card-border-light-dot" aria-hidden />
              )}
              {/* Brume pour locked */}
              {status === 'locked' && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-400/40 to-slate-600/30 pointer-events-none" />
              )}

              <div className="absolute inset-0 flex flex-col items-center justify-center p-1 sm:p-1.5 gap-0.5 overflow-hidden">
                <img
                  src={SUBJECT_ICON_PATHS[subject]}
                  alt={subject}
                  className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 object-contain flex-shrink-0"
                />
                <span className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-amber-100 truncate max-w-full px-0.5 text-center leading-tight">
                  {subject}
                </span>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-full">
                  {grade != null && (
                    <div className="gauge-maya w-full max-w-[48px] h-1">
                      <div
                        className="gauge-maya-fill"
                        style={{ width: `${(grade / 20) * 100}%` }}
                      />
                    </div>
                  )}
                  {subjProgress && (
                    <span className="text-[8px] sm:text-[9px] text-amber-200/50">
                      {subjProgress.completed}/{subjProgress.total}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
        </div>
      </div>

      {/* Progress bar (bottom-center) - desktop uniquement */}
      <div className="hidden md:block absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 sm:px-8">
        <div className="relative p-3 sm:p-4 rounded-lg sm:rounded-xl bg-slate-900/90 border-2 border-amber-600/40 shadow-2xl">
          <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300/50">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900" />
          </div>
          <div className="h-3 sm:h-4 bg-slate-800 rounded-full overflow-hidden mt-3 sm:mt-4">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-center text-xs sm:text-sm text-amber-200/80 mt-1.5 sm:mt-2">
            {progress.completed} / {progress.total} temples conquis ({progress.percentage}%)
          </p>
        </div>
      </div>

      {/* Menu icons (bottom-left) - desktop uniquement */}
      <div className="hidden md:flex absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex-row sm:flex-col gap-1.5 sm:gap-2">
        {[
          { icon: BookOpen, label: 'Journal' },
          { icon: FileText, label: 'Fichiers' },
          { icon: Pen, label: 'Notes' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 sm:gap-2 p-2 min-h-[40px] sm:min-h-[44px] rounded-lg bg-slate-900/80 border border-amber-500/20 hover:bg-amber-500/10 active:bg-amber-500/20 transition-colors cursor-pointer touch-manipulation"
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span className="text-[10px] sm:text-xs text-amber-100/80 hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      {/* Modal carte matière */}
      {selectedSubject && (
        <SubjectCardModal
          subject={selectedSubject}
          bulletinData={getBulletinDataForSubject(selectedSubject)}
          bulletinExtras={{
            weak_points: bulletins[0]?.extracted_data?.weak_points ?? [],
            recommendations: bulletins[0]?.extracted_data?.recommendations ?? [],
          }}
          curriculum={getChaptersBySubject(selectedSubject)}
          onClose={() => setSelectedSubject(null)}
          onNewChat={(chapter) => {
            setSelectedSubject(null);
            onSelectChapter(chapter);
          }}
          onShowGrimoire={() => {
            onShowGrimoire?.(selectedSubject);
          }}
        />
      )}

      {/* Légende - desktop uniquement */}
      <div className="hidden md:block absolute bottom-2 sm:bottom-4 right-2 sm:right-4 p-2 sm:p-3 rounded-lg bg-slate-900/80 border border-amber-500/20">
        <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-rose-900/70 border-2 border-rose-500" />
            <span className="text-amber-100/60">Danger</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-900/70 border-2 border-amber-500" />
            <span className="text-amber-100/60">En cours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-900/70 border-2 border-emerald-500" />
            <span className="text-amber-100/60">Maîtrisé</span>
          </div>
        </div>
      </div>
    </div>
  );
}
