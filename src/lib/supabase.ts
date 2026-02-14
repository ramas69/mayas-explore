import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import type { ChapterStatus, Subject } from '../types';
import type { Artifact } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Types Database conservés dans src/types/database.ts pour référence future
// Régénérer avec: npx supabase gen types typescript --project-id <ID> > src/types/database.ts
// Fonction de lock personnalisée pour éviter les erreurs navigator.locks
// qui causent "DOMException: The operation was aborted"
const customLock = async <R>(
  name: string,
  timeout: number,
  fn: () => Promise<R>
): Promise<R> => {
  console.log(`[CustomLock] Acquiring lock: ${name} at ${new Date().toISOString()}`);

  // Timeout de sécurité : utiliser 30s par défaut si timeout est 0 ou invalide
  const timeoutMs = timeout > 0 ? Math.min(timeout, 30000) : 30000;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error(`[CustomLock] TIMEOUT after ${timeoutMs}ms for lock: ${name}`);
      reject(new Error(`Lock timeout: ${name} took more than ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    // Nettoyer le timeout si la fonction a réussi
    if (timeoutId) clearTimeout(timeoutId);
    console.log(`[CustomLock] Released lock: ${name}`);
    return result;
  } catch (error) {
    // Nettoyer le timeout même en cas d'erreur
    if (timeoutId) clearTimeout(timeoutId);
    console.error(`[CustomLock] Error in lock ${name}:`, error);
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: customLock,
  },
});

// Trouver un parent par email
export const findParentByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .eq('role', 'parent')
    .maybeSingle();
  return { data, error };
};

// Auth: Inscription parent
export const signUpParent = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'parent',
        full_name: fullName,
      },
    },
  });
  return { data, error };
};

// Auth: Parent crée un compte enfant avec mot de passe (legacy)
export const createChildByParent = async (
  email: string,
  password: string,
  fullName: string,
  parentId: string,
  classe?: string
) => {
  const validClasses = ['6ème', '5ème', '4ème', '3ème'];
  const classeValue = classe && validClasses.includes(classe) ? classe : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'enfant',
        full_name: fullName,
        parent_id: parentId,
        is_approved: true,
        ...(classeValue && { classe: classeValue }),
      },
    },
  });
  return { data, error };
};

// Auth: Parent invite enfant par email — l'enfant reçoit un email et choisit son mot de passe
// Utilise l'Edge Function invite-child (admin.inviteUserByEmail)
export const inviteChildByEmail = async (
  email: string,
  fullName: string,
  parentId: string,
  classe?: string
) => {
  const { data, error } = await supabase.functions.invoke('invite-child', {
    body: { email: email.toLowerCase().trim(), fullName: fullName || 'Explorateur', parentId, classe },
  });
  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: { message: data.error } };
  return { data, error: null };
};

// Auth: Renvoyer l'invitation à un enfant déjà invité
// Génère un nouveau lien d'invitation ou de réinitialisation (à copier et envoyer à l'enfant)
export const resendInviteChildByEmail = async (email: string, parentId: string) => {
  const { data, error } = await supabase.functions.invoke('resend-invite-child', {
    body: { email: email.toLowerCase().trim(), parentId },
  });
  if (error) {
    // Extraire le message d'erreur du body pour les réponses 4xx/5xx
    if (error instanceof FunctionsHttpError && error.context) {
      try {
        const body = await (error.context as Response).json();
        const msg = (body as { error?: string })?.error || error.message;
        return { data: null, error: { message: msg } };
      } catch {
        // fallback si le body n'est pas du JSON
      }
    }
    return { data: null, error: { message: (error as Error).message } };
  }
  if (data?.error) return { data: null, error: { message: data.error } };
  return {
    data: data?.email_sent ? { email_sent: true } : null,
    error: null,
  };
};

// Auth: Enfant s'inscrit seul avec email du parent (en attente de validation)
// Utilise l'Edge Function signup-child-self (Admin API) pour éviter les problèmes de trigger
export const signUpChildSelfRegister = async (
  email: string,
  password: string,
  fullName: string,
  parentEmail: string,
  classe?: string
) => {
  try {
    // Timeout wrapper
    const invokePromise = supabase.functions.invoke('signup-child-self', {
      body: {
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        parentEmail: parentEmail.trim().toLowerCase(),
        classe: classe || undefined,
      },
    });

    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: Le serveur met trop de temps à répondre.')), 30000)
    );

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    console.log('[SUPABASE_LIB] Fin invoke signup-child-self', { data, error });

    if (error) {
      if (error instanceof FunctionsHttpError && error.context) {
        try {
          const body = await (error.context as Response).json();
          const msg = (body as { error?: string })?.error || error.message;
          return { data: null, error: { message: msg } };
        } catch {
          /* fallback */
        }
      }
      return { data: null, error: { message: error.message } };
    }
    if (data?.error) {
      return { data: null, error: { message: (data as { error: string }).error } };
    }
    return { data: data as { user?: { id: string } }, error: null };
  } catch (err) {
    console.error('[SUPABASE_LIB] Exception invoke:', err);
    return { data: null, error: { message: (err as Error).message } };
  }
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const approveChildAccount = async (childId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_approved: true, parent_email: null })
    .eq('id', childId);
  return { data, error };
};

// Lier les enfants en attente (parent_email = mon email) quand un parent se connecte
export const linkPendingChildrenToParent = async (parentId: string, parentEmail: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ parent_id: parentId, parent_email: null })
    .eq('parent_email', parentEmail.toLowerCase().trim())
    .eq('role', 'enfant');
  return { data, error };
};

// Récupérer les demandes d'approbation en attente (enfants liés au parent non approuvés)
export const getPendingChildApprovals = async (parentId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_id', parentId)
    .eq('role', 'enfant')
    .eq('is_approved', false);
  return { data, error };
};

// Notes parent pour l'élève (injecteur de priorité) — l'élève peut les lire via RLS
export const getParentNotesForStudent = async (studentId: string) => {
  const { data, error } = await supabase
    .from('parent_notes')
    .select('content, objective, created_at')
    .eq('student_id', studentId)
    .like('objective', 'inject_priority:%')
    .order('created_at', { ascending: false })
    .limit(5);
  return { data: data || [], error };
};

// Enfants en attente via parent_email (parent pas encore inscrit)
export const getPendingChildrenByParentEmail = async (parentEmail: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_email', parentEmail.toLowerCase().trim())
    .eq('role', 'enfant');
  return { data, error };
};

// Curriculum helpers
export const getCurriculum = async (studentId: string) => {
  const { data, error } = await supabase
    .from('curriculum')
    .select('*')
    .eq('student_id', studentId)
    .order('order_index');
  return { data, error };
};

// Programme downloads (visible parent + enfant)
export const recordProgrammeDownload = async (studentId: string, downloadedByRole: 'parent' | 'enfant', downloadedById: string) => {
  const { error } = await supabase.from('programme_downloads').insert({
    student_id: studentId,
    downloaded_by_role: downloadedByRole,
    downloaded_by_id: downloadedById,
  });
  return { error };
};

export const getLastProgrammeDownload = async (studentId: string) => {
  const { data, error } = await supabase
    .from('programme_downloads')
    .select('downloaded_by_role, downloaded_at')
    .eq('student_id', studentId)
    .order('downloaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
};

export const updateChapterStatus = async (chapterId: string, status: ChapterStatus) => {
  const { data, error } = await supabase
    .from('curriculum')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', chapterId);
  return { data, error };
};

/** Programme collège global (mis à disposition par le Super Admin) — lecture pour tous les utilisateurs authentifiés */
export const getProgrammeCollegeGlobalForClasse = async (classe: string) => {
  const { data, error } = await supabase
    .from('programme_college_global')
    .select('subject, chapter_name, description, order_index')
    .eq('classe', classe)
    .order('subject')
    .order('order_index');
  return { data: data || [], error };
};

/** Ajouter une entrée de curriculum manuelle (source supplémentaire) — parent ou enfant */
export const addManualCurriculumEntry = async (
  studentId: string,
  subject: Subject,
  chapterName: string
) => {
  const { data: existing } = await supabase
    .from('curriculum')
    .select('order_index')
    .eq('student_id', studentId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const orderIndex = (existing?.order_index ?? -1) + 1;
  const { data, error } = await supabase
    .from('curriculum')
    .insert({
      student_id: studentId,
      subject,
      chapter_name: chapterName.trim(),
      source: 'manual',
      status: 'pas_vu',
      order_index: orderIndex,
    })
    .select()
    .single();
  return { data, error };
};

// Gamification helpers
export const getGamification = async (studentId: string) => {
  const { data, error } = await supabase
    .from('gamification')
    .select('*')
    .eq('student_id', studentId)
    .single();
  return { data, error };
};

export const addXP = async (studentId: string, xpAmount: number) => {
  const { data: current } = await getGamification(studentId);
  if (!current) return { error: new Error('Gamification not found') };

  const newXP = current.xp + xpAmount;
  const newRank = calculateRank(newXP);

  const { data, error } = await supabase
    .from('gamification')
    .update({
      xp: newXP,
      rank: newRank,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId);
  return { data, error };
};

export const addArtifact = async (studentId: string, artifact: Artifact) => {
  const { data: current } = await getGamification(studentId);
  if (!current) return { error: new Error('Gamification not found') };

  const artifacts = [...current.artifacts_collected, artifact];

  const { data, error } = await supabase
    .from('gamification')
    .update({
      artifacts_collected: artifacts,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId);
  return { data, error };
};

export const evolveTemple = async (studentId: string, stage: number) => {
  const { data, error } = await supabase
    .from('gamification')
    .update({
      temple_evolution_stage: stage,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId);
  return { data, error };
};

// Session helpers
export const startSession = async (studentId: string, subject?: Subject, chapter?: string) => {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      student_id: studentId,
      start_at: new Date().toISOString(),
      subject,
      chapter,
      xp_earned: 0,
      artifacts_found: [],
    })
    .select()
    .single();
  return { data, error };
};

export const endSession = async (sessionId: string, xpEarned: number, artifacts: string[]) => {
  const endAt = new Date().toISOString();
  const { data: session } = await supabase
    .from('sessions')
    .select('start_at')
    .eq('id', sessionId)
    .single();

  const duration = session ? Math.round((new Date(endAt).getTime() - new Date(session.start_at).getTime()) / 60000) : 0;

  const { data, error } = await supabase
    .from('sessions')
    .update({
      end_at: endAt,
      duration_minutes: duration,
      xp_earned: xpEarned,
      artifacts_found: artifacts,
    })
    .eq('id', sessionId);
  return { data, error };
};

export const getSessions = async (studentId: string, limit = 30, subject?: Subject) => {
  let query = supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (subject) {
    query = query.eq('subject', subject);
  }
  const { data, error } = await query;
  return { data, error };
};

// Chat helpers
export const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string, drawingData?: any) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      has_drawing: !!drawingData,
      drawing_data: drawingData,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();
  return { data, error };
};

export const getChatHistory = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp');
  return { data, error };
};

/** Mémoire : concepts/sessions déjà abordés par l'élève (pour contexte persistant) */
export const getStudentMemory = async (studentId: string, limit = 20): Promise<string> => {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('subject, chapter, start_at')
    .eq('student_id', studentId)
    .not('subject', 'is', null)
    .order('start_at', { ascending: false })
    .limit(limit);
  if (!sessions || sessions.length === 0) return '';
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const s of sessions) {
    const key = `${s.subject}|${s.chapter || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- ${s.subject}${s.chapter ? ` · ${s.chapter}` : ''}`);
  }
  return lines.length > 0
    ? `\n--- MÉMOIRE (concepts déjà abordés en conversation) ---\nL'élève a déjà discuté de :\n${lines.join('\n')}\nAdapte-toi : si un concept a été abordé, tu peux le référencer et t'appuyer dessus.\n`
    : '';
};

/** Dernier bulletin analysé pour un élève (pour le contexte Mentor) */
export const getLatestBulletinForStudent = async (studentId: string) => {
  const { data, error } = await supabase
    .from('bulletin_analyses')
    .select('extracted_data')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
};

/** Planning de l'élève (weekly_slots pour proposition de report) */
export const getPlanningForStudent = async (studentId: string) => {
  const { data, error } = await supabase
    .from('planning')
    .select('weekly_slots')
    .eq('student_id', studentId)
    .maybeSingle();
  return { data, error };
};

/** Récupère une session par ID */
export const getSessionById = async (sessionId: string) => {
  const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
  return { data, error };
};

/** Sauvegarde le snapshot du canvas (Grimoire) pour une session */
export const saveCanvasSnapshot = async (sessionId: string, snapshot: { elements: unknown[]; appState?: Record<string, unknown> }) => {
  const { error } = await supabase
    .from('sessions')
    .update({ canvas_snapshot: snapshot })
    .eq('id', sessionId);
  return { error };
};

/** Somme des duration_minutes des sessions du jour + session en cours (si sessionId fourni) */
export const calculateDailyUsage = async (studentId: string, currentSessionId?: string | null): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await getSessions(studentId, 100);
  if (!data) return 0;

  let total = 0;
  for (const s of data) {
    const sessionDate = new Date(s.start_at);
    sessionDate.setHours(0, 0, 0, 0);
    if (sessionDate.getTime() === today.getTime()) {
      if (s.duration_minutes != null) {
        total += s.duration_minutes;
      } else if (currentSessionId && s.id === currentSessionId) {
        total += Math.floor((Date.now() - new Date(s.start_at).getTime()) / 60000);
      }
    }
  }
  return total;
};

/** Complète une mission : curriculum maitrise + session + gamification */
export const completeMission = async (
  sessionId: string,
  chapterId: string,
  studentId: string,
  xpEarned: number,
  artifactName: string
) => {
  const endAt = new Date().toISOString();
  const { data: session } = await supabase.from('sessions').select('start_at').eq('id', sessionId).single();
  const duration = session ? Math.round((new Date(endAt).getTime() - new Date(session.start_at).getTime()) / 60000) : 0;

  await supabase.from('curriculum').update({ status: 'maitrise', updated_at: endAt }).eq('id', chapterId);

  await supabase.from('sessions').update({
    end_at: endAt,
    duration_minutes: duration,
    xp_earned: xpEarned,
    artifacts_found: [artifactName],
  }).eq('id', sessionId);

  const { data: gam } = await getGamification(studentId);
  if (gam) {
    const newXP = gam.xp + xpEarned;
    const newRank = calculateRank(newXP);
    const artifact: Artifact = {
      id: crypto.randomUUID(),
      name: artifactName,
      description: `Artefact gagné pour la maîtrise du chapitre`,
      icon: '🏆',
      rarity: 'common',
      unlocked_at: endAt,
    };
    const artifacts = [...((gam.artifacts_collected as Artifact[]) || []), artifact];
    await supabase.from('gamification').update({
      xp: newXP,
      rank: newRank,
      artifacts_collected: artifacts,
      updated_at: endAt,
    }).eq('student_id', studentId);
  }
};

// Bulletin analysis helpers (utilisé par BulletinUploader directement ; gardé pour usage programmatique)
export const saveBulletinAnalysis = async (
  studentId: string,
  fileUrl: string,
  fileType: 'pdf' | 'image',
  extractedData: unknown,
  semester: string
) => {
  const { data, error } = await supabase
    .from('bulletin_analyses')
    .insert({
      student_id: studentId,
      file_url: fileUrl,
      file_type: fileType,
      extracted_data: extractedData,
      semester,
    })
    .select()
    .single();
  return { data, error };
};

// Helper functions
const calculateRank = (xp: number): string => {
  if (xp >= 10000) return 'Maître Explorateur';
  if (xp >= 5000) return 'Explorateur Légendaire';
  if (xp >= 2500) return 'Explorateur Expert';
  if (xp >= 1000) return 'Explorateur Confirmé';
  if (xp >= 500) return 'Explorateur Novice';
  return 'Apprenti Explorateur';
};

// Storage helpers
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file);
  return { data, error };
};

export const getFileUrl = (bucket: string, path: string) => {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};
