import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  getAdminStats,
  getAdminSources,
  getParentsWithChildren,
  upsertAdminSource,
  deleteAdminSource,
  getProgrammeCollegeGlobal,
  getChildStatus,
  getChildStats,
  type AdminSource,
} from '../lib/adminApi';
import { scrapeProgrammeViaPerplexity } from '../lib/perplexityProgramme';
import {
  Shield,
  Users,
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Square,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Upload,
  FileText,
  UserCheck,
  TrendingUp,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ParticleEffects } from '../components/ParticleEffects';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scraping' | 'programme' | 'utilisateurs'>('dashboard');
  const [selectedChild, setSelectedChild] = useState<{ id: string; full_name?: string; email: string } | null>(null);
  const [childStats, setChildStats] = useState<any>(null);
  const [childStatsLoading, setChildStatsLoading] = useState(false);
  const [programmeClasseTab, setProgrammeClasseTab] = useState<string>('6ème');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [parentsWithChildren, setParentsWithChildren] = useState<any[]>([]);
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [programmeCount, setProgrammeCount] = useState<Record<string, number>>({});
  const [programmeScrapeDates, setProgrammeScrapeDates] = useState<Record<string, string>>({});
  const [programmeChapters, setProgrammeChapters] = useState<{ classe: string; subject: string; chapter_name: string; description: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeLog, setScrapeLog] = useState<string[]>([]);
  const [newSource, setNewSource] = useState({ name: '', url: '', type: 'programme_api' as AdminSource['type'] });
  const [showAddSource, setShowAddSource] = useState(false);
  const [scrapeClasse, setScrapeClasse] = useState<string>('Toutes');
  const [scrapeSubject, setScrapeSubject] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const CLASSES_OPTIONS = [
    { value: 'Toutes', label: 'Toutes les classes' },
    { value: '6ème', label: '6ème' },
    { value: '5ème', label: '5ème' },
    { value: '4ème', label: '4ème' },
    { value: '3ème', label: '3ème' },
  ];

  const [scrapeSubjectCustom, setScrapeSubjectCustom] = useState<string>('');

  const SUBJECT_OPTIONS = [
    { value: '', label: 'Toutes les matières' },
    { value: 'Maths', label: 'Maths' },
    { value: 'Français', label: 'Français' },
    { value: 'Histoire-Géo', label: 'Histoire-Géo' },
    { value: 'SVT', label: 'SVT' },
    { value: 'Physique-Chimie', label: 'Physique-Chimie' },
    { value: 'Technologie', label: 'Technologie' },
    { value: 'Anglais', label: 'Anglais' },
    { value: 'Espagnol', label: 'Espagnol' },
    { value: 'Chinois', label: 'Chinois' },
    { value: 'Arts', label: 'Arts' },
    { value: 'EPS', label: 'EPS' },
  ];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, parentsRes, sourcesRes, programmeRes] = await Promise.all([
        getAdminStats(),
        getParentsWithChildren(),
        getAdminSources(),
        getProgrammeCollegeGlobal(),
      ]);
      setStats(statsRes);
      setParentsWithChildren(parentsRes.data || []);

      setSources(sourcesRes.data || []);

      const byClasse: Record<string, number> = {};
      const scrapeDates: Record<string, string> = {};
      const chapters = (programmeRes.data || []) as { classe: string; subject: string; chapter_name: string; description: string | null; updated_at?: string }[];
      chapters.forEach((p: any) => {
        byClasse[p.classe] = (byClasse[p.classe] || 0) + 1;
        if (p.updated_at) {
          const prev = scrapeDates[p.classe];
          if (!prev || p.updated_at > prev) scrapeDates[p.classe] = p.updated_at;
        }
      });
      setProgrammeCount(byClasse);
      setProgrammeScrapeDates(scrapeDates);
      setProgrammeChapters(chapters);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScrapeProgramme = async (classeOverride?: string, subjectOverride?: string | null) => {
    const targetClasse = classeOverride ?? scrapeClasse;
    const subjectParam = subjectOverride !== undefined
      ? (subjectOverride || null)
      : (scrapeSubjectCustom.trim() || scrapeSubject.trim() || null);
    setIsScraping(true);
    setScrapeLog([]);
    abortControllerRef.current = new AbortController();
    const log = (msg: string) => setScrapeLog((prev) => [...prev, msg]);
    try {
      const cycles: ('Cycle 3' | 'Cycle 4')[] = targetClasse === 'Toutes'
        ? ['Cycle 3', 'Cycle 4']
        : targetClasse === '6ème'
          ? ['Cycle 3']
          : ['Cycle 4'];
      log(`Récupération via Perplexity (${targetClasse}${subjectParam ? `, ${subjectParam}` : ''})...`);
      const { chapters, error } = await scrapeProgrammeViaPerplexity(
        cycles,
        targetClasse === 'Toutes' ? null : targetClasse,
        subjectParam,
        abortControllerRef.current.signal
      );
      if (error || !chapters?.length) {
        log(error || 'Aucune donnée reçue de Perplexity.');
        setIsScraping(false);
        return;
      }
      const toFilter = targetClasse === 'Toutes' ? chapters : chapters.filter((c) => c.classe === targetClasse);
      if (subjectParam) {
        const filtered = toFilter.filter((c) => c.subject.toLowerCase() === subjectParam.toLowerCase());
        toFilter.length = 0;
        toFilter.push(...filtered);
      }
      log(`${toFilter.length} chapitres reçus.`);
      if (targetClasse === 'Toutes') {
        log('Suppression des anciens chapitres...');
        await supabase.from('programme_college_global').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } else if (subjectParam) {
        log(`Suppression ${subjectParam} pour ${targetClasse}...`);
        const { data: toDelete } = await supabase.from('programme_college_global').select('id, subject').eq('classe', targetClasse);
        const ids = (toDelete || []).filter((r: any) => String(r.subject || '').toLowerCase() === subjectParam.toLowerCase()).map((r: any) => r.id);
        if (ids.length > 0) await supabase.from('programme_college_global').delete().in('id', ids);
      } else {
        log(`Suppression des anciens chapitres ${targetClasse}...`);
        await supabase.from('programme_college_global').delete().eq('classe', targetClasse);
      }
      const toInsert = toFilter.map((c, i) => ({
        classe: c.classe,
        subject: subjectParam || c.subject,
        chapter_name: c.chapter_name,
        description: c.description,
        order_index: i,
      }));
      log(`Insertion de ${toInsert.length} chapitres...`);
      const { error: upsertErr } = await supabase.from('programme_college_global').insert(toInsert);
      if (upsertErr) log(`Erreur: ${upsertErr.message}`);
      else {
        log('Import terminé avec succès.');
        loadData();
      }
    } catch (e) {
      log(`Erreur: ${(e as Error).message}`);
    }
    setIsScraping(false);
  };

  const handleStopScraping = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setScrapeLog((prev) => [...prev, 'Scraping annulé.']);
    }
  };

  const handleAddSource = async () => {
    if (!newSource.name.trim()) return;
    await upsertAdminSource({ name: newSource.name.trim(), url: newSource.url.trim() || null, type: newSource.type, is_active: true });
    setNewSource({ name: '', url: '', type: 'programme_api' });
    setShowAddSource(false);
    loadData();
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Supprimer cette source ?')) return;
    await deleteAdminSource(id);
    loadData();
  };

  const handleDeleteAllSources = async () => {
    if (!confirm('Supprimer toutes les sources ?')) return;
    for (const s of sources) {
      await deleteAdminSource(s.id);
    }
    loadData();
  };

  const closeSidebar = () => setSidebarOpen(false);
  const selectTab = (id: 'dashboard' | 'scraping' | 'programme' | 'utilisateurs') => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const loadChildStats = async (child: { id: string; full_name?: string; email: string }) => {
    setSelectedChild(child);
    setChildStatsLoading(true);
    setChildStats(null);
    const stats = await getChildStats(child.id);
    setChildStats(stats);
    setChildStatsLoading(false);
  };

  const adminTabs = [
    { id: 'dashboard' as const, label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'utilisateurs' as const, label: 'Utilisateurs', icon: UserCheck },
    { id: 'scraping' as const, label: 'Scraping', icon: Upload },
    { id: 'programme' as const, label: 'Programme', icon: BookOpen },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <ParticleEffects />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - comme le parent */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-amber-500/20 flex flex-col transform transition-transform duration-300 ease-out
          lg:static lg:translate-x-0 lg:bg-slate-900/80
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 flex items-center justify-between lg:justify-start border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-500 to-rose-600 rounded-lg rotate-45 shrink-0">
              <Shield className="w-6 h-6 text-white -rotate-45" />
            </div>
            <span className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-400 truncate">
              Super Admin
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
          {adminTabs.map((tab) => {
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
          <div className="flex items-center gap-2 px-4 py-2 text-amber-100/60 text-sm truncate">
            {user?.email}
          </div>
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
        <header className="nav-glass py-3 px-4 lg:px-6 flex items-center gap-3 shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden p-2 text-amber-100/60 hover:text-amber-400 rounded-lg shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-['Cinzel_Decorative'] text-lg lg:text-xl font-bold text-amber-400 truncate">
            {activeTab === 'dashboard' ? 'Tableau de bord' : activeTab === 'scraping' ? 'Scraping' : activeTab === 'utilisateurs' ? 'Utilisateurs' : 'Programme'}
          </h1>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats : Parents, Enfants, Programmes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 stone-card rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-amber-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-sm text-amber-100/60">Parents</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-100">{stats?.parents || 0}</p>
                </div>
                <div className="p-6 stone-card rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-sm text-amber-100/60">Enfants</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-100">{stats?.enfants || 0}</p>
                </div>
                <div className="p-6 stone-card rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-cyan-500/20 rounded-lg">
                      <BookOpen className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-sm text-amber-100/60">Programmes</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-100">
                    {Object.values(programmeCount).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-xs text-amber-100/50 mt-1">
                    {Object.entries(programmeCount)
                      .map(([c, n]) => `${c}: ${n}`)
                      .join(' • ') || '—'}
                  </p>
                </div>
              </div>

              {/* Parents et leurs enfants */}
              <div className="p-6 stone-card rounded-2xl border border-amber-500/20">
                <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Parents et leurs enfants
                </h2>
                <div className="space-y-3">
                  {parentsWithChildren.map((parent) => (
                    <div
                      key={parent.id}
                      className="p-4 bg-slate-900/50 rounded-xl border border-amber-500/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-amber-500/20 rounded-lg">
                          <Users className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-amber-100">{parent.full_name || parent.email}</p>
                          <p className="text-sm text-amber-100/50">{parent.email}</p>
                        </div>
                        <span className="ml-auto text-sm text-amber-400 font-medium">
                          {parent.children?.length || 0} enfant(s)
                        </span>
                      </div>
                      {parent.children?.length > 0 && (
                        <div className="mt-3 pl-6 space-y-2">
                          {parent.children.map((child: any) => (
                            <div className="flex items-center gap-2 text-sm text-amber-100/80" key={child.id}>
                              <ChevronRight className="w-4 h-4 text-amber-500/50" />
                              <span>{child.full_name || 'Sans nom'}</span>
                              <span className="text-amber-100/50">—</span>
                              <span className="text-amber-100/50">{child.email}</span>
                              {child.classe && (
                                <span className="px-2 py-0.5 bg-amber-500/10 rounded text-amber-400 text-xs">{child.classe}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {parentsWithChildren.length === 0 && (
                    <p className="text-center text-amber-100/50 py-8">Aucun parent inscrit</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'utilisateurs' && (
            <div className="space-y-6">
              <div className="p-6 stone-card rounded-2xl border border-amber-500/20">
                <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  Liste des utilisateurs
                </h2>
                <div className="space-y-4">
                  {parentsWithChildren.map((parent) => (
                    <div key={parent.id} className="p-4 bg-slate-900/50 rounded-xl border border-amber-500/10">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center bg-amber-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium text-amber-100">{parent.full_name || parent.email}</p>
                            <p className="text-sm text-amber-100/50">{parent.email}</p>
                          </div>
                        </div>
                        <span className="text-xs text-amber-100/50">
                          Inscrit le {new Date(parent.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      {parent.children?.length > 0 && (
                        <div className="mt-3 pl-6 space-y-2">
                          {parent.children.map((child: any) => (
                            <button
                              key={child.id}
                              onClick={() => loadChildStats(child)}
                              className="w-full flex items-center justify-between gap-2 text-sm text-amber-100/80 hover:bg-amber-500/10 rounded-lg p-2 -mx-2 text-left transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className="w-4 h-4 text-amber-500/50" />
                                <span>{child.full_name || 'Sans nom'}</span>
                                <span className="text-amber-100/50">—</span>
                                <span className="text-amber-100/50 text-xs">{child.email}</span>
                                {child.classe && (
                                  <span className="px-2 py-0.5 bg-amber-500/10 rounded text-amber-400 text-xs">{child.classe}</span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                getChildStatus(child) === 'Inscrit' ? 'bg-emerald-500/20 text-emerald-400' :
                                getChildStatus(child) === 'En attente d\'approbation parent' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-slate-500/20 text-amber-100/60'
                              }`}>
                                {getChildStatus(child)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {parentsWithChildren.length === 0 && (
                    <p className="text-center text-amber-100/50 py-8">Aucun utilisateur</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedChild && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedChild(null)}>
              <div className="stone-card rounded-2xl border border-amber-500/20 p-6 max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100">
                    {selectedChild.full_name || selectedChild.email}
                  </h3>
                  <button onClick={() => setSelectedChild(null)} className="p-2 text-amber-100/60 hover:text-amber-400 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {childStatsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>
                ) : childStats ? (
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="p-4 bg-amber-500/10 rounded-xl flex-1">
                        <p className="text-xs text-amber-100/60">XP total</p>
                        <p className="text-2xl font-bold text-amber-400">{childStats.totalXP}</p>
                      </div>
                      <div className="p-4 bg-amber-500/10 rounded-xl flex-1">
                        <p className="text-xs text-amber-100/60">Rang</p>
                        <p className="text-lg font-bold text-amber-400">{childStats.rank}</p>
                      </div>
                      <div className="p-4 bg-amber-500/10 rounded-xl flex-1">
                        <p className="text-xs text-amber-100/60">Sessions</p>
                        <p className="text-2xl font-bold text-amber-400">{childStats.sessionsCount}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-200 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Évolution XP
                      </h4>
                      {childStats.xpEvolution.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-auto">
                          {(() => {
                            const slice = childStats.xpEvolution.slice(-14);
                            const maxXp = Math.max(...slice.map((x: { xp: number }) => x.xp), 1);
                            return slice.map((d: { date: string; xp: number }, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-amber-100/60 w-24">{new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full transition-all"
                                    style={{ width: `${(d.xp / maxXp) * 100}%` }}
                                  />
                                </div>
                                <span className="text-amber-400 font-medium w-12">{d.xp} XP</span>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <p className="text-amber-100/50 text-sm">Aucune session encore</p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-200 mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Matières préférées
                      </h4>
                      {childStats.favoriteSubjects?.length > 0 ? (
                        <div className="space-y-2">
                          {childStats.favoriteSubjects.map(([subj, data]: [string, { count: number; xp: number }]) => (
                            <div key={subj} className="flex items-center justify-between text-sm">
                              <span className="text-amber-100/90">{subj}</span>
                              <span className="text-amber-400">{data.xp} XP · {data.count} session(s)</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-amber-100/50 text-sm">Aucune pratique enregistrée</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-amber-100/50">Erreur chargement</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'scraping' && (
            <div className="space-y-6">
              <div className="p-6 stone-card rounded-2xl border border-amber-500/20">
                <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-amber-400" />
                  Scraping du programme
                </h2>

                {Object.keys(programmeCount).length > 0 ? (
                  <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-sm font-medium text-emerald-400 mb-3">Derniers imports</p>
                    <div className="space-y-2">
                      {['6ème', '5ème', '4ème', '3ème'].map((classe) => {
                        const count = programmeCount[classe] || 0;
                        const date = programmeScrapeDates[classe];
                        if (count === 0) return null;
                        return (
                          <div key={classe} className="flex items-center justify-between text-sm text-amber-100/80">
                            <span className="font-medium">{classe}</span>
                            <span>{count} chapitres</span>
                            <span className="text-amber-100/50">
                              {date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="mb-6 text-amber-100/50 text-sm">Aucun import pour le moment. Lance un scraping ci-dessous.</p>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <label htmlFor="scrape-classe" className="text-sm text-amber-100/70">Classe :</label>
                    <select
                      id="scrape-classe"
                      value={scrapeClasse}
                      onChange={(e) => setScrapeClasse(e.target.value)}
                      className="px-4 py-2 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                    >
                      {CLASSES_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="scrape-subject" className="text-sm text-amber-100/70">Matière :</label>
                    <select
                      id="scrape-subject"
                      value={scrapeSubject}
                      onChange={(e) => { setScrapeSubject(e.target.value); setScrapeSubjectCustom(''); }}
                      className="px-4 py-2 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                    >
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="scrape-subject-custom" className="text-sm text-amber-100/70">Ou autre :</label>
                    <input
                      id="scrape-subject-custom"
                      type="text"
                      placeholder="Ex: Technologie, Chinois..."
                      value={scrapeSubjectCustom}
                      onChange={(e) => { setScrapeSubjectCustom(e.target.value); setScrapeSubject(''); }}
                      className="px-4 py-2 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 w-48"
                    />
                  </div>
                  <button
                    onClick={() => handleScrapeProgramme()}
                    disabled={isScraping || (Boolean(scrapeSubject || scrapeSubjectCustom) && scrapeClasse === 'Toutes')}
                    title={(scrapeSubject || scrapeSubjectCustom) && scrapeClasse === 'Toutes' ? 'Choisir une classe pour scraper une matière' : ''}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all"
                  >
                    {isScraping ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    Scraper (Perplexity)
                  </button>
                  {isScraping && (
                    <button
                      onClick={handleStopScraping}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500/30 text-rose-300 rounded-xl hover:bg-rose-500/50 transition-all"
                    >
                      <Square className="w-5 h-5" />
                      Arrêter
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddSource(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter une source
                  </button>
                  {sources.length > 0 && (
                    <button
                      onClick={handleDeleteAllSources}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/30 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                      Supprimer toutes les sources
                    </button>
                  )}
                </div>

                {showAddSource && (
                  <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-amber-500/20">
                    <h3 className="font-medium text-amber-100 mb-3">Nouvelle source</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Nom de la source"
                        value={newSource.name}
                        onChange={(e) => setNewSource((s) => ({ ...s, name: e.target.value }))}
                        className="flex-1 px-4 py-2 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                      />
                      <input
                        type="url"
                        placeholder="URL"
                        value={newSource.url}
                        onChange={(e) => setNewSource((s) => ({ ...s, url: e.target.value }))}
                        className="flex-1 px-4 py-2 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                      />
                      <select
                        value={newSource.type}
                        onChange={(e) => setNewSource((s) => ({ ...s, type: e.target.value as AdminSource['type'] }))}
                        className="px-4 py-2 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                      >
                        <option value="programme_api">API Programme</option>
                        <option value="programme_scrape">Scrape PDF</option>
                      </select>
                      <button onClick={handleAddSource} className="px-4 py-2 bg-amber-500 text-slate-900 font-semibold rounded-xl">
                        Ajouter
                      </button>
                      <button onClick={() => setShowAddSource(false)} className="px-4 py-2 text-amber-100/60 hover:text-amber-400">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {sources.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-amber-500/10">
                      <div>
                        <p className="font-medium text-amber-100">{s.name}</p>
                        <p className="text-sm text-amber-100/50">{s.type} • {s.url || '—'}</p>
                      </div>
                      <button onClick={() => handleDeleteSource(s.id)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {scrapeLog.length > 0 && (
                  <div className="mt-4 p-4 bg-slate-900/80 rounded-xl font-mono text-sm text-amber-100/80 space-y-1">
                    {scrapeLog.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'programme' && (
            <div className="space-y-6">
              <div className="p-6 stone-card rounded-2xl border border-amber-500/20">
                <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Programme par classe
                </h2>

                <div className="flex flex-wrap gap-2 mb-6">
                  {['6ème', '5ème', '4ème', '3ème'].map((classe) => {
                    const count = programmeCount[classe] || 0;
                    const isActive = programmeClasseTab === classe;
                    return (
                      <div key={classe} className="flex items-center gap-1">
                        <button
                          onClick={() => setProgrammeClasseTab(classe)}
                          className={`px-4 py-2 rounded-xl font-medium transition-all shrink-0 ${
                            isActive
                              ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50'
                              : 'bg-slate-900/50 text-amber-100/60 hover:bg-amber-500/10'
                          }`}
                        >
                          {classe} {count > 0 && <span className="text-xs opacity-70">({count})</span>}
                        </button>
                        <button
                          onClick={() => handleScrapeProgramme(classe, null)}
                          disabled={isScraping}
                          title={`Mettre à jour la ${classe}`}
                          className="p-2 rounded-lg text-amber-400/70 hover:bg-amber-500/20 hover:text-amber-400 disabled:opacity-50 transition-all"
                        >
                          {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {programmeChapters.length > 0 ? (
                  <div className="space-y-6">
                    {['6ème', '5ème', '4ème', '3ème']
                      .filter((c) => c === programmeClasseTab)
                      .map((classe) => {
                        const items = programmeChapters.filter((p) => p.classe === classe);
                        if (!items.length) {
                          return (
                            <p key={classe} className="text-amber-100/50 py-8">
                              Aucun chapitre importé pour la {classe}. Lance un scraping dans l'onglet Scraping.
                            </p>
                          );
                        }
                        const bySubject = items.reduce((acc, p) => {
                          if (!acc[p.subject]) acc[p.subject] = [];
                          acc[p.subject].push(p);
                          return acc;
                        }, {} as Record<string, typeof items>);
                        const subjectOrder = ['Maths', 'Français', 'Histoire-Géo', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Arts', 'EPS'];
                        const orderedSubjects = [...subjectOrder.filter((s) => bySubject[s]), ...Object.keys(bySubject).filter((s) => !subjectOrder.includes(s))];
                        return (
                          <div key={classe}>
                            <h3 className="font-semibold text-amber-300 mb-4">{classe}</h3>
                            <div className="space-y-4">
                              {orderedSubjects.map((subject) => (
                                <div key={subject}>
                                  <p className="text-sm font-medium text-amber-200/90 mb-2">{subject}</p>
                                  <ul className="ml-4 space-y-1.5 text-sm text-amber-100/80">
                                    {bySubject[subject].map((c, i) => (
                                      <li key={i} className="flex flex-col">
                                        <span>• {c.chapter_name}</span>
                                        {c.description && <span className="text-amber-100/50 text-xs ml-4">{c.description}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-amber-100/50 py-8">
                    Aucun programme importé. Va dans l'onglet Scraping pour lancer un import.
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
