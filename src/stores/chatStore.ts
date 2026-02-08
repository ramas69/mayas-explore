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
} from '../lib/supabase';
import type { ChatMessage, Subject } from '../types';
import { getMentorForSubject } from '../lib/mentorGroups';
import { findBulletinDataForSubject } from '../lib/subjectMapping';

export interface RedirectGuardianData {
  subject: string;
  guardianName: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentSessionId: string | null;
  isTyping: boolean;
  redirectModalToShow: RedirectGuardianData | null;

  // Actions
  loadMessages: (sessionId: string) => Promise<void>;
  sendMessage: (content: string, sessionId: string, studentId: string, classe?: string | null, context?: ChatContext, imageBase64?: string) => Promise<void>;
  sendDrawing: (drawingData: any, sessionId: string, studentId: string) => Promise<void>;
  receiveAIMessage: (content: string, sessionId: string, drawingData?: any, opts?: { missionCompleted?: boolean; studentId?: string }) => Promise<void>;
  clearChat: () => void;
  clearRedirectModal: () => void;
}

export interface ChatContext {
  subject?: string;
  chapterName?: string;
  chapterId?: string;
  chapterStatus?: 'pas_vu' | 'vu_en_classe' | 'maitrise';
  curriculumChapters?: { chapter_name: string; status: string }[];
}

const BASE_PROMPT = `Tu es une mentor IA experte et bienveillante pour un élève de collège (4ème) dans une application éducative sur le thème Maya/Tomb Raider. Style : aventurier (Tomb Raider) mais pédagogique (Duolingo).

RÈGLES DE PERSONNALITÉ:
- Utilise un vocabulaire d'aventure : expéditions, temples, artefacts, pièges, sables mouvants
- Sois encourageante mais exigeante
- Identifie les erreurs comme des "pièges à contourner"
- Célèbre les victoires avec enthousiasme

MÉTHODE SOCRATIQUE STRICTE (OBLIGATOIRE):
- Ne donne JAMAIS la définition ou la réponse dans le premier message.
- Dis plutôt : "Regarde la flèche que je viens de placer sur le schéma. À ton avis, pourquoi ce vaisseau est-il plus gros que les autres ?" ou une question similaire qui invite l'élève à observer et réfléchir.
- Guide par des questions, jamais par des affirmations directes sur les notions à apprendre.

RÈGLES PÉDAGOGIQUES:
- PRIORITÉ ABSOLUE — HORS-SUJET : Tu n'es expert QUE dans ta matière. Si la question est DANS ta matière (ex: tu es SVT et elle demande sur les poumons, le cœur, les cellules), réponds normalement. suggest_guardian SEULEMENT si la question concerne une AUTRE matière (ex: maths alors que tu es Français). Ne confonds pas : poumons/cœur = SVT, équations = Maths, conjugaison = Français.
- Pose des questions pour guider l'élève vers la réponse
- Pour tout concept qui gagne à être illustré (quelle que soit la matière), appelle display_schema(topic: terme_anglais). Analyse le sujet et choisis un terme optimisé pour Wikimedia : anglais, format "X diagram" ou "X anatomy". Jamais d'URL en dur.
- Si l'élève est fatigué, propose de raccourcir la session ou de faire une pause
- Adapte ton niveau et ton contenu à la matière et au programme de l'élève
- Utilise des analogies avec l'exploration et les Mayas
- Réponds TOUJOURS en lien avec la matière et le chapitre en cours (sauf si hors-sujet → redirige)

RÉCOMPENSES XP:
- Quand l'élève comprend une notion ou répond correctement, encourage avec des points XP : "Bravo ! Tu as compris le fonctionnement du magma, +50 XP !" ou "+30 XP pour cette belle découverte !"

FORMAT DE RÉPONSE:
- Garde tes réponses concises (2-3 phrases max)
- Utilise des emojis appropriés 🏛️ ✨ 🗺️ ✏️
- Termine souvent par une question pour engager le dialogue`;

interface MentorContext extends ChatContext {
  bulletinAlert?: string;
  planningSlots?: string;
  chapterStatus?: 'pas_vu' | 'vu_en_classe' | 'maitrise';
}

function buildSystemPrompt(context?: MentorContext): string {
  let prompt = BASE_PROMPT;
  if (context?.subject || context?.chapterName || context?.curriculumChapters?.length) {
    prompt += `\n\n--- CONTEXTE ACTUEL (IMPORTANT - adapte tes réponses en conséquence) ---\n`;
    if (context.subject) {
      const mentor = getMentorForSubject(context.subject as any);
      prompt += `- Matière: ${context.subject}${mentor ? ` (groupe: ${mentor.group.name})` : ''}\n`;
      prompt += `- GARDIENS PAR MATIÈRE (si l'élève pose une question hors-sujet, indique-lui le bon gardien) : Maths/Technologie → Maître des Runes Numériques ; Français → Gardien des Glyphes Anciens ; Histoire-Géo → Chroniqueur des Civilisations ; SVT/Physique-Chimie → Alchimiste des Potions Mayas ; Anglais/Espagnol → Traducteur des Langages Perdus ; Arts/EPS/Musique/Théologie → Artisan des Créations Sacrées\n`;
    }
    if (context.chapterName) {
      prompt += `- Chapitre en cours: ${context.chapterName}\n`;
    }
    const status = context.chapterStatus ?? context.curriculumChapters?.find((c) => c.chapter_name === context.chapterName)?.status;
    if (status === 'pas_vu') {
      prompt += `\nMODE DÉCOUVERTE: Ce chapitre n'a pas encore été vu en classe. Commence par une phase de découverte : introduis les notions clés, explique le contexte, prépare l'exploratrice à ce qu'elle va rencontrer.\n`;
    } else if (status === 'vu_en_classe') {
      prompt += `\nMODE RÉVISION: Ce chapitre est déjà vu en classe. Passe en mode révision/exercice : pose des questions, fais faire des exercices, valide la compréhension.\n`;
    }
    if (context.curriculumChapters && context.curriculumChapters.length > 0) {
      prompt += `- Programme de l'élève dans cette matière:\n`;
      for (const ch of context.curriculumChapters) {
        const statusLabel = ch.status === 'maitrise' ? '✓ maîtrisé' : ch.status === 'vu_en_classe' ? '... en cours' : '🔒 à venir';
        prompt += `  • ${ch.chapter_name} (${statusLabel})\n`;
      }
      prompt += `\nConcentre-toi sur le chapitre en cours et les notions déjà vues. Référence le programme quand c'est pertinent.\n`;
    }
    if (context.bulletinAlert) {
      prompt += `\n${context.bulletinAlert}\n`;
    }
    if (context.planningSlots) {
      prompt += `\n${context.planningSlots}\n`;
    }
  }
  return prompt;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  currentSessionId: null,
  isTyping: false,
  redirectModalToShow: null,

  loadMessages: async (sessionId: string) => {
    set({ isLoading: true, currentSessionId: sessionId });
    const { data } = await getChatHistory(sessionId);
    if (data) {
      set({ messages: data, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string, sessionId: string, studentId: string, classe?: string | null, context?: ChatContext, imageBase64?: string) => {
    console.log('[ChatStore] sendMessage start', { content: content.slice(0, 30), sessionId, studentId });
    set({ isTyping: true });

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

      console.log('[ChatStore] Chargement contexte (profile, bulletin, planning, usage)...');
      const [profile, bulletin, planning, dailyUsed] = await Promise.all([
        getProfile(studentId),
        getLatestBulletinForStudent(studentId),
        getPlanningForStudent(studentId),
        calculateDailyUsage(studentId, sessionId),
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

      const mentorContext: MentorContext = {
        ...context,
        chapterStatus: context?.chapterStatus,
        bulletinAlert,
        planningSlots,
      };
      const systemPrompt = buildSystemPrompt(mentorContext);
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
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
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

      const res = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
      });
      const aiResponse = await res.json();
      const invokeError = !res.ok ? new Error(aiResponse?.error || `HTTP ${res.status}`) : null;

      console.log('[ChatStore] Edge Function réponse', { ok: res.ok, status: res.status, hasData: !!aiResponse?.content, content: aiResponse?.content?.slice(0, 50) });

      if (invokeError) throw invokeError;
      if (aiResponse?.error) {
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
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
        try {
          const fullElements = convertToExcalidrawElements(updateSandbox.elements as Parameters<typeof convertToExcalidrawElements>[0]);
          console.log('[ChatStore] convertToExcalidrawElements OK', { count: fullElements.length });
          sb.getState().addElements(fullElements as unknown[]);
        } catch (e) {
          console.warn('[ChatStore] convertToExcalidrawElements échec, utilisation raw', e);
          sb.getState().addElements(updateSandbox.elements);
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
      console.error('[ChatStore] sendMessage error:', errMsg);
      await get().receiveAIMessage(
        "La liaison avec le campement est instable, réessaye dans un instant, exploratrice. 🏕️",
        sessionId
      );
    } finally {
      set({ isTyping: false });
      console.log('[ChatStore] sendMessage finally, isTyping=false');
    }
  },

  sendDrawing: async (drawingData: any, sessionId: string, _studentId: string) => {
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

  receiveAIMessage: async (content: string, sessionId: string, drawingData?: any, opts?: { missionCompleted?: boolean; studentId?: string }) => {
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
    set({ messages: [], currentSessionId: null, redirectModalToShow: null });
  },

  clearRedirectModal: () => {
    set({ redirectModalToShow: null });
  },
}));
