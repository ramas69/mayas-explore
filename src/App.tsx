import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuthStore } from './stores/authStore';
import { useCurriculumStore } from './stores/curriculumStore';
import { useSandboxStore } from './stores/sandboxStore';
import { supabase, startSession, getProfile, calculateDailyUsage, getSessionById, saveCanvasSnapshot } from './lib/supabase';
import type { Subject, Curriculum, Session, SchoolZone } from './types';
import { ParticleEffects } from './components/ParticleEffects';
import { Navigation } from './sections/Navigation';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Method } from './sections/Method';
import { Subjects } from './sections/Subjects';
import { Features } from './sections/Features';
import { Testimonials } from './sections/Testimonials';
import { CTA } from './sections/CTA';
import { Footer } from './sections/Footer';
import { NotFound } from './pages/NotFound';
import { ParentConfig } from './pages/ParentConfig';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ChatInterface } from './components/chat/ChatInterface';

const ExcalidrawSandbox = lazy(() =>
  import('./components/sandbox/ExcalidrawSandbox').then((m) => ({ default: m.ExcalidrawSandbox }))
);
import { JungleMap } from './components/map/JungleMap';
import { GrimoireModal } from './components/map/GrimoireModal';
import { ParentDashboard } from './components/dashboard/ParentDashboard';
import { BulletinViewer } from './components/bulletin/BulletinViewer';
import { BulletinUploader } from './components/bulletin/BulletinUploader';
import { PlanningViewer } from './components/planning/PlanningViewer';
import { RewardModal } from './components/rewards/RewardModal';
import { TempleViewer } from './components/temple/TempleViewer';
import { Compass, Map, MessageSquare, Trophy, FileText, LogOut, LayoutDashboard, Settings, Menu, X, Calendar, User, BookOpen } from 'lucide-react';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const StudentTabsWithIcons = [
  { id: 'map' as const, label: 'Carte', icon: Map },
  { id: 'chat' as const, label: 'Mentor', icon: MessageSquare },
  { id: 'temple' as const, label: 'Temple', icon: Trophy },
  { id: 'bulletin' as const, label: 'Bulletin', icon: FileText },
  { id: 'planning' as const, label: 'Planning', icon: Calendar },
  { id: 'programme' as const, label: 'Programme', icon: BookOpen },
  { id: 'profil' as const, label: 'Mon profil', icon: User },
];
import { ProfileEditor } from './components/profile/ProfileEditor';
import { ParentProfileEditor } from './components/profile/ParentProfileEditor';
import { ProgrammePage } from './components/programme/ProgrammePage';
import { ParentProgramme } from './components/programme/ParentProgramme';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { AuthCallback } from './pages/AuthCallback';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

// Landing Page Component
function LandingPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  // Utilisateur connecté : redirection vers son espace
  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  return (
    <>
      <Navigation />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <Method />
        <Subjects />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

// Auth Page Component
function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(mode !== 'inscription');
  const { user, isAuthenticated } = useAuthStore();

  // Sync with URL when mode changes
  useEffect(() => {
    setIsLogin(mode !== 'inscription');
  }, [mode]);

  const handleToggleMode = (toLogin: boolean) => {
    navigate(toLogin ? '/auth' : '/auth?mode=inscription', { replace: true });
    setIsLogin(toLogin);
  };

  if (isAuthenticated && user) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <ParticleEffects />
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.jpg"
          alt="Temple Maya"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-transparent to-slate-900/70" />
      </div>
      {/* God Rays */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent transform -rotate-12 blur-3xl" />
        <div className="absolute top-0 left-1/2 w-24 h-full bg-gradient-to-b from-amber-300/10 via-transparent to-transparent transform rotate-6 blur-3xl" />
        <div className="absolute top-0 right-1/3 w-40 h-full bg-gradient-to-b from-amber-500/10 via-transparent to-transparent transform -rotate-6 blur-3xl" />
      </div>
      {/* Light Spot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-[80px] pointer-events-none z-[2]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-300/15 rounded-full blur-[60px] animate-pulse pointer-events-none z-[2]" />
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {isLogin ? (
          <LoginForm onToggleMode={() => handleToggleMode(false)} />
        ) : (
          <RegisterForm onToggleMode={() => handleToggleMode(true)} />
        )}
      </div>
    </div>
  );
}

type StudentTab = 'map' | 'chat' | 'temple' | 'bulletin' | 'planning' | 'programme' | 'profil';
const STUDENT_TABS: StudentTab[] = ['map', 'chat', 'temple', 'bulletin', 'planning', 'programme', 'profil'];

// Student App Layout
function StudentApp() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const activeTab: StudentTab = STUDENT_TABS.includes(tab as StudentTab) ? (tab as StudentTab) : 'map';
  const { user, signOut } = useAuthStore();
  const { loadCurriculum, getChaptersBySubject } = useCurriculumStore();
  const [selectedChapter, setSelectedChapter] = useState<Curriculum | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [grimoireSubject, setGrimoireSubject] = useState<Subject | null>(null);
  const [canvasInitialData, setCanvasInitialData] = useState<{ elements: unknown[]; appState?: Record<string, unknown> } | null>(null);
  const [canvasForSessionId, setCanvasForSessionId] = useState<string | null>(null);
  const [bulletinRefresh, setBulletinRefresh] = useState(0);
  const [planningRefresh] = useState(0);
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

  const resetSandbox = useSandboxStore((s) => s.resetSandbox);

  useEffect(() => {
    resetSandbox();
    if (currentSessionId && currentSessionId !== 'demo-session') {
      setCanvasForSessionId(null);
      getSessionById(currentSessionId).then(({ data }) => {
        const snap = (data as { canvas_snapshot?: { elements?: unknown[]; appState?: Record<string, unknown> } } | null)?.canvas_snapshot;
        const payload = snap?.elements?.length ? { elements: snap.elements, appState: snap.appState } : null;
        setCanvasInitialData(payload);
        setCanvasForSessionId(currentSessionId);
      });
    } else {
      setCanvasInitialData(null);
      setCanvasForSessionId(null);
    }
  }, [currentSessionId, resetSandbox]);

  const initialDataForSession =
    canvasForSessionId === currentSessionId ? canvasInitialData : null;

  const sessionId = currentSessionId ?? 'demo-session';

  const handleSelectGuardian = async (subject: Subject) => {
    if (!user?.id) return;
    setMenuOpen(false);
    // Basculer vers le chat immédiatement pour un retour visuel
    navigate('/app/chat');
    const { data: profile } = await getProfile(user.id);
    const limit = (profile as { daily_time_limit?: number } | null)?.daily_time_limit ?? 120;
    const dailyUsed = await calculateDailyUsage(user.id);
    if (dailyUsed >= limit) {
      alert('Limite journalière atteinte. Reviens demain, explorateur ! 🌅');
      return;
    }
    const chapters = getChaptersBySubject(subject);
    const chapter = chapters.find((c) => c.status !== 'maitrise') ?? chapters[0] ?? {
      id: `guardian-${subject}`,
      student_id: user.id,
      subject,
      chapter_name: subject,
      source: 'manual' as const,
      status: 'pas_vu' as const,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: session, error } = await startSession(user.id, subject, chapter.chapter_name);
    if (error) {
      console.error('[App] startSession error:', error);
      alert('Impossible de démarrer la session. Réessaie.');
      return;
    }
    if (session) {
      setCurrentSessionId(session.id);
      setSelectedChapter(chapter);
    }
  };

  const handleNewChat = async (chapter: Curriculum) => {
    if (!user?.id) return;
    setMenuOpen(false);
    // Basculer vers le chat immédiatement pour un retour visuel
    navigate('/app/chat');
    const { data: profile } = await getProfile(user.id);
    const limit = (profile as { daily_time_limit?: number } | null)?.daily_time_limit ?? 120;
    const dailyUsed = await calculateDailyUsage(user.id);
    if (dailyUsed >= limit) {
      alert('Limite journalière atteinte. Reviens demain, explorateur ! 🌅');
      return;
    }
    const { data: session, error } = await startSession(user.id, chapter.subject, chapter.chapter_name);
    if (error) {
      console.error('[App] startSession error:', error);
      alert('Impossible de démarrer la session. Réessaie.');
      return;
    }
    if (session) {
      setCurrentSessionId(session.id);
      setSelectedChapter(chapter);
    }
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
      <header className="nav-glass py-3 px-4 sm:py-4 sm:px-6 flex items-center justify-between z-50 shrink-0">
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
              await signOut();
              navigate('/auth', { replace: true });
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[48px] ${
                      activeTab === tab.id
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
                  className={`w-full flex items-center gap-2 lg:gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-all min-h-[44px] ${
                    activeTab === tab.id
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
              <JungleMap 
                studentId={user?.id || ''} 
                onSelectChapter={handleNewChat}
                onShowGrimoire={(subject) => setGrimoireSubject(subject)}
              />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden">
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
                <Suspense
                  fallback={
                    <div className="flex-1 flex items-center justify-center rounded-xl bg-slate-800/50 border border-amber-500/20">
                      <span className="text-amber-200/70 animate-pulse">Chargement du Grimoire…</span>
                    </div>
                  }
                >
                  <ExcalidrawSandbox
                    key={`${sessionId}-${initialDataForSession ? 'ready' : 'loading'}`}
                    sessionId={sessionId}
                    initialData={initialDataForSession ?? undefined}
                    onSaveSnapshot={(snapshot) => {
                      if (sessionId && sessionId !== 'demo-session') {
                        saveCanvasSnapshot(sessionId, snapshot);
                      }
                    }}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {activeTab === 'temple' && (
            <div className="h-full max-w-4xl mx-auto">
              <TempleViewer />
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
              <BulletinUploader
                studentId={user?.id || ''}
                onAnalysisComplete={() => setBulletinRefresh((x) => x + 1)}
              />
              <BulletinViewer studentId={user?.id || ''} refreshTrigger={bulletinRefresh} />
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="max-w-4xl mx-auto w-full">
              <h2 className="font-['Cinzel_Decorative'] text-xl sm:text-2xl font-bold text-amber-100 mb-4 sm:mb-6">
                Mon planning
              </h2>
              <PlanningViewer studentId={user?.id || ''} />
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
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] min-w-[44px] flex-shrink-0 px-2 py-2 rounded-xl transition-all touch-manipulation ${
                  activeTab === tab.id
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

type ParentTab = 'dashboard' | 'config' | 'programme' | 'profil';
const PARENT_TABS: ParentTab[] = ['dashboard', 'config', 'programme', 'profil'];

// Parent Dashboard Layout
function ParentApp() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const activeTab: ParentTab = PARENT_TABS.includes(tab as ParentTab) ? (tab as ParentTab) : 'dashboard';
  const { signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const parentTabs = [
    { id: 'dashboard' as const, label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'config' as const, label: 'Configuration', icon: Settings },
    { id: 'programme' as const, label: 'Programme', icon: BookOpen },
    { id: 'profil' as const, label: 'Mon profil', icon: User },
  ];

  const closeSidebar = () => setSidebarOpen(false);
  const selectTab = (id: ParentTab) => {
    navigate(`/parent/${id}`);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex">
      <ParticleEffects />

      {/* Overlay mobile (clic ferme le sidebar) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar latéral - burger sur mobile, toujours visible sur desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-amber-500/20 flex flex-col transform transition-transform duration-300 ease-out
          lg:static lg:translate-x-0 lg:bg-slate-900/80
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 flex items-center justify-between lg:justify-start border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg rotate-45 shrink-0">
              <LayoutDashboard className="w-6 h-6 text-slate-900 -rotate-45" />
            </div>
            <span className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-400 truncate">
              Parent
            </span>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 text-amber-100/60 hover:text-amber-400 rounded-lg"
            aria-label="Fermer le menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {parentTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
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

        <div className="p-4 border-t border-amber-500/20">
          <button
            onClick={async () => {
              await signOut();
              navigate('/auth', { replace: true });
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-amber-100/60 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header compact (burger sur mobile + titre) */}
        <header className="nav-glass py-3 px-4 lg:px-6 flex items-center gap-3 shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden p-2 text-amber-100/60 hover:text-amber-400 rounded-lg shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-['Cinzel_Decorative'] text-lg lg:text-xl font-bold text-amber-400 truncate">
            {activeTab === 'dashboard' && 'Tableau de bord'}
            {activeTab === 'config' && 'Configuration'}
            {activeTab === 'programme' && 'Programme'}
            {activeTab === 'profil' && 'Mon profil'}
          </h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {activeTab === 'dashboard' && <ParentDashboard onNavigateToConfig={() => selectTab('config')} />}
          {activeTab === 'config' && <ParentConfig />}
          {activeTab === 'programme' && <ParentProgramme />}
          {activeTab === 'profil' && <ParentProfileEditor />}
        </main>
      </div>
    </div>
  );
}

// Redirection selon le rôle de l'utilisateur
function getRedirectForRole(role: string): string {
  switch (role) {
    case 'super_admin': return '/admin';
    case 'parent': return '/parent/dashboard';
    case 'enfant': return '/app/map';
    default: return '/auth';
  }
}

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading, isAuthenticated } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

// Main App Component
function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();

    // Configure GSAP
    gsap.config({ nullTargetWarn: false });
    ScrollTrigger.refresh();

    // Handle reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      gsap.globalTimeline.timeScale(0);
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
          <p className="text-amber-100/60">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/app" element={<Navigate to="/app/map" replace />} />
        <Route 
          path="/app/:tab" 
          element={
            <ProtectedRoute allowedRoles={['enfant']}>
              <StudentApp />
            </ProtectedRoute>
          } 
        />
        <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
        <Route 
          path="/parent/:tab" 
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ParentApp />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
