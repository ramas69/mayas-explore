import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getPendingChildApprovals } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { WeeklyProgramTable } from '../planning/WeeklyProgramTable';
import { StoneSelect } from '../ui/StoneSelect';
import {
  Users,
  UserPlus,
  Clock,
  TrendingUp,
  BookOpen,
  CheckCircle,
  Calendar,
  MessageSquare,
  X,
  Loader2,
  FileText,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import type { Profile, Session, Curriculum, SchoolZone } from '../../types';
import type { BulletinAnalysis } from '../../types';

interface ChildWithData {
  profile: Profile;
  sessions: Session[];
  curriculum: Curriculum[];
  bulletins: BulletinAnalysis[];
  planning: {
    city_zone: SchoolZone;
    weekly_slots: {
      slots?: { day: number; startTime: string; endTime: string }[];
      vacation_slots?: { day: number; startTime: string; endTime: string }[];
    };
  } | null;
  totalXP: number;
  dailyMinutes: number;
}

interface ParentDashboardProps {
  onNavigateToConfig?: () => void;
}

export function ParentDashboard({ onNavigateToConfig }: ParentDashboardProps) {
  const { user, inviteChildAccount, approveChild, error, clearError } = useAuthStore();
  const [children, setChildren] = useState<ChildWithData[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [addChildEmail, setAddChildEmail] = useState('');
  const [addChildName, setAddChildName] = useState('');
  const [addChildClasse, setAddChildClasse] = useState<string>('');
  const [isAddingChild, setIsAddingChild] = useState(false);

  const CLASSES = ['6ème', '5ème', '4ème', '3ème'] as const;

  useEffect(() => {
    if (user) {
      loadChildrenData();
    }
  }, [user]);

  const loadChildrenData = async () => {
    setIsLoading(true);

    // Demandes en attente (parent_id = moi, is_approved = false)
    const { data: pending } = await getPendingChildApprovals(user?.id || '');
    setPendingApprovals(pending || []);

    // Enfants déjà approuvés
    const { data: childrenProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', user?.id)
      .eq('role', 'enfant')
      .eq('is_approved', true);

    if (!childrenProfiles || childrenProfiles.length === 0) {
      setChildren([]);
      setSelectedChild(null);
      setIsLoading(false);
      return;
    }

    // Load data for each child
    const childrenData: ChildWithData[] = [];

    for (const child of childrenProfiles) {
      // Get sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', child.id)
        .order('created_at', { ascending: false })
        .limit(30);

      // Get curriculum
      const { data: curriculum } = await supabase
        .from('curriculum')
        .select('*')
        .eq('student_id', child.id);

      // Get gamification
      const { data: gamification } = await supabase
        .from('gamification')
        .select('*')
        .eq('student_id', child.id)
        .single();

      // Get bulletins (dernier bulletin = analyse des matières)
      const { data: bulletins } = await supabase
        .from('bulletin_analyses')
        .select('*')
        .eq('student_id', child.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get planning (emploi du temps + créneaux IA)
      const { data: planning } = await supabase
        .from('planning')
        .select('city_zone, weekly_slots')
        .eq('student_id', child.id)
        .maybeSingle();

      // Calculate daily minutes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySessions = (sessions || []).filter(s => {
        const sessionDate = new Date(s.start_at);
        return sessionDate >= today;
      });
      const dailyMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

      childrenData.push({
        profile: child,
        sessions: sessions || [],
        curriculum: curriculum || [],
        bulletins: (bulletins || []) as BulletinAnalysis[],
        planning: planning as ChildWithData['planning'],
        totalXP: gamification?.xp || 0,
        dailyMinutes,
      });
    }

    setChildren(childrenData);
    if (childrenData.length > 0 && !selectedChild) {
      setSelectedChild(childrenData[0].profile.id);
    }
    setIsLoading(false);
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsAddingChild(true);
    const err = await inviteChildAccount(addChildEmail, addChildName, addChildClasse || undefined);
    setIsAddingChild(false);
    if (!err?.error) {
      setShowAddChild(false);
      setAddChildEmail('');
      setAddChildName('');
      setAddChildClasse('');
      loadChildrenData();
    }
  };

  const handleApproveChild = async (childId: string) => {
    clearError();
    await approveChild(childId);
    loadChildrenData();
  };

  const selectedChildData = children.find(c => c.profile.id === selectedChild);

  const getProgressStats = (curriculum: Curriculum[]) => {
    const total = curriculum.length;
    const completed = curriculum.filter(c => c.status === 'maitrise').length;
    const inProgress = curriculum.filter(c => c.status === 'vu_en_classe').length;
    return { total, completed, inProgress, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'danger': return 'Danger';
      case 'surveiller': return 'À surveiller';
      case 'reviser': return 'À réviser';
      default: return 'OK';
    }
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'danger': return 'text-rose-400 bg-rose-500/10 border border-rose-500/30';
      case 'surveiller': return 'text-orange-400 bg-orange-500/10 border border-orange-500/30';
      case 'reviser': return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
      default: return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30';
    }
  };

  const getWeeklyStats = (sessions: Session[]) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekSessions = sessions.filter(s => new Date(s.start_at) >= weekAgo);
    const totalMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalXP = weekSessions.reduce((sum, s) => sum + (s.xp_earned || 0), 0);
    
    return { sessionsCount: weekSessions.length, totalMinutes, totalXP };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (children.length === 0 && pendingApprovals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-amber-500/20 rounded-full">
            <Users className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="font-['Cinzel_Decorative'] text-xl text-amber-100 mb-2">
            Aucun explorateur lié
          </h3>
          <p className="text-amber-100/60 max-w-md mx-auto mb-8">
            Ajoute un enfant pour commencer à suivre sa progression dans l'aventure Maya Explorer.
          </p>
          <button
            onClick={() => setShowAddChild(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Ajouter un enfant
          </button>
        </div>

        {/* Modal Ajouter un enfant */}
        {showAddChild && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="w-full max-w-md p-8 stone-card rounded-2xl relative">
              <button
                onClick={() => {
                  setShowAddChild(false);
                  clearError();
                }}
                className="absolute top-4 right-4 text-amber-100/60 hover:text-amber-400"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-6">
                Ajouter un explorateur
              </h3>
              {error && (
                <div className="mb-4 stone-alert-error">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <form onSubmit={handleAddChild} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-amber-100/80 mb-2">Prénom</label>
                  <input
                    type="text"
                    value={addChildName}
                    onChange={(e) => setAddChildName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                    placeholder="Prénom de l'enfant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-amber-100/80 mb-2">Classe (collège)</label>
                  <StoneSelect
                    value={addChildClasse}
                    onValueChange={setAddChildClasse}
                    options={CLASSES.map((c) => ({ value: c, label: c }))}
                    placeholder="Choisir la classe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-amber-100/80 mb-2">Email</label>
                  <input
                    type="email"
                    value={addChildEmail}
                    onChange={(e) => setAddChildEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                    placeholder="enfant@email.com"
                    required
                  />
                </div>
                <p className="text-amber-100/50 text-xs">
                  L'enfant recevra un email pour créer son mot de passe. En cas d'oubli : mot de passe oublié.
                </p>
                <button
                  type="submit"
                  disabled={isAddingChild}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingChild ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer le compte'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demandes en attente */}
      {pendingApprovals.length > 0 && (
        <div className="p-6 stone-card rounded-xl border-amber-500/30">
          <h3 className="font-bold text-amber-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Demandes en attente
          </h3>
          <p className="text-sm text-amber-100/60 mb-4">
            Ces explorateurs souhaitent rejoindre ton expédition. Valide leur inscription.
          </p>
          <div className="space-y-3">
            {pendingApprovals.map((child) => (
              <div
                key={child.id}
                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-amber-100">
                    {child.full_name || 'Sans nom'}
                    {(child as Profile & { classe?: string }).classe && (
                      <span className="ml-2 text-amber-100/70 font-normal">({(child as Profile & { classe?: string }).classe})</span>
                    )}
                  </p>
                  <p className="text-sm text-amber-100/60">{child.email}</p>
                </div>
                <button
                  onClick={() => handleApproveChild(child.id)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Valider
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-['Cinzel_Decorative'] text-2xl font-bold text-amber-100">
          Tableau de Bord Superviseur
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddChild(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Ajouter un enfant
          </button>
          {children.map((child) => (
            <button
              key={child.profile.id}
              onClick={() => setSelectedChild(child.profile.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                selectedChild === child.profile.id
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-amber-100/60 hover:bg-slate-700'
              }`}
            >
              {child.profile.full_name || 'Explorateur'}
              {(child.profile as Profile & { classe?: string }).classe && (
                <span className="ml-1.5 text-sm opacity-90">({(child.profile as Profile & { classe?: string }).classe})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedChildData && (
        <>
          {/* 1. Stats Grid - en premier */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Daily Time */}
            <div className="p-6 stone-card rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-amber-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-sm text-amber-100/60">Temps aujourd'hui</span>
              </div>
              <p className="text-2xl font-bold text-amber-100">
                {selectedChildData.dailyMinutes} <span className="text-sm font-normal">min</span>
              </p>
              <p className="text-xs text-amber-100/50 mt-1">
                Limite: 120 min/jour
              </p>
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min((selectedChildData.dailyMinutes / 120) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Total XP */}
            <div className="p-6 stone-card rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm text-amber-100/60">XP Total</span>
              </div>
              <p className="text-2xl font-bold text-golden">
                {selectedChildData.totalXP.toLocaleString()}
              </p>
              <p className="text-xs text-amber-100/50 mt-1">
                {getWeeklyStats(selectedChildData.sessions).totalXP} XP cette semaine
              </p>
            </div>

            {/* Progress */}
            <div className="p-6 stone-card rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-cyan-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-sm text-amber-100/60">Progression</span>
              </div>
              <p className="text-2xl font-bold text-amber-100">
                {getProgressStats(selectedChildData.curriculum).percentage}%
              </p>
              <p className="text-xs text-amber-100/50 mt-1">
                {getProgressStats(selectedChildData.curriculum).completed} chapitres maîtrisés
              </p>
            </div>

            {/* Weekly Sessions */}
            <div className="p-6 stone-card rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-rose-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-rose-400" />
                </div>
                <span className="text-sm text-amber-100/60">Cette semaine</span>
              </div>
              <p className="text-2xl font-bold text-amber-100">
                {getWeeklyStats(selectedChildData.sessions).sessionsCount}
              </p>
              <p className="text-xs text-amber-100/50 mt-1">
                {getWeeklyStats(selectedChildData.sessions).totalMinutes} min de révision
              </p>
            </div>
          </div>

          {/* 2. Dernier bulletin - Zones prioritaires */}
          {selectedChildData.bulletins.length === 0 && (
            <div className="p-6 stone-card rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-amber-500/20 rounded-xl">
                  <FileText className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-100">Aucun bulletin configuré</h3>
                  <p className="text-sm text-amber-100/60 mt-1">
                    Va dans Configuration pour uploader un bulletin et voir les zones prioritaires.
                  </p>
                  {onNavigateToConfig && (
                    <button
                      onClick={onNavigateToConfig}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 text-sm font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      Aller à la Configuration
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {selectedChildData.bulletins.length > 0 && (
            <div className="p-6 stone-card rounded-2xl border border-amber-500/20 overflow-hidden">
              {/* Header style page d'accueil */}
              <span className="inline-block px-4 py-2 mb-3 text-xs font-medium text-amber-400/80 tracking-widest uppercase border border-amber-500/30 rounded-full">
                Dernier bulletin
                {(selectedChildData.bulletins[0] as BulletinAnalysis & { semester?: string }).semester && (
                  <> ({(selectedChildData.bulletins[0] as BulletinAnalysis & { semester?: string }).semester?.replace(/(\d{4})-S(\d)/, 'Sem. $2')})</>
                )}
              </span>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 flex items-center gap-2">
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                    <FileText className="w-5 h-5 text-slate-900" />
                  </div>
                  Zones prioritaires
                </h3>
                <span className="text-sm text-amber-100/50 tracking-wider">
                  Configurer bulletins, planning et priorités dans l'onglet Configuration
                </span>
              </div>
              {/* Badges style page d'accueil (pills comme Hero/Subjects) - matières prioritaires en premier */}
              <div className="flex flex-wrap gap-2">
                {[...(selectedChildData.bulletins[0].extracted_data?.subjects || [])]
                  .sort((a: any, b: any) => {
                    const getOrder = (s: any) => {
                      const st = s.status ?? (s.priority === 'high' ? 'danger' : s.priority === 'medium' ? 'reviser' : 'ok');
                      return st === 'danger' ? 0 : st === 'surveiller' ? 1 : st === 'reviser' ? 2 : 3;
                    };
                    return getOrder(a) - getOrder(b);
                  })
                  .map((s: any, i: number) => {
                  const status = s.status ?? (s.priority === 'high' ? 'danger' : s.priority === 'medium' ? 'reviser' : 'ok') as string;
                  const isPriority = status === 'danger' || status === 'surveiller';
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${getStatusClass(status)} ${isPriority ? 'shadow-sm' : ''}`}
                    >
                      {isPriority && <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{s.name}:</span>
                      <span className="font-semibold">{getStatusLabel(status)}</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-sm text-amber-100/50 mt-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-amber-400 rounded-full" />
                Moyenne: {selectedChildData.bulletins[0].extracted_data?.overall_average ?? '-'}/20
                {' • '}
                {((selectedChildData.bulletins[0].extracted_data?.subjects || []).filter((s: any) => {
                  const st = s.status ?? (s.priority === 'high' ? 'danger' : s.priority === 'medium' ? 'reviser' : 'ok');
                  return st === 'danger' || st === 'surveiller';
                }).length)} matière(s) à prioriser
              </p>
            </div>
          )}

          {/* Programme de la semaine - tableau identique à la Configuration */}
          <WeeklyProgramTable
            weeklySlots={selectedChildData.planning?.weekly_slots ?? {}}
            bulletinSubjects={(selectedChildData.bulletins[0]?.extracted_data?.subjects ?? []) as { name: string; status?: string }[]}
            city_zone={selectedChildData.planning?.city_zone ?? null}
            onNavigateToConfig={onNavigateToConfig}
          />

          {/* Progress by Subject */}
          <div className="p-6 stone-card rounded-xl">
            <h3 className="font-bold text-amber-100 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Progression par Matière
            </h3>
            <div className="space-y-4">
              {Array.from(new Set(selectedChildData.curriculum.map(c => c.subject))).map((subject) => {
                const subjectChapters = selectedChildData.curriculum.filter(c => c.subject === subject);
                const completed = subjectChapters.filter(c => c.status === 'maitrise').length;
                const percentage = subjectChapters.length > 0 ? Math.round((completed / subjectChapters.length) * 100) : 0;

                return (
                  <div key={subject}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-amber-100">{subject}</span>
                      <span className="text-sm text-amber-100/60">{completed}/{subjectChapters.length}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-6 stone-card rounded-xl">
            <h3 className="font-bold text-amber-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Activité Récente
            </h3>
            <div className="space-y-3">
              {selectedChildData.sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-amber-100">{session.subject || 'Session'}</p>
                    <p className="text-xs text-amber-100/50">
                      {new Date(session.start_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-100">{session.duration_minutes} min</p>
                    <p className="text-xs text-emerald-400">+{session.xp_earned} XP</p>
                  </div>
                </div>
              ))}
              {selectedChildData.sessions.length === 0 && (
                <p className="text-center text-amber-100/50 py-4">
                  Aucune session récente
                </p>
              )}
            </div>
          </div>

          {/* Add Note */}
          <div className="p-6 stone-card rounded-xl">
            <h3 className="font-bold text-amber-100 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Ajouter une Note ou Objectif
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ex: Focus sur les fractions cette semaine..."
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50"
              />
              <button
                onClick={async () => {
                  if (!newNote.trim()) return;
                  await supabase.from('parent_notes').insert({
                    parent_id: user?.id,
                    student_id: selectedChild,
                    content: newNote,
                  });
                  setNewNote('');
                }}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                Ajouter
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Ajouter un enfant (quand parent a déjà des enfants) */}
      {showAddChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 stone-card rounded-2xl relative">
            <button
              onClick={() => {
                setShowAddChild(false);
                clearError();
              }}
              className="absolute top-4 right-4 text-amber-100/60 hover:text-amber-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-6">
              Ajouter un explorateur
            </h3>
            {error && (
              <div className="mb-4 stone-alert-error">
                <p className="text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-2">Prénom</label>
                <input
                  type="text"
                  value={addChildName}
                  onChange={(e) => setAddChildName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                  placeholder="Prénom de l'enfant"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-2">Email</label>
                <input
                  type="email"
                  value={addChildEmail}
                  onChange={(e) => setAddChildEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                  placeholder="enfant@email.com"
                  required
                />
              </div>
              <p className="text-amber-100/50 text-xs">
                L'enfant recevra un email pour créer son mot de passe. En cas d'oubli : mot de passe oublié.
              </p>
              <button
                type="submit"
                disabled={isAddingChild}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAddingChild ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer l\'invitation'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
