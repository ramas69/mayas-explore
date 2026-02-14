import { useState, useEffect } from 'react';
import { supabase, getPendingChildApprovals, linkPendingChildrenToParent } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { BulletinUploader } from '../components/bulletin/BulletinUploader';
import { BulletinViewer } from '../components/bulletin/BulletinViewer';
import { PlanningUploader } from '../components/planning/PlanningUploader';
import { PlanningViewer } from '../components/planning/PlanningViewer';
import {
  Users,
  UserPlus,
  Mail,
  Link2,
  FileText,
  Calendar,
  Target,
  CheckCircle,
  BookOpen,
  Reply,
} from 'lucide-react';
import { PageLoading } from '../components/ui/PageLoading';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StoneSelect } from '../components/ui/StoneSelect';
import type { Profile, Subject, SchoolZone } from '../types';

interface ChildProfile extends Profile {
  curriculum?: { subject: Subject }[];
}

const SCHOOL_ZONES: { value: SchoolZone; label: string }[] = [
  { value: 'A', label: 'Zone A (Besançon, Bordeaux, Clermont...)' },
  { value: 'B', label: 'Zone B (Aix-Marseille, Amiens, Caen...)' },
  { value: 'C', label: 'Zone C (Créteil, Montpellier, Paris, Versailles...)' },
];

const CLASSES = ['6ème', '5ème', '4ème', '3ème'] as const;

export function ParentConfig() {
  const { user, inviteChildAccount, resendInviteChildAccount, approveChild, error, clearError } = useAuthStore();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Section: Gestion enfant
  const [addChildMode, setAddChildMode] = useState<'invite' | 'link'>('invite');
  const [childEmail, setChildEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [childClasse, setChildClasse] = useState<string>('');
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Section: Planning & calendrier
  const [childZone, setChildZone] = useState<SchoolZone>('C');
  const [planningData, setPlanningData] = useState<{
    id: string;
    city_zone: SchoolZone;
    weekly_slots: { file_url?: string; file_type?: string; slots?: { day: number; startTime: string; endTime: string; subject?: string }[] };
  } | null>(null);
  const [planningRefresh, setPlanningRefresh] = useState(0);

  // Section: Injecteur priorité
  const [prioritySubject, setPrioritySubject] = useState<Subject | ''>('');
  const [priorityNote, setPriorityNote] = useState('');
  const [isSavingPriority, setIsSavingPriority] = useState(false);
  const [bulletinsRefresh, setBulletinsRefresh] = useState(0);
  const [configSubTab, setConfigSubTab] = useState<'enfants' | 'scolarite' | 'planning'>('enfants');
  const [showClasseConfirm, setShowClasseConfirm] = useState(false);
  const [pendingClasse, setPendingClasse] = useState<{ childId: string; value: string } | null>(null);
  const [showZoneConfirm, setShowZoneConfirm] = useState(false);
  const [pendingZone, setPendingZone] = useState<SchoolZone | null>(null);

  useEffect(() => {
    if (user) loadChildrenData();
  }, [user]);

  useEffect(() => {
    if (selectedChild) loadPlanningData();
  }, [selectedChild, planningRefresh]);

  const loadPlanningData = async () => {
    if (!selectedChild) return;
    const { data } = await supabase
      .from('planning')
      .select('id, city_zone, weekly_slots')
      .eq('student_id', selectedChild)
      .maybeSingle();
    if (data) {
      setPlanningData(data as typeof planningData);
      setChildZone((data.city_zone as SchoolZone) || 'C');
    } else {
      setPlanningData(null);
    }
  };

  const loadChildrenData = async () => {
    setIsLoading(true);

    // Lier les enfants qui viennent de s'inscrire (parent_email = mon email) — même si parent déjà connecté
    if (user?.id && user?.email) {
      await linkPendingChildrenToParent(user.id, user.email);
    }

    const { data: pending } = await getPendingChildApprovals(user?.id || '');
    setPendingApprovals(pending || []);

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

    setChildren(childrenProfiles as ChildProfile[]);
    if (!selectedChild) setSelectedChild(childrenProfiles[0].id);
    setIsLoading(false);
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsAddingChild(true);
    setInviteSent(false);

    if (addChildMode === 'invite') {
      const err = await inviteChildAccount(childEmail, childName || 'Explorateur', childClasse || undefined);
      if (!err?.error) {
        setInviteSent(true);
        setChildEmail('');
        setChildName('');
        setChildClasse('');
        loadChildrenData();
      }
    } else {
      // Rattacher: rechercher enfant par email et lier (nécessite RLS: parent peut lire si parent_email = son email)
      const emailNorm = childEmail.trim().toLowerCase();
      const { data: childProfile } = await supabase
        .from('profiles')
        .select('id, parent_email')
        .eq('role', 'enfant')
        .ilike('email', emailNorm)
        .maybeSingle();

      const parentEmailNorm = user?.email?.trim().toLowerCase();
      if (childProfile && parentEmailNorm && childProfile.parent_email?.trim().toLowerCase() === parentEmailNorm) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ parent_id: user?.id, parent_email: null })
          .eq('id', childProfile.id);
        if (!updateErr) {
          loadChildrenData();
          setChildEmail('');
        } else setInviteSent(false);
      } else {
        useAuthStore.setState({ error: 'Aucun enfant trouvé avec cet email. Il doit s\'inscrire en indiquant ton email.' });
      }
    }
    setIsAddingChild(false);
  };


  const handleConfirmZoneChange = async () => {
    if (!selectedChild || !pendingZone) return;
    await supabase
      .from('planning')
      .upsert(
        { student_id: selectedChild, city_zone: pendingZone, weekly_slots: planningData?.weekly_slots ?? { file_url: null, file_type: null, slots: [] } },
        { onConflict: 'student_id' }
      );
    setChildZone(pendingZone);
    setPendingZone(null);
    setShowZoneConfirm(false);
    setPlanningRefresh((x) => x + 1);
  };

  const handleConfirmClasseChange = async () => {
    if (!pendingClasse) return;
    await supabase
      .from('profiles')
      .update({ classe: pendingClasse.value || null })
      .eq('id', pendingClasse.childId);
    setPendingClasse(null);
    setShowClasseConfirm(false);
    loadChildrenData();
  };

  const handleSavePriority = async () => {
    if (!selectedChild || !prioritySubject) return;
    setIsSavingPriority(true);
    try {
      await supabase.from('parent_notes').insert({
        parent_id: user?.id,
        student_id: selectedChild,
        content: priorityNote || `Priorité: traiter ${prioritySubject} en priorité.`,
        objective: `inject_priority:${prioritySubject}`,
      });
      setPrioritySubject('');
      setPriorityNote('');
    } catch (_) { }
    setIsSavingPriority(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[300px]">
        <PageLoading message="Chargement de la configuration..." />
      </div>
    );
  }

  const selectedChildProfile = children.find((c) => c.id === selectedChild);

  const configSubTabs = [
    { id: 'enfants' as const, label: 'Explorateurs', icon: Users },
    { id: 'scolarite' as const, label: 'Scolarité', icon: BookOpen },
    { id: 'planning' as const, label: 'Planning', icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-['Cinzel_Decorative'] text-2xl lg:text-3xl font-bold text-amber-100">
          Configuration <span className="text-golden">Parent</span>
        </h1>
        {children.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-100/70 text-sm">Enfant :</span>
              <StoneSelect
                value={selectedChild || ''}
                onValueChange={(v) => setSelectedChild(v || null)}
                options={children.map((c) => ({ value: c.id, label: c.full_name || c.email }))}
                placeholder="Choisir un enfant"
                className="min-w-[180px]"
                size="sm"
              />
            </div>
            {selectedChild && (
              <div className="flex items-center gap-2">
                <span className="text-amber-100/70 text-sm">Classe :</span>
                <StoneSelect
                  value={(selectedChildProfile?.classe as string) || '__none__'}
                  onValueChange={(val) => {
                    if (!selectedChild) return;
                    setPendingClasse({ childId: selectedChild, value: val === '__none__' ? '' : val });
                    setShowClasseConfirm(true);
                  }}
                  options={[{ value: '__none__', label: '—' }, ...CLASSES.map((c) => ({ value: c, label: c }))]}
                  placeholder="—"
                  size="sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sous-onglets */}
      <div className="flex gap-2 border-b border-amber-500/20 pb-2 overflow-x-auto">
        {configSubTabs.map((tab) => {
          const Icon = tab.icon;
          const disabled = tab.id !== 'enfants' && !selectedChild;
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && setConfigSubTab(tab.id)}
              disabled={disabled}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 ${configSubTab === tab.id
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : disabled
                  ? 'text-amber-100/30 cursor-not-allowed'
                  : 'text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-300'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Onglet Explorateurs */}
      {configSubTab === 'enfants' && (
        <section className="p-6 stone-card rounded-2xl">
          <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Gérer les explorateurs
          </h2>

          {pendingApprovals.length > 0 && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-amber-100 font-medium mb-3">Demandes en attente</p>
              {pendingApprovals.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <span className="text-amber-100/80">{c.full_name} — {c.email}</span>
                  <button
                    onClick={async () => {
                      console.log('Tentative validation:', c.id);
                      await approveChild(c.id);
                      loadChildrenData();
                    }}
                    className="px-3 py-1 bg-emerald-500 text-slate-900 font-semibold rounded-lg text-sm transition-transform active:scale-95"
                  >
                    Valider
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAddChildMode('invite')}
              className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${addChildMode === 'invite'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-800 text-amber-100/70 hover:bg-slate-700'
                }`}
            >
              <Mail className="w-4 h-4" />
              Inviter par email
            </button>
            <button
              onClick={() => setAddChildMode('link')}
              className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${addChildMode === 'link'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-800 text-amber-100/70 hover:bg-slate-700'
                }`}
            >
              <Link2 className="w-4 h-4" />
              Rattacher un compte existant
            </button>
          </div>

          <form onSubmit={handleAddChild} className="space-y-4">
            {addChildMode === 'invite' && (
              <>
                <input
                  type="text"
                  placeholder="Prénom de l'enfant"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
                />
                <div>
                  <label className="block text-amber-100/80 text-sm mb-2">Classe (collège)</label>
                  <StoneSelect
                    value={childClasse}
                    onValueChange={setChildClasse}
                    options={CLASSES.map((c) => ({ value: c, label: c }))}
                    placeholder="Choisir la classe"
                    required
                  />
                </div>
                <p className="text-amber-100/50 text-xs">
                  L'enfant recevra un email pour créer son mot de passe. En cas d'oubli : mot de passe oublié.
                </p>
              </>
            )}
            <input
              type="email"
              placeholder="Email de l'enfant"
              value={childEmail}
              onChange={(e) => setChildEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
            />
            {error && (
              <div className="stone-alert-error">
                <p className="text-sm">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={isAddingChild}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
            >
              {isAddingChild ? <LoadingSpinner size="sm" /> : <UserPlus className="w-5 h-5" />}
              {addChildMode === 'invite' ? 'Envoyer l\'invitation' : 'Rattacher'}
            </button>
          </form>
          {inviteSent && (
            <div className="mt-4 stone-alert-success">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">Invitation envoyée.</p>
            </div>
          )}
          {resendSuccess && (
            <div className="mt-4 stone-alert-success">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">{resendSuccess}</p>
            </div>
          )}

          {children.length > 0 && (
            <div className="mt-8 pt-6 border-t border-amber-500/20">
              <h3 className="font-medium text-amber-100 mb-3">Explorateurs liés</h3>
              <div className="space-y-3">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-amber-500/10"
                  >
                    <div>
                      <p className="font-medium text-amber-100">{child.full_name || 'Sans nom'}</p>
                      <p className="text-sm text-amber-100/60">{child.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!child.email) return;
                        setResendSuccess(null);
                        clearError();
                        setResendingEmail(child.email);
                        const { email_sent, error: err } = await resendInviteChildAccount(child.email);
                        setResendingEmail(null);
                        if (err) return;
                        if (email_sent) {
                          setResendSuccess(`Email envoyé à ${child.email} ! ${child.full_name || 'L\'enfant'} recevra un lien pour créer ou réinitialiser son mot de passe.`);
                          setTimeout(() => setResendSuccess(null), 6000);
                        }
                      }}
                      disabled={resendingEmail !== null}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {resendingEmail === child.email ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Reply className="w-4 h-4" />
                      )}
                      Renvoyer l'invitation
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Onglet Scolarité (Bulletins + Injecteur) */}
      {configSubTab === 'scolarite' && selectedChild && (
        <section className="p-6 stone-card rounded-2xl space-y-8">
          <div>
            <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Bulletins de notes
            </h2>
            <p className="text-amber-100/60 text-sm mb-4">
              Upload un bulletin : l'IA analyse et crée les matières. L'enfant les voit dans son espace.
            </p>
            <div className="space-y-6">
              <BulletinUploader
                studentId={selectedChild}
                onAnalysisComplete={() => setBulletinsRefresh((x) => x + 1)}
              />
              <div>
                <h3 className="font-medium text-amber-100 mb-3">Bulletins de {selectedChildProfile?.full_name || 'l\'enfant'}</h3>
                <BulletinViewer studentId={selectedChild} refreshTrigger={bulletinsRefresh} />
              </div>
            </div>
          </div>

          {/* Injecteur de priorité */}
          <div>
            <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Injecteur de priorité
            </h2>
            <p className="text-amber-100/60 text-sm mb-4">
              Force l'IA à traiter un sujet spécifique à la prochaine connexion de l'enfant.
            </p>
            <div className="space-y-4">
              <StoneSelect
                value={prioritySubject || '__none__'}
                onValueChange={(v) => setPrioritySubject(v === '__none__' ? '' : (v as Subject))}
                options={[
                  { value: '__none__', label: 'Choisir une matière' },
                  ...(['Maths', 'Français', 'Histoire-Géo', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Théologie', 'Arts', 'Musique', 'Technologie', 'EPS'] as const).map((s) => ({ value: s, label: s })),
                ]}
                placeholder="Choisir une matière"
              />
              <textarea
                value={priorityNote}
                onChange={(e) => setPriorityNote(e.target.value)}
                placeholder="Précision optionnelle (ex: Fractions, Verbe être/avoir...)"
                rows={2}
                className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
              />
              <button
                onClick={handleSavePriority}
                disabled={!prioritySubject || isSavingPriority}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingPriority ? <LoadingSpinner size="sm" /> : <Target className="w-5 h-5" />}
                Injecter la priorité
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Onglet Planning */}
      {configSubTab === 'planning' && selectedChild && (
        <section className="p-6 stone-card rounded-2xl">
          <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Planning scolaire
          </h2>
          <p className="text-amber-100/60 text-sm mb-4">
            Zone scolaire et emploi du temps (image ou PDF) — vacances, créneaux de révision.
          </p>
          <div className="space-y-6">
            <div>
              <label className="block text-amber-100/80 text-sm mb-2">Zone scolaire</label>
              <StoneSelect
                value={childZone}
                onValueChange={(z) => {
                  setPendingZone(z as SchoolZone);
                  setShowZoneConfirm(true);
                }}
                options={SCHOOL_ZONES.map((z) => ({ value: z.value, label: z.label }))}
              />
            </div>
            <PlanningUploader
              studentId={selectedChild}
              cityZone={childZone}
              onUploadComplete={() => setPlanningRefresh((x) => x + 1)}
              existingFileUrl={planningData?.weekly_slots?.file_url}
              onDelete={() => setPlanningRefresh((x) => x + 1)}
            />
            <p className="text-amber-100/60 text-sm">
              L'IA analyse l'emploi du temps et propose des créneaux de révision par semaine.
            </p>
            <div>
              <h3 className="font-medium text-amber-100 mb-3">Aperçu du planning</h3>
              <PlanningViewer
                studentId={selectedChild}
                refreshTrigger={planningRefresh}
                canEdit
                onDeleted={() => setPlanningRefresh((x) => x + 1)}
                onSlotsSaved={() => setPlanningRefresh((x) => x + 1)}
                hideEmploiDuTempsBlock
              />
            </div>
          </div>
        </section>
      )}

      {children.length === 0 && (
        <p className="text-center text-amber-100/50 py-12">
          Ajoute un enfant ci-dessus pour configurer bulletins, planning et priorités.
        </p>
      )}

      <ConfirmDialog
        open={showClasseConfirm}
        onOpenChange={(open) => { if (!open) { setPendingClasse(null); setShowClasseConfirm(false); } }}
        title="Modifier la classe ?"
        description={`La classe de ${selectedChildProfile?.full_name || "l'enfant"} sera modifiée en ${pendingClasse?.value || '—'}.`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        variant="default"
        onConfirm={handleConfirmClasseChange}
      />
      <ConfirmDialog
        open={showZoneConfirm}
        onOpenChange={(open) => { if (!open) { setPendingZone(null); setShowZoneConfirm(false); } }}
        title="Modifier la zone scolaire ?"
        description={`La zone sera modifiée en Zone ${pendingZone || '—'}. Les vacances et le calendrier seront mis à jour.`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        variant="default"
        onConfirm={handleConfirmZoneChange}
      />
    </div>
  );
}
