import { create } from 'zustand';
import {
  saveMessage,
  getChatHistory,
  getStudentMemory,
  supabase,
  getLatestBulletinForStudent,
  getPlanningForStudent,
  getProfile,
  calculateDailyUsage,
  getParentNotesForStudent,
} from '../lib/supabase';
import type { ChatMessage, Subject } from '../types';
import { getMentorForSubject } from '../lib/mentorGroups';
import { findBulletinDataForSubject } from '../lib/subjectMapping';
import {
  saveStudentAnswer,
  calculateXP,
  scheduleRetry,
  getErrorCount,
  getStreak,
  getStreakBonus,
} from '../lib/evaluationUtils';
import { buildSystemPrompt, type MentorContext } from '../lib/chatPrompts';
import { LOADING_MESSAGES } from '../lib/chatConstants';

export interface RedirectGuardianData {
  subject: string;
  guardianName: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingStatus: string | null; // NOUVEAU : Message d'état (ex: "Décodage...")
  currentSessionId: string | null;
  isTyping: boolean;
  redirectModalToShow: RedirectGuardianData | null;

  // Actions
  loadMessages: (sessionId: string) => Promise<void>;
  sendMessage: (content: string, sessionId: string, studentId: string, classe?: string | null, context?: ChatContext, imageBase64?: string) => Promise<void>;
  sendDrawing: (drawingData: unknown, sessionId: string) => Promise<void>;
  receiveAIMessage: (content: string, sessionId: string, drawingData?: unknown, opts?: { missionCompleted?: boolean; studentId?: string }) => Promise<void>;
  clearChat: () => void;
  resetState: () => void;
  clearRedirectModal: () => void;
}

export interface ChatContext {
  subject?: string;
  chapterName?: string;
  chapterId?: string;
  chapterStatus?: 'pas_vu' | 'vu_en_classe' | 'maitrise';
  curriculumChapters?: { chapter_name: string; status: string }[];
}



export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  loadingStatus: null,
  currentSessionId: null,
  isTyping: false,
  redirectModalToShow: null,

  loadMessages: async (sessionId) => {
    if (!sessionId || sessionId === 'demo-session') return;
    set({ isLoading: true, messages: [] }); // Clear previous messages immediately
    try {
      const { data, error } = await getChatHistory(sessionId);
      if (error) throw error;
      set({ messages: (data as ChatMessage[]) || [] });
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string, sessionId: string, studentId: string, classe?: string | null, context?: ChatContext, imageBase64?: string) => {
    console.log('[ChatStore] sendMessage start', { content: content.slice(0, 30), sessionId, studentId });
    set({ isTyping: true });
    let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let safetyTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let loadingIntervalId: ReturnType<typeof setInterval> | null = null;

    // Utilisation de la constante globale LOADING_MESSAGES importée
    set({ isTyping: true, loadingStatus: LOADING_MESSAGES[0] });

    // Faire tourner les messages toutes les 4s
    loadingIntervalId = setInterval(() => {
      set((state) => {
        const currentIdx = LOADING_MESSAGES.indexOf(state.loadingStatus || '') ?? -1;
        const nextIdx = (currentIdx + 1) % LOADING_MESSAGES.length;
        return { loadingStatus: LOADING_MESSAGES[nextIdx] };
      });
    }, 4000);

    // Timeout de sécurité : si après 2 min on n'a toujours pas de réponse, forcer isTyping=false
    safetyTimeoutId = setTimeout(() => {
      console.error('[ChatStore] SAFETY TIMEOUT: Forcing isTyping=false after 2 minutes');
      set({ isTyping: false, loadingStatus: null });
      if (loadingIntervalId) clearInterval(loadingIntervalId);

      get().receiveAIMessage(
        "⚠️ Le mentor ne répond pas. Vérifie ta connexion et réessaie ! 🏕️",
        sessionId
      ).catch(e => console.error('[ChatStore] Safety timeout receiveAIMessage error:', e));
    }, 120000); // 2 minutes

    try {
      const { messages } = get();

      console.log('[ChatStore] Session OK (pas démo), préparation message...');
      // Blocage : session démo = Edge Function jamais appelée
      if (sessionId === 'demo-session') {
        console.log('[ChatStore] Blocage: session démo, pas d\'appel Edge Function');
        await get().receiveAIMessage(
          "Choisis d'abord un Gardien sur la carte ou dans la grille pour démarrer une conversation ! 🗺️",
          sessionId
        );
        return;
      }

      // 1. Insérer immédiatement le message utilisateur dans chat_messages (évite toute perte)
      const userMessageForUI = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        role: 'user' as const,
        content,
        timestamp: new Date().toISOString(),
      };
      set({ messages: [...messages, userMessageForUI] });

      console.log('[ChatStore] Avant saveMessage (user)...');
      const { data: savedMessage, error: saveErr } = await saveMessage(sessionId, 'user', content);
      console.log('[ChatStore] Après saveMessage (user)', { saved: !!savedMessage, err: saveErr?.message });
      if (saveErr) console.error('[ChatStore] saveMessage (user) error:', saveErr);
      if (savedMessage) {
        console.log('[ChatStore] Message utilisateur sauvegardé, id:', savedMessage.id);
        set((s) => ({
          messages: s.messages.map((m) => (m.id === userMessageForUI.id ? savedMessage : m)),
        }));
      }

      // Utiliser getSession() (cache) au lieu de refreshSession() qui peut bloquer
      console.log('[ChatStore] Récupération du token...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('[ChatStore] getSession failed', { sessionError, hasToken: !!session?.access_token });
        throw new Error('Session expirée. Reconnecte-toi.');
      }
      console.log('[ChatStore] Token OK, length:', session.access_token.length);

      console.log('[ChatStore] Chargement contexte (profile, bulletin, planning, usage, parent_notes)...');
      const [profile, bulletin, planning, dailyUsed, parentNotes] = await Promise.all([
        getProfile(studentId),
        getLatestBulletinForStudent(studentId),
        getPlanningForStudent(studentId),
        calculateDailyUsage(studentId, sessionId),
        getParentNotesForStudent(studentId),
      ]);
      const dailyTimeLimit = (profile?.data as { daily_time_limit?: number } | null)?.daily_time_limit ?? 120;
      console.log('[ChatStore] Contexte chargé', { dailyUsed, dailyTimeLimit });
      if (dailyUsed >= dailyTimeLimit) {
        console.log('[ChatStore] Limite journalière atteinte');
        await get().receiveAIMessage(
          "Tu as atteint ta limite de temps pour aujourd'hui, exploratrice ! Repose-toi bien et reviens demain pour de nouvelles expéditions. 🌅",
          sessionId
        );
        return;
      }

      let bulletinAlert: string | undefined;
      if (context?.subject && bulletin?.data?.extracted_data) {
        const ed = bulletin.data.extracted_data as { subjects?: { name: string; status?: string }[]; recommendations?: string[] };
        const subjectData = findBulletinDataForSubject(ed.subjects ?? [], context.subject as import('../types').Subject);
        const hasRigueur = ed.recommendations?.some((r: string) => r.toLowerCase().includes('rigueur'));
        const isWeak = subjectData?.status === 'danger' || subjectData?.status === 'surveiller' || subjectData?.status === 'reviser';
        if (isWeak || (hasRigueur && subjectData)) {
          bulletinAlert =
            "ATTENTION EXPLORATRICE: Nos derniers rapports (bulletins) indiquent que ce secteur est instable. Soyons particulièrement attentifs aux détails.";
        }
      }

      let planningSlots: string | undefined;
      const planningData = planning?.data as { weekly_slots?: { slots?: { day: number; startTime: string; subject?: string }[] } } | null;
      const slots = planningData?.weekly_slots;
      if (slots?.slots?.length) {
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const nextSlots = slots.slots
          .filter((s) => s.day >= 0 && s.day <= 6)
          .map((s) => `${dayNames[s.day]} à ${s.startTime}${s.subject ? ` (${s.subject})` : ''}`);
        if (nextSlots.length) {
          planningSlots = `PLANNING: Si l'élève dit qu'elle est fatiguée ou veut quitter, propose de reporter à une de ces expéditions prévues: ${nextSlots.join(', ')}. Ex: "Je vois que nous avons une autre expédition prévue le [JOUR]. Veux-tu qu'on reporte ce défi à ce moment-là ?"`;
        }
      }

      let parentPriorityAlert: string | undefined;
      const notes = parentNotes?.data as { content: string; objective?: string }[] | undefined;
      if (notes?.length) {
        const pieces = notes.map((n) => {
          const subject = n.objective?.replace('inject_priority:', '') || '';
          return subject ? `- ${subject}: ${n.content}` : n.content;
        });
        parentPriorityAlert = `PRIORITÉ PARENT (superviseur): Le parent a indiqué des priorités. Intègre-les dans tes propositions :\n${pieces.join('\n')}\nSi l'élève n'a pas encore choisi de matière, oriente-la vers ces priorités.`;
      }

      const mentorContext: MentorContext = {
        ...context,
        chapterStatus: context?.chapterStatus,
        bulletinAlert,
        planningSlots,
        parentPriorityAlert,
      };
      const systemPrompt = await buildSystemPrompt(mentorContext, studentId);
      const studentMemory = await getStudentMemory(studentId);

      let sandboxElements: unknown[] = [];
      try {
        const { useSandboxStore } = await import('./sandboxStore');
        const els = useSandboxStore.getState().getElements();
        sandboxElements = Array.isArray(els) ? els : [];
      } catch {
        sandboxElements = [];
      }

      const body = {
        message: content,
        history: messages
          .filter((m) => m.role !== 'system')
          .slice(-10),
        systemPrompt: systemPrompt + studentMemory,
        studentId,
        classe: classe || null,
        sessionId,
        chapterId: context?.chapterId ?? null,
        dailyMinutesUsed: dailyUsed,
        dailyTimeLimit,
        sandboxElements,
        userImageBase64: imageBase64 || null,
      };

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      // Utiliser la clé anon : le token utilisateur cause 401 (expiré ou rejeté par la gateway)
      const authHeader = anonKey ? `Bearer ${anonKey}` : `Bearer ${session.access_token}`;
      console.log('[ChatStore] Appel Edge Function chat...', { messageLen: content.length, historyLen: body.history.length, useAnonKey: !!anonKey });

      const FETCH_TIMEOUT_MS = 120_000; // 2 min (Edge Function limite ~150s)
      const controller = new AbortController();
      fetchTimeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
        fetchTimeoutId = null;
      }

      let aiResponse: Record<string, unknown> | null = null;
      try {
        const text = await res.text();
        aiResponse = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      } catch {
        throw new Error(
          res.status === 504
            ? "Le mentor met trop de temps à répondre. Réessaie dans un instant ! 🏕️"
            : "Réponse invalide du serveur. Réessaie."
        );
      }
      if (!aiResponse) {
        throw new Error(res.status === 504 ? "Le mentor met trop de temps à répondre. Réessaie ! 🏕️" : "Réponse vide du serveur.");
      }
      const invokeError = !res.ok ? new Error((aiResponse.error as string) || `HTTP ${res.status}`) : null;

      console.log('[ChatStore] Edge Function réponse', { ok: res.ok, status: res.status, hasData: !!aiResponse.content, content: typeof aiResponse.content === 'string' ? aiResponse.content.slice(0, 50) : null });
      console.log('[ChatStore] RAW RESPONSE:', JSON.stringify(aiResponse, null, 2));

      if (invokeError) throw invokeError;
      if (aiResponse.error) {
        throw new Error(typeof aiResponse.error === 'string' ? aiResponse.error : String(aiResponse.error));
      }

      const resp = aiResponse as {
        content?: string;
        drawing?: unknown;
        updateSandbox?: { elements: unknown[] };
        displaySchemaUrl?: string;
        missionCompleted?: boolean;
        missionReward?: { xp: number; artifactName: string };
        redirectToGuardian?: { subject: string; guardianName: string };
        evaluation?: {
          evaluation: 'correct' | 'partial' | 'incorrect';
          reasoning: string;
          mistakes?: string[];
          question_topic?: string;
          question_difficulty?: 'easy' | 'medium' | 'hard';
        };
      } | null;
      const contentText = resp?.content ?? '';
      const drawingData = resp?.drawing ?? undefined;
      const missionCompleted = resp?.missionCompleted === true;
      const missionReward = resp?.missionReward;
      const updateSandbox = resp?.updateSandbox;
      const displaySchemaUrl = resp?.displaySchemaUrl;
      console.log('[ChatStore] Réponse IA', {
        hasUpdateSandbox: !!updateSandbox,
        updateSandboxCount: updateSandbox?.elements?.length ?? 0,
        hasDisplaySchemaUrl: !!displaySchemaUrl,
        displaySchemaUrl: displaySchemaUrl ? `${displaySchemaUrl.slice(0, 60)}...` : null,
      });

      if (displaySchemaUrl) {
        console.log('[ChatStore] loadImage appelé, URL:', displaySchemaUrl.slice(0, 80) + '...');
        const { useSandboxStore: sb } = await import('./sandboxStore');
        sb.getState().loadImage(displaySchemaUrl);
      } else {
        console.log('[ChatStore] Pas de displaySchemaUrl — image non chargée');
      }
      if (updateSandbox?.elements?.length) {
        console.log('[ChatStore] updateSandbox reçu', { count: updateSandbox.elements.length, raw: updateSandbox.elements });
        const { useSandboxStore: sb } = await import('./sandboxStore');
        sb.getState().addElements(updateSandbox.elements);
      }

      // NOUVEAU : On envoie aussi les dessins (draw_schema / Maths) vers le Sandbox
      if (drawingData) {
        const dData = drawingData as { elements?: unknown[]; clearBefore?: boolean };
        if (dData.elements && dData.elements.length > 0) {
          console.log('[ChatStore] drawing reçu (Maths) -> envoi au Sandbox', { count: dData.elements.length, clearBefore: !!dData.clearBefore });
          const { useSandboxStore: sb } = await import('./sandboxStore');

          if (dData.clearBefore) {
            sb.getState().resetSandbox();
          }

          sb.getState().addElements(dData.elements);
        }
      }
      if (missionCompleted && missionReward) {
        const { useSandboxStore: sb } = await import('./sandboxStore');
        sb.getState().setLastMissionVictory({ xp: missionReward.xp, artifactName: missionReward.artifactName });
        const { useGamificationStore } = await import('./gamificationStore');
        const artifact = {
          id: crypto.randomUUID(),
          name: missionReward.artifactName,
          description: 'Artefact gagné pour la maîtrise du chapitre',
          icon: '🏆',
          rarity: 'common' as const,
          unlocked_at: new Date().toISOString(),
        };
        await useGamificationStore.getState().showMissionReward(studentId, artifact, missionReward.xp);
      }

      // Traiter l'évaluation de la réponse
      if (resp?.evaluation) {
        console.log('[ChatStore] Évaluation reçue:', resp.evaluation);

        try {
          const difficulty = resp.evaluation.question_difficulty || 'medium';
          const retryCount = await getErrorCount(studentId, resp.evaluation.question_topic || '');
          const xpAwarded = calculateXP(resp.evaluation.evaluation, difficulty, retryCount);

          // Sauvegarder l'évaluation
          await saveStudentAnswer({
            student_id: studentId,
            session_id: sessionId,
            message_id: savedMessage?.id,
            question: messages[messages.length - 2]?.content || '', // Question de l'IA
            question_topic: resp.evaluation.question_topic,
            question_difficulty: difficulty,
            student_answer: content,
            evaluation: resp.evaluation.evaluation,
            evaluation_details: {
              reasoning: resp.evaluation.reasoning,
              mistakes: resp.evaluation.mistakes || [],
            },
            xp_awarded: xpAwarded,
            retry_count: retryCount,
            mastered: resp.evaluation.evaluation === 'correct' && retryCount > 0,
          });

          // Ajouter les XP au profil
          if (xpAwarded > 0) {
            const { useGamificationStore } = await import('./gamificationStore');
            await useGamificationStore.getState().earnXP(studentId, xpAwarded);
            console.log(`[ChatStore] XP ajoutés: +${xpAwarded}`);
          }

          // Si erreur, programmer une révision
          if (resp.evaluation.evaluation === 'incorrect') {
            await scheduleRetry(
              studentId,
              resp.evaluation.question_topic || 'Unknown',
              messages[messages.length - 2]?.content || '',
              savedMessage?.id || '',
              retryCount + 1
            );
            console.log(`[ChatStore] Révision programmée pour: ${resp.evaluation.question_topic}`);
          }

          // Vérifier les bonus de série
          const { data: streak } = await getStreak(studentId);
          if (streak && resp.evaluation.evaluation === 'correct') {
            const streakBonus = getStreakBonus(streak.current_streak);
            if (streakBonus > 0) {
              const { useGamificationStore } = await import('./gamificationStore');
              await useGamificationStore.getState().earnXP(studentId, streakBonus);
              console.log(`[ChatStore] 🔥 Série de ${streak.current_streak}! Bonus: +${streakBonus} XP`);
            }
          }
        } catch (error) {
          console.error('[ChatStore] Erreur lors du traitement de l\'évaluation:', error);
        }
      }
      console.log('[ChatStore] Enregistrement réponse IA', { contentLen: contentText.length, hasRedirect: !!resp?.redirectToGuardian });
      await get().receiveAIMessage(contentText, sessionId, drawingData, {
        missionCompleted,
        studentId,
      });
      // Garde-fou : ne pas afficher la modale si la matière suggérée = matière actuelle (évite la boucle SVT→SVT)
      if (resp?.redirectToGuardian && context?.subject) {
        const currentMentor = getMentorForSubject(context.subject as Subject);
        const suggestedSubject = resp.redirectToGuardian.subject;
        const isSameMentor = currentMentor?.group.subjects.includes(suggestedSubject as Subject);
        if (!isSameMentor) {
          set({ redirectModalToShow: resp.redirectToGuardian });
        }
      } else if (resp?.redirectToGuardian) {
        set({ redirectModalToShow: resp.redirectToGuardian });
      }
      console.log('[ChatStore] sendMessage OK');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isAbort = error instanceof Error && error.name === 'AbortError';
      console.error('[ChatStore] sendMessage error:', errMsg, { isAbort });
      const isSessionError = errMsg.includes('Session expirée');
      const fallbackMsg = isAbort
        ? "Le mentor met trop de temps à répondre. Réessaie dans un instant ! 🏕️"
        : isSessionError
          ? "Ta session semble avoir expiré. Essaie de rafraîchir la page si le problème persiste. 🔄"
          : "La liaison avec le campement est instable, réessaye dans un instant, exploratrice. 🏕️";

      if (isSessionError) {
        // Force logout state check potentially? For now just visual feedback.
      }

      try {
        await get().receiveAIMessage(fallbackMsg, sessionId);
      } catch (e) {
        console.error('[ChatStore] receiveAIMessage (fallback) error:', e);
      }
    } finally {
      if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
      if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
      if (loadingIntervalId) clearInterval(loadingIntervalId);
      set({ isTyping: false, loadingStatus: null });
      console.log('[ChatStore] sendMessage finally, isTyping=false');
    }
  },

  sendDrawing: async (drawingData: unknown, sessionId: string) => {
    const { messages } = get();

    const { data: savedMessage } = await saveMessage(
      sessionId,
      'user',
      '[Dessin de l\'explorateur]',
      drawingData
    );

    if (savedMessage) {
      set({ messages: [...messages, savedMessage] });
    }
  },

  receiveAIMessage: async (content: string, sessionId: string, drawingData?: unknown, opts?: { missionCompleted?: boolean; studentId?: string }) => {
    const { messages } = get();
    if (opts?.missionCompleted && opts?.studentId) {
      const { useCurriculumStore } = await import('./curriculumStore');
      useCurriculumStore.getState().loadCurriculum(opts.studentId);
    }

    const assistantMessage = {
      id: `temp-ai-${Date.now()}`,
      session_id: sessionId,
      role: 'assistant' as const,
      content,
      timestamp: new Date().toISOString(),
      has_drawing: !!drawingData,
      drawing_data: drawingData,
    };

    const { data: savedMessage, error } = await saveMessage(
      sessionId,
      'assistant',
      content,
      drawingData
    );
    if (error) {
      console.error('[Chat] saveMessage (assistant) error:', error);
    }

    set({
      messages: [...messages, savedMessage ?? assistantMessage],
      isTyping: false,
    });
  },

  clearChat: () => {
    set({ messages: [], currentSessionId: null, redirectModalToShow: null, isTyping: false, loadingStatus: null });
  },

  resetState: () => {
    set({ isTyping: false, isLoading: false, loadingStatus: null });
  },

  clearRedirectModal: () => {
    set({ redirectModalToShow: null });
  },
}));
