import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCurriculumStore } from '../stores/curriculumStore';
import { useSandboxStore } from '../stores/sandboxStore';
import { supabase, getSessionById, saveCanvasSnapshot } from '../lib/supabase';
import { useSessionManager } from '../hooks/useSessionManager';
import type { Subject, Curriculum, Session, SchoolZone } from '../types';
import { ParticleEffects } from '../components/ParticleEffects';
import { ChatInterface } from '../components/chat/ChatInterface';
import { GrimoireModal } from '../components/map/GrimoireModal';
import { RewardModal } from '../components/rewards/RewardModal';
import { Compass, Map, MessageSquare, Trophy, FileText, Menu, X, Calendar, User, BookOpen, LogOut } from 'lucide-react';
import { ProfileEditor } from '../components/profile/ProfileEditor';
import { ProgrammePage } from '../components/programme/ProgrammePage';
import { StoneSelect } from '../components/ui/StoneSelect';
import { GrimoireViewer } from '../components/sandbox/GrimoireViewer';

// Lazy load heavy components
const JungleMap = lazy(() => import('../components/map/JungleMap').then(module => ({ default: module.JungleMap })));
const BulletinViewer = lazy(() => import('../components/bulletin/BulletinViewer').then(module => ({ default: module.BulletinViewer })));
const BulletinUploader = lazy(() => import('../components/bulletin/BulletinUploader').then(module => ({ default: module.BulletinUploader })));
const PlanningViewer = lazy(() => import('../components/planning/PlanningViewer').then(module => ({ default: module.PlanningViewer })));
const PlanningUploader = lazy(() => import('../components/planning/PlanningUploader').then(module => ({ default: module.PlanningUploader })));
const TempleViewer = lazy(() => import('../components/temple/TempleViewer').then(module => ({ default: module.TempleViewer })));

type StudentTab = 'map' | 'chat' | 'temple' | 'bulletin' | 'planning' | 'programme' | 'profil';

const StudentTabsWithIcons = [
  { id: 'map' as const, label: 'Carte', icon: Map },
  { id: 'chat' as const, label: 'Mentor', icon: MessageSquare },
  { id: 'temple' as const, label: 'Temple', icon: Trophy },
  { id: 'bulletin' as const, label: 'Bulletin', icon: FileText },
  { id: 'planning' as const, label: 'Planning', icon: Calendar },
  { id: 'programme' as const, label: 'Programme', icon: BookOpen },
  { id: 'profil' as const, label: 'Mon profil', icon: User },
];

const STUDENT_TABS: StudentTab[] = ['map', 'chat', 'temple', 'bulletin', 'planning', 'programme', 'profil'];

export function StudentApp() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const activeTab: StudentTab = STUDENT_TABS.includes(tab as StudentTab) ? (tab as StudentTab) : 'map';
  const { user, signOut } = useAuthStore();
  const { loadCurriculum, getChaptersBySubject } = useCurriculumStore();
  /* Refactored with useSessionManager */
  const { currentSessionId, setCurrentSessionId, selectedChapter, setSelectedChapter, startNewSession } = useSessionManager();

  // Restore State Variables
  const [grimoireSubject, setGrimoireSubject] = useState<Subject | null>(null);
  const [bulletinRefresh, setBulletinRefresh] = useState(0);
  const [planningRefresh, setPlanningRefresh] = useState(0);
  const [, setStudentZone] = useState<SchoolZone>('C');
  const [planningData, setPlanningData] = useState<{ city_zone?: SchoolZone; weekly_slots?: { file_url?: string } } | null>(null);

  useEffect(() => {
    if (user?.id) loadCurriculum(user.id);
  }, [user?.id, loadCurriculum]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('planning')
      .select('city_zone, weekly_slots')
      .eq('student_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPlanningData(data as typeof planningData);
          setStudentZone((data.city_zone as SchoolZone) || 'C');
        } else {
          setPlanningData(null);
        }
      });
  }, [user?.id, planningRefresh]);

  const handleZoneChange = async (zone: SchoolZone) => {
    setStudentZone(zone);
    if (!user?.id) return;

    // Persist change
    if (planningData) {
      await supabase.from('planning').update({ city_zone: zone }).eq('student_id', user.id);
    } else {
      // Create minimal planning record if none exists
      await supabase.from('planning').insert({ student_id: user.id, city_zone: zone });
    }

    setPlanningRefresh(p => p + 1);
  };

  const resetSandbox = useSandboxStore((s) => s.resetSandbox);
  const setElements = useSandboxStore((s) => s.setElements);
  const elements = useSandboxStore((s) => s.elements);

  useEffect(() => {
    resetSandbox();
    if (currentSessionId && currentSessionId !== 'demo-session') {
      getSessionById(currentSessionId).then(({ data }) => {
        const snap = (data as { canvas_snapshot?: { elements?: any[] } } | null)?.canvas_snapshot;
        if (snap?.elements) {
          setElements(snap.elements);
        }
      });
    }
  }, [currentSessionId, resetSandbox, setElements]);

  // Auto-save sandbox elements when they change
  useEffect(() => {
    if (!currentSessionId || currentSessionId === 'demo-session') return;
    const timeout = setTimeout(() => {
      if (elements.length > 0) {
        saveCanvasSnapshot(currentSessionId, { elements });
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [elements, currentSessionId]);

  const sessionId = currentSessionId ?? 'demo-session';

  const handleSelectGuardian = async (subject: Subject) => {
    setMenuOpen(false);
    const chapters = getChaptersBySubject(subject);
    // Find first unmastered chapter or default to the subject name
    const chapter = chapters.find((c) => c.status !== 'maitrise') ?? chapters[0];

    // If no chapter found (rare), we just pass the subject name as chapter name
    const chapterName = chapter?.chapter_name ?? subject;

    await startNewSession(subject, chapterName, chapter);
  };

  const handleNewChat = async (chapter: Curriculum) => {
    setMenuOpen(false);
    await startNewSession(chapter.subject, chapter.chapter_name, chapter);
  };

  const handleLoadSession = (session: Session) => {
    setMenuOpen(false);
    setCurrentSessionId(session.id);
    let chapter: Curriculum | null = null;
    if (session.subject && session.chapter) {
      const chapters = getChaptersBySubject(session.subject);
      const real = chapters.find((c) => c.chapter_name === session.chapter) ?? chapters[0];
      chapter = real ?? {
        id: `guardian-${session.subject}`,
        student_id: user?.id ?? '',
        subject: session.subject,
        chapter_name: session.chapter,
        source: 'manual' as const,
        status: 'pas_vu' as const,
        order_index: 0,
        created_at: '',
        updated_at: '',
      };
    }
    setSelectedChapter(chapter);
    setGrimoireSubject(null);
    navigate('/app/chat');
  };

  const setActiveTab = (id: StudentTab) => {
    navigate(`/app/${id}`);
    setMenuOpen(false);
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = StudentTabsWithIcons;

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <ParticleEffects />

      {/* Header */}
      <header className="nav-glass py-3 px-4 sm:py-4 sm:px-6 flex items-center justify-between z-[100] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Menu hamburger - mobile uniquement */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-amber-400 hover:bg-amber-500/20 rounded-xl transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg rotate-45 shrink-0">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900 -rotate-45" />
          </div>
          <span className="font-['Cinzel_Decorative'] text-base sm:text-xl font-bold text-amber-400 truncate">
            MAYA EXPLORER
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <span className="text-amber-100/60 text-xs sm:text-sm hidden sm:block truncate max-w-[120px] lg:max-w-none">
            {user?.full_name}
          </span>
          <button
            onClick={async () => {
              console.log('[StudentApp] SignOut clicked');
              try {
                await signOut();
                console.log('[StudentApp] SignOut completed, navigating...');
                navigate('/auth', { replace: true });
              } catch (e) {
                console.error('[StudentApp] SignOut error:', e);
                alert("Erreur lors de la déconnexion");
              }
            }}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-amber-100/60 hover:text-amber-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Menu mobile - overlay */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[55] bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-[60] w-72 max-w-[85vw] bg-slate-900/98 backdrop-blur-xl border-r border-amber-500/20 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
              <span className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-400">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-amber-100/60 hover:text-amber-400 rounded-lg"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="p-4 space-y-1 overflow-y-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[48px] ${activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-amber-100/60 hover:bg-amber-500/10 hover:text-amber-300'
                      }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - caché sur mobile (remplacé par bottom nav) */}
        <aside className="hidden md:flex w-20 lg:w-64 bg-slate-900/80 border-r border-amber-500/20 flex-col shrink-0">
          <nav className="flex-1 p-2 lg:p-4 space-y-1 lg:space-y-2 overflow-y-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 lg:gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-all min-h-[44px] ${activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-amber-100/60 hover:bg-amber-500/10 hover:text-amber-300'
                    }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="hidden lg:block font-medium truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className={`flex-1 p-4 sm:p-6 min-h-0 flex flex-col ${activeTab === 'chat' ? 'overflow-hidden' : 'overflow-auto'}`}>
          {activeTab === 'map' && (
            <div className="min-h-[calc(100vh-8rem)] md:min-h-full w-full">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-amber-200">Chargement de la carte...</div>}>
                <JungleMap
                  studentId={user?.id || ''}
                  onSelectChapter={handleNewChat}
                  onShowGrimoire={(subject) => setGrimoireSubject(subject)}
                />
              </Suspense>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex-1 min-h-0 h-full flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden">
              <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
                <ChatInterface
                  sessionId={sessionId}
                  studentId={user?.id || ''}
                  classe={user?.classe ?? null}
                  selectedChapter={selectedChapter}
                  onSelectGuardian={handleSelectGuardian}
                />
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <GrimoireViewer />
              </div>
            </div>
          )}

          {activeTab === 'temple' && (
            <div className="h-full max-w-4xl mx-auto">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-amber-200">Chargement du temple...</div>}>
                <TempleViewer />
              </Suspense>
            </div>
          )}

          {activeTab === 'bulletin' && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              <h2 className="font-['Cinzel_Decorative'] text-xl sm:text-2xl font-bold text-amber-100 mb-4 sm:mb-6">
                Mes bulletins
              </h2>
              <p className="text-amber-100/60 text-sm">
                Ajoute ton bulletin : l&apos;IA l&apos;analyse et identifie tes zones prioritaires. Tu peux aussi le faire depuis la Configuration parent.
              </p>
              <Suspense fallback={<div className="text-amber-200">Chargement...</div>}>
                <BulletinUploader
                  studentId={user?.id || ''}
                  onAnalysisComplete={() => setBulletinRefresh((x) => x + 1)}
                  onStartRevisions={() => navigate('/app/planning')}
                />
                <BulletinViewer
                  studentId={user?.id || ''}
                  refreshTrigger={bulletinRefresh}
                  onGeneratePlanning={() => navigate('/app/planning')}
                />
              </Suspense>
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="max-w-4xl mx-auto w-full">
              <h2 className="font-['Cinzel_Decorative'] text-xl sm:text-2xl font-bold text-amber-100 mb-4 sm:mb-6">
                Mon planning
              </h2>
              <Suspense fallback={<div className="text-amber-200">Chargement du planning...</div>}>
                <div className="space-y-8">
                  <div className="stone-card p-6 rounded-2xl bg-amber-950/20 border border-amber-500/20">
                    <h3 className="text-lg font-bold text-amber-100 mb-4 flex items-center gap-2">
                      Créer mon planning de révisions
                    </h3>
                    <div className="mb-6 max-w-xs">
                      <label className="block text-amber-100/80 text-sm mb-2">Ma zone scolaire</label>
                      <StoneSelect
                        value={(planningData?.city_zone as SchoolZone) || 'C'}
                        onValueChange={(val) => handleZoneChange(val as SchoolZone)}
                        options={[
                          { value: 'A', label: 'Zone A (Lyon, Bordeaux...)' },
                          { value: 'B', label: 'Zone B (Marseille, Lille...)' },
                          { value: 'C', label: 'Zone C (Paris, Toulouse...)' },
                        ]}
                        placeholder="Choisir une zone"
                      />
                    </div>

                    <p className="text-sm text-amber-100/70 mb-4">
                      Upload ton emploi du temps scolaire (PDF/Image). L'IA va l'analyser et y insérer intelligemment tes séances de révision basées sur ton bulletin.
                    </p>
                    <PlanningUploader
                      studentId={user?.id || ''}
                      cityZone={(planningData?.city_zone as SchoolZone) || 'C'}
                      onUploadComplete={() => {
                        setPlanningRefresh(p => p + 1);
                        navigate('/app/planning');
                      }}
                    />
                  </div>

                  <PlanningViewer studentId={user?.id || ''} refreshTrigger={planningRefresh} />
                </div>
              </Suspense>
            </div>
          )}

          {activeTab === 'programme' && <ProgrammePage />}

          {activeTab === 'profil' && (
            <div className="max-w-4xl mx-auto">
              <ProfileEditor />
            </div>
          )}
        </main>
      </div>

      {/* Bottom Nav - Mobile uniquement */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[50] bg-slate-900/98 backdrop-blur-xl border-t-2 border-amber-500/30 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around py-2 px-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] min-w-[44px] flex-shrink-0 px-2 py-2 rounded-xl transition-all touch-manipulation ${activeTab === tab.id
                  ? 'text-amber-400 bg-amber-500/20'
                  : 'text-amber-100/60 active:bg-amber-500/10'
                  }`}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className="text-[10px] font-medium truncate max-w-[64px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <RewardModal />

      {grimoireSubject && (
        <GrimoireModal
          subject={grimoireSubject}
          studentId={user?.id ?? ''}
          onClose={() => setGrimoireSubject(null)}
          onLoadSession={handleLoadSession}
        />
      )}
    </div>
  );
}
