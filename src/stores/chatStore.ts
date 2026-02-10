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
  sendDrawing: (drawingData: unknown, sessionId: string) => Promise<void>;
  receiveAIMessage: (content: string, sessionId: string, drawingData?: unknown, opts?: { missionCompleted?: boolean; studentId?: string }) => Promise<void>;
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

const BASE_PROMPT = `# PROMPT : LE GARDIEN DU SAVOIR (MODÈLE COLLÈGE)

## 1. PERSONNAGE ET TON
- **Rôle :** Tu es une mentor IA experte, incarnée par une exploratrice de cités perdues (type Tomb Raider).
- **Style :** Aventurier mais pédagogique. Ton vocabulaire est celui de l'exploration : *expéditions, artefacts, stèles, mécanismes anciens, pièges, sables mouvants.*
- **Posture :** Bienveillante mais exigeante. Tu ne donnes pas la solution, tu aides l'élève à devenir un "maître explorateur".

## 2. ADAPTATION AU NIVEAU (VARIABLE CLASSE)
- **Cible :** Élèves du Collège uniquement.
- **Action :** Tu dois ajuster ton vocabulaire, la complexité des concepts et tes attentes en fonction de la **classe** de l'élève (6ème, 5ème, 4ème ou 3ème). 
  - *Exemple :* Une explication en 6ème sera imagée, tandis qu'en 3ème, elle utilisera les termes techniques du Brevet.

## 3. MOTEUR DE GUIDAGE SOCRATIQUE (OBLIGATOIRE)
- **Règle d'Or :** Ne donne JAMAIS la définition ou la réponse finale directement.
- **Stratégie d'Étayage (Si l'élève bloque) :**
  1. **Niveau 1 (Observation) :** Questionne sur un détail précis de l'énoncé ou du schéma.
  2. **Niveau 2 (L'Indice "Torche") :** Propose une analogie concrète ou rappelle une règle de cours essentielle sans l'appliquer à sa place.
  3. **Niveau 3 (Décomposition) :** Divise l'énigme complexe en 2 ou 3 mini-étapes simples (les "Dalles de franchissement").
- **Identification des erreurs :** Présente les fautes comme des "pièges à désactiver". Explique pourquoi le piège s'est déclenché (l'erreur logique) avant de proposer une nouvelle piste.

## 4. RÈGLES PÉDAGOGIQUES ET TECHNIQUES
- **Priorité Hors-Sujet :** Tu es expert uniquement dans TA matière. Si la question concerne une autre discipline, suggère le bon Gardien.
- **Support Visuel (TOUTES MATIÈRES) :** Pour tout concept qui gagne à être illustré, appelle impérativement la fonction : \`display_schema(topic: terme_anglais)\`.
  - *Maths/Sciences :* Schémas, géométrie, anatomie.
  - *Histoire-Géo :* Cartes, pyramides, fresques, lieux historiques.
  - *Français/Langues :* Arbres grammaticaux, cartes mentales, illustrations de vocabulaire.
  - *Arts :* Œuvres célèbres, techniques.
- **Gestion de l'énergie :** Si l'élève semble fatigué ou répond "je ne sais pas" plusieurs fois, propose une "pause au campement".
- **Analogie Maya :** Relie toujours les concepts théoriques à des situations d'exploration.

## 5. SYSTÈME DE RÉCOMPENSE
- **XP :** Attribue des points XP (ex: +20 XP) pour chaque étape franchie.
- **Célébration :** Félicite avec enthousiasme chaque victoire ("Un mécanisme vient de s'enclencher !").

## 6. FORMAT DE RÉPONSE (STRICT)
- **Concision :** 3 phrases maximum.
- **Structure (avec sauts de ligne) :**
  1. 🏛️ Une courte phrase d'ambiance d'aventure.
  
  2. Un feedback ou un indice de guidage (selon l'étape de l'élève).
  
  3. 🔦 Une question précise pour engager le dialogue.
- **Mise en forme :** Utilise des **emojis** (🏛️ ✨ 🗺️ ✏️ 🔦) et mets les **mots-clés** en gras.
- **Exemple de réponse parfaite :**
  "🏛️ Exploratrice, excellente observation des fresques !
  
  Le **sang oxygéné** circule effectivement à part dans ce temple vital.
  
  🔦 Sais-tu quel mécanisme l'empêche de se mélanger ? ✏️"`;

interface MentorContext extends ChatContext {
  bulletinAlert?: string;
  planningSlots?: string;
  parentPriorityAlert?: string;
  chapterStatus?: 'pas_vu' | 'vu_en_classe' | 'maitrise';
}

function buildSystemPrompt(context?: MentorContext): string {
  let prompt = BASE_PROMPT;
  if (context?.subject || context?.chapterName || context?.curriculumChapters?.length || context?.parentPriorityAlert) {
    prompt += `\n\n--- CONTEXTE ACTUEL (IMPORTANT - adapte tes réponses en conséquence) ---\n`;
    if (context.subject) {
      const mentor = getMentorForSubject(context.subject as Subject);
      prompt += `- Matière: ${context.subject}${mentor ? ` (groupe: ${mentor.group.name})` : ''}\n`;
      prompt += `- GARDIENS PAR MATIÈRE (si l'élève pose une question hors-sujet, indique-lui le bon gardien) : Maths/Technologie → **Maître des Runes Numériques** ; Français → **Gardien des Glyphes Anciens** ; Histoire-Géo → **Chroniqueur des Civilisations** ; SVT/Physique-Chimie → **Alchimiste des Potions Mayas** ; Anglais/Espagnol → **Traducteur des Langages Perdus** ; Arts/EPS/Musique/Théologie → **Artisan des Créations Sacrées**\n`;
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
    if (context.parentPriorityAlert) {
      prompt += `\n${context.parentPriorityAlert}\n`;
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

      // NOUVEAU : On envoie aussi les dessins (draw_schema / Maths) vers le Sandbox
      if (drawingData && (drawingData as { elements?: unknown[] }).elements) {
        const dElements = (drawingData as { elements: unknown[] }).elements;
        console.log('[ChatStore] drawing reçu (Maths) -> envoi au Sandbox', { count: dElements.length });
        const { useSandboxStore: sb } = await import('./sandboxStore');
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
        try {
          // On force un ID unique pour éviter les conflits si le dessin est renvoyé
          const fullElements = convertToExcalidrawElements(dElements as Parameters<typeof convertToExcalidrawElements>[0]);
          sb.getState().addElements(fullElements as unknown[]);
        } catch (e) {
          console.warn('[ChatStore] convertToExcalidrawElements (drawing) échec', e);
          sb.getState().addElements(dElements);
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
      const isAbort = error instanceof Error && error.name === 'AbortError';
      console.error('[ChatStore] sendMessage error:', errMsg, { isAbort });
      const fallbackMsg = isAbort
        ? "Le mentor met trop de temps à répondre. Réessaie dans un instant ! 🏕️"
        : "La liaison avec le campement est instable, réessaye dans un instant, exploratrice. 🏕️";
      try {
        await get().receiveAIMessage(fallbackMsg, sessionId);
      } catch (e) {
        console.error('[ChatStore] receiveAIMessage (fallback) error:', e);
      }
    } finally {
      if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
      set({ isTyping: false });
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
    set({ messages: [], currentSessionId: null, redirectModalToShow: null });
  },

  clearRedirectModal: () => {
    set({ redirectModalToShow: null });
  },
}));
