// Edge Function: chat
// Mentor IA avec tools : get_programme_officiel, draw_schema, complete_mission
// Nécessite OPENAI_API_KEY dans les secrets Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const API_PROGRAMMES_EDUCATION =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-programmes-enseignement-2nd-degre/records';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function err(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** fetch avec timeout pour éviter les blocages */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...init } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Récupère une URL d'image Wikimedia Commons. L'IA fournit un terme de recherche optimisé (ex: "heart diagram", "lung anatomy"). */
async function fetchWikimediaImageUrl(topic: string): Promise<string | null> {
  const query = encodeURIComponent(topic.trim());
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${query}&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs: 10000,
      headers: { 'User-Agent': 'EdTech-Guardian/1.0 (education-project)' },
    });
    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages || typeof pages !== 'object') {
      console.log('[display_schema] Wikimedia recherche:', topic, '→ aucun résultat');
      return null;
    }
    const first = Object.values(pages)[0] as { imageinfo?: { 0?: { url?: string } } };
    const found = first?.imageinfo?.[0]?.url ?? null;
    console.log('[display_schema] Wikimedia recherche:', topic, '→', found ? 'OK' : 'aucune URL');
    return found;
  } catch (err) {
    console.log('[display_schema] Wikimedia erreur pour:', topic, err);
    return null;
  }
}

/** Cycles selon la classe : 6ème = Cycle 3, 5ème-3ème = Cycle 4 */
function getCyclesForClasse(classe: string | null): ('Cycle 3' | 'Cycle 4')[] {
  if (!classe) return ['Cycle 3', 'Cycle 4'];
  if (classe === '6ème') return ['Cycle 3'];
  return ['Cycle 4'];
}

/** Récupère le programme officiel depuis l'API Éducation nationale */
async function fetchProgrammeOfficiel(cycles: ('Cycle 3' | 'Cycle 4')[]): Promise<string> {
  const allRecords: { descriptif: string; discipline: string; niveau: string }[] = [];

  try {
    for (const cycle of cycles) {
      const params = new URLSearchParams({
        where: `niveau_d_enseignement = "${cycle}"`,
        limit: '30',
      });
      const res = await fetchWithTimeout(
        `${API_PROGRAMMES_EDUCATION}?${params}`,
        { timeoutMs: 15000 }
      );
      const json = await res.json();
      if (json.results && Array.isArray(json.results)) {
        for (const r of json.results) {
          const descriptif = (r.descriptif || '').slice(0, 800);
          allRecords.push({
            descriptif,
            discipline: r.discipline ?? '-',
            niveau: r.niveau_d_enseignement ?? cycle,
          });
        }
      }
    }

    if (allRecords.length === 0) {
      return 'Aucun programme trouvé. Vérifie la classe de l\'élève (6ème, 5ème, 4ème, 3ème).';
    }

    const grouped = allRecords.reduce(
      (acc, r) => {
        const key = `${r.niveau} - ${r.discipline}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(r.descriptif);
        return acc;
      },
      {} as Record<string, string[]>
    );

    let out = '📚 Programme officiel (Éducation nationale) :\n\n';
    for (const [key, descs] of Object.entries(grouped)) {
      out += `### ${key}\n${descs.join('\n\n')}\n\n`;
    }
    return out;
  } catch (e) {
    console.log('[get_programme_officiel] Erreur API:', e);
    return "Impossible de récupérer le programme pour l'instant. Réessaie plus tard ou consulte l'onglet Programme ! 📚";
  }
}

/** Génère des éléments Excalidraw pour des formes mathématiques simples */
function generateMathShape(shape: string): { elements: unknown[]; appState?: Record<string, unknown> } | null {
  const S = { strokeColor: '#e2e8f0', strokeWidth: 2, roughness: 1, backgroundColor: 'transparent' };
  const T = { fontSize: 20, strokeColor: '#ef4444' };
  const center = { x: 400, y: 300 };

  switch (shape.toLowerCase()) {
    case 'triangle':
    case 'triangle rectangle':
      return {
        elements: [
          { type: 'line', x: 300, y: 300, points: [[0, 0], [200, 0], [0, -150], [0, 0]], ...S },
          { type: 'text', x: 290, y: 310, text: 'A', ...T },
          { type: 'text', x: 510, y: 310, text: 'B', ...T },
          { type: 'text', x: 290, y: 130, text: 'C', ...T },
        ],
      };
    case 'square':
    case 'carré':
      return {
        elements: [
          { type: 'rectangle', x: 300, y: 200, width: 200, height: 200, ...S },
          { type: 'text', x: 390, y: 410, text: 'côté', ...T },
        ],
      };
    case 'circle':
    case 'cercle':
      return {
        elements: [
          { type: 'ellipse', x: 300, y: 200, width: 200, height: 200, ...S },
          { type: 'line', x: 400, y: 300, points: [[0, 0], [100, 0]], ...S },
          { type: 'text', x: 440, y: 280, text: 'r', ...T },
        ],
      };
    case 'pythagore':
      return {
        elements: [
          { type: 'line', x: 300, y: 300, points: [[0, 0], [200, 0], [0, -150], [0, 0]], ...S },
          { type: 'text', x: 380, y: 310, text: 'a', ...T },
          { type: 'text', x: 270, y: 220, text: 'b', ...T },
          { type: 'text', x: 410, y: 210, text: 'c (hypoténuse)', ...T },
        ],
      };
    case 'thales':
    case 'thalès':
      return {
        elements: [
          { type: 'line', x: 300, y: 100, points: [[0, 0], [-100, 200]], ...S },
          { type: 'line', x: 300, y: 100, points: [[0, 0], [100, 200]], ...S },
          { type: 'line', x: 250, y: 200, points: [[0, 0], [100, 0]], strokeColor: '#ef4444', strokeWidth: 2 },
          { type: 'line', x: 200, y: 300, points: [[0, 0], [200, 0]], strokeColor: '#ef4444', strokeWidth: 2 },
          { type: 'text', x: 290, y: 80, text: 'A', ...T },
          { type: 'text', x: 180, y: 310, text: 'B', ...T },
          { type: 'text', x: 410, y: 310, text: 'C', ...T },
        ],
      };
    case 'rectangle':
      return {
        elements: [
          { type: 'rectangle', x: 300, y: 200, width: 300, height: 150, ...S },
          { type: 'text', x: 400, y: 360, text: 'L', ...T },
          { type: 'text', x: 610, y: 280, text: 'l', ...T },
        ],
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return err(
        'OPENAI_API_KEY non configurée. Déploie avec: supabase secrets set OPENAI_API_KEY=sk-...'
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return err('Non authentifié. Reconnecte-toi.');
    }

    const { message, history, systemPrompt, studentId, classe, sessionId, chapterId, dailyMinutesUsed, dailyTimeLimit, sandboxElements, userImageBase64 } =
      await req.json();

    if (!message || typeof message !== 'string') {
      return err('message requis');
    }

    const limit = dailyTimeLimit ?? 120;
    const used = dailyMinutesUsed ?? 0;
    if (used >= limit) {
      return ok({
        content:
          "Tu as atteint ta limite de temps pour aujourd'hui, exploratrice ! Repose-toi bien et reviens demain pour de nouvelles expéditions. 🌅",
      });
    }

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'get_programme_officiel',
          description:
            "Récupère le programme officiel de l'Éducation nationale pour le collège (cycles 3 et 4). À appeler quand l'élève demande de charger, récupérer, afficher ou voir son programme scolaire, le programme officiel, etc.",
          parameters: {
            type: 'object',
            properties: {
              cycle_hint: {
                type: 'string',
                enum: ['Cycle 3', 'Cycle 4', 'les deux'],
                description:
                  "Cycle ciblé : 'Cycle 3' pour 6ème, 'Cycle 4' pour 5ème-4ème-3ème, 'les deux' si classe inconnue",
              },
            },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'draw_schema',
          description:
            "Dessine une figure géométrique simple. UTILISE CET OUTIL pour : triangle, carré, rectangle, cercle, pythagore, thales. SI CA NE MARCHE PAS ou pour concepts complexes (fonctions, etc.), appelle display_schema.",
          parameters: {
            type: 'object',
            required: ['shape'],
            properties: {
              shape: {
                type: 'string',
                enum: ['triangle', 'square', 'rectangle', 'circle', 'pythagore', 'thales'],
                description: 'La forme à dessiner.',
              },
            },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'update_sandbox',
          description:
            "Injecte des annotations dans le Grimoire. Schéma professionnel : utilise UNIQUEMENT des flèches (arrow) fines et du texte (text). Interdiction formelle : pas de cercles, ellipses, rectangles, diamants, freedraw ou formes remplies qui cachent l'image.",
          parameters: {
            type: 'object',
            required: ['elements'],
            properties: {
              elements: {
                type: 'array',
                description:
                  "Éléments autorisés : arrow {type:'arrow',x,y,points:[[0,0],[w,h]],strokeColor:'#ef4444',strokeWidth:2,roughness:0} et text {type:'text',x,y,text,width,height,strokeColor:'#e2e8f0',fontSize:14}. L'image est centrée (x:80,y:60, 400x300). Place les flèches en partant de ce repère. Une flèche fine + un label à côté, rien d'autre.",
                items: { type: 'object' },
              },
            },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'display_schema',
          description:
            "Affiche une image éducative (Wikimedia Commons) dans le Grimoire. Analyse le message, identifie le concept visuel demandé, puis choisis un terme de recherche optimisé : anglais, format 'X diagram', 'X anatomy' ou 'X cross section' (2-4 mots). Adapte dynamiquement à la matière et au sujet. N'envoie AUCUN élément update_sandbox par défaut.",
          parameters: {
            type: 'object',
            required: ['topic'],
            properties: {
              topic: {
                type: 'string',
                description: "Terme de recherche pour Wikimedia Commons : anglais, format 'X diagram' ou 'X anatomy'. Adapte au concept demandé (toute matière).",
              },
            },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'complete_mission',
          description:
            "Appelle quand l'élève a validé sa compréhension du chapitre (réponses correctes, explication réussie). Récompense la mission terminée : met à jour le curriculum en maîtrise, complète la session et attribue l'artefact.",
          parameters: {
            type: 'object',
            required: ['xp_earned', 'artifact_name'],
            properties: {
              xp_earned: { type: 'number', description: 'Points XP gagnés (ex: 50)' },
              artifact_name: { type: 'string', description: "Nom de l'artefact gagné (ex: Cristal du Savoir)" },
            },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'suggest_guardian',
          description:
            "Appelle UNIQUEMENT si la question concerne une matière DIFFÉRENTE de ta matière actuelle. Si tu es SVT/Physique-Chimie et que la question porte sur poumons, cœur, cellules, volcan, etc. → c'est DANS ta matière : NE PAS appeler, réponds normalement et utilise display_schema si pertinent.",
          parameters: {
            type: 'object',
            required: ['subject', 'guardian_name'],
            properties: {
              subject: { type: 'string', description: 'Matière demandée (Maths, Français, SVT, etc.)' },
              guardian_name: {
                type: 'string',
                description: 'Gardien adapté : Maths/Techno → Maître des Runes Numériques ; Français → Gardien des Glyphes Anciens ; Histoire-Géo → Chroniqueur des Civilisations ; SVT/Physique-Chimie → Alchimiste des Potions Mayas ; Anglais/Espagnol → Traducteur des Langages Perdus ; Arts/EPS/Musique/Théologie → Artisan des Créations Sacrées',
              },
            },
          },
        },
      },
    ];

    const systemWithTools =
      (systemPrompt || '') +
      `

OUTILS DISPONIBLES :

1. get_programme_officiel : Récupère le programme officiel. Utilise-le quand l'élève demande "charge mon programme", "récupère le programme", etc.

2. draw_schema : Pour les MATHS/GÉOMÉTRIE. Appelle avec 'shape' = 'triangle', 'square', 'circle' ou 'pythagore'. Simple et robuste.

3. update_sandbox : Annotations sur IMAGE (display_schema) uniquement. Autorise UNIQUEMENT : flèches (arrow, strokeWidth:2, roughness:0) et labels texte. Interdit : cercles, ellipses, rectangles, diamants, freedraw. L'image (display_schema) est centrée x:80 y:60 400x300. Une flèche fine rouge + un label à côté.

4. display_schema : Affiche une image (Wikimedia) dans le Grimoire. Extrais le sujet, choisis un terme anglais optimisé (format "X diagram" ou "X anatomy"), passe-le en topic — jamais d'URL en dur. Multi-matières. L'image est la seule source visuelle.

5. complete_mission : Appelle UNIQUEMENT quand l'élève a validé sa compréhension (réponses correctes OU a bien accompli la tâche visuelle demandée). Avant d'appeler, vérifie dans sandboxElements si tu avais demandé une action visuelle (ex: "entoure", "relie") que l'élève a bien exécutée.

6. suggest_guardian : Appelle UNIQUEMENT si la question concerne une matière DIFFÉRENTE de ta matière actuelle. Si la question est DANS ta matière (ex: SVT + poumons/cœur/cellules ; Maths + équations ; Français + conjugaison) → NE PAS appeler suggest_guardian, réponds normalement.

⚠️ HORS-SUJET : suggest_guardian SEULEMENT si la question est sur une matière AUTRE que la tienne. Vérifie le CONTEXTE ACTUEL (Matière) avant d'appeler.`;

    const sandboxContext =
      Array.isArray(sandboxElements) && sandboxElements.length > 0
        ? `\n\n--- ÉTAT DU GRIMMOIRE (canvas) ---\nL'élève a actuellement ${sandboxElements.length} élément(s) sur le canvas. Tu peux demander "entoure la réponse", "relie ces deux concepts", etc. Avant complete_mission, vérifie que l'élève a bien ajouté l'élément demandé.\n`
        : '';

    // Approche dynamique : l'IA décide quand appeler display_schema (pas de mots-clés en dur)
    const schemaContext = `\n\n⚠️ GRIMMOIRE (IMPORTANT) :
    1. MATHS / GÉOMÉTRIE :
       - Figures simples (triangle, carré, thalès...) : Appelle draw_schema(shape: "triangle" | "square" | "circle" | "pythagore" | "thales").
       - Concepts complexes (fonctions, graphiques, 3D...) : Appelle display_schema(topic: "anglais").
    2. AUTRES (SVT, Histoire, Français, Arts...) :
       - Appelle TOUJOURS display_schema(topic: "terme anglais") — format "X diagram", "X anatomy", "X map".
       - Exemples : "heart diagram", "roman empire map", "sentence diagram", "mind map".
    Jamais d'URL en dur. Annotations : flèches + texte uniquement.\n`;

    const imageContext = userImageBase64
      ? `\n\n--- IMAGE REÇUE ---\nL'élève a envoyé une photo (cahier, livre, leçon). Analyse le contenu visuellement. Dis "J'ai analysé ton grimoire" ou équivalent. Si tu ajoutes des annotations, utilise UNIQUEMENT des flèches fines (arrow, strokeWidth:2, roughness:0) et du texte — jamais de cercles ou formes remplies.\n`
      : '';

    const messages: { role: string; content: string | { type: string; text?: { type: string; text: string }[]; image_url?: { url: string } }[] }[] = [
      { role: 'system', content: systemWithTools + sandboxContext + schemaContext + imageContext },
      ...(Array.isArray(history)
        ? history.slice(-10).map((m: { role?: string; content?: string }) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as string,
          content: (m.content || '').toString(),
        }))
        : []),
    ];

    if (userImageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${userImageBase64}` } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const openaiPayload: Record<string, unknown> = {
      model: userImageBase64 ? 'gpt-4o' : 'gpt-4o-mini',
      messages,
      max_tokens: 1500,
      tools,
      tool_choice: 'auto',
    };

    let finalContent = '';
    let collectedDrawing: { elements: unknown[]; appState?: Record<string, unknown> } | null = null;
    let updateSandboxElements: unknown[] | null = null;
    let displaySchemaUrl: string | null = null;
    let missionCompleted = false;
    let missionReward: { xp: number; artifactName: string } | null = null;
    let collectedRedirect: { subject: string; guardianName: string } | null = null;
    let iterations = 0;
    const maxIterations = 3;

    while (iterations < maxIterations) {
      // tool_choice reste 'auto' : l'IA décide dynamiquement d'appeler display_schema ou non
      let openaiResponse: Response;
      try {
        openaiResponse = await fetchWithTimeout(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify(openaiPayload),
            timeoutMs: 45000,
          }
        );
      } catch (e) {
        const isAbort = (e as Error).name === 'AbortError';
        return err(
          isAbort
            ? "Le mentor met trop de temps à répondre. Réessaie dans un instant ! 🏕️"
            : (e as Error).message
        );
      }

      if (!openaiResponse.ok) {
        const errData = await openaiResponse.text();
        return err(`OpenAI API: ${openaiResponse.status} - ${errData.slice(0, 300)}`);
      }

      const openaiData = await openaiResponse.json();
      const choice = openaiData.choices?.[0];
      const msg = choice?.message;

      if (!msg) {
        return err('Réponse OpenAI vide');
      }

      const content = msg.content;
      const toolCalls = msg.tool_calls;

      if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        messages.push(msg);
        for (const tc of toolCalls) {
          const fn = tc.function;
          const name = fn?.name;
          let args: {
            cycle_hint?: string;
            scene?: { elements: unknown[]; appState?: Record<string, unknown> };
            elements?: unknown[];
            topic?: string;
            xp_earned?: number;
            artifact_name?: string;
            subject?: string;
            guardian_name?: string;
            shape?: string;
          } = {};
          try {
            args = fn?.arguments ? JSON.parse(fn.arguments) : {};
          } catch {
            args = {};
          }

          if (name === 'get_programme_officiel') {
            const cycles = getCyclesForClasse(classe || null);
            const programmeText = await fetchProgrammeOfficiel(cycles);
            messages.push({
              role: 'tool',
              content: programmeText,
              tool_call_id: tc.id,
            } as { role: string; content: string });
          } else if (name === 'draw_schema' && args.shape) {
            const predefined = generateMathShape(args.shape);
            if (predefined) {
              collectedDrawing = predefined;
              messages.push({
                role: 'tool',
                content: `Figure ${args.shape} dessinée avec succès.`,
                tool_call_id: tc.id,
              } as { role: string; content: string });
            } else {
              messages.push({
                role: 'tool',
                content: `Forme ${args.shape} non supportée. Utilise 'triangle', 'square', 'circle' ou 'pythagore'.`,
                tool_call_id: tc.id,
              } as { role: string; content: string });
            }
          } else if (name === 'display_schema' && args.topic) {
            console.log('[display_schema] Appel display_schema topic:', args.topic);
            const imgUrl = await fetchWikimediaImageUrl(args.topic);
            if (imgUrl) displaySchemaUrl = imgUrl;
            console.log('[display_schema] Résultat:', { topic: args.topic, found: !!imgUrl, displaySchemaUrl: !!displaySchemaUrl });
            messages.push({
              role: 'tool',
              content: imgUrl
                ? `Image affichée dans le Grimoire. N'envoie AUCUN élément update_sandbox par défaut — l'image est la seule source visuelle. Si tu veux désigner un élément, utilise UNE flèche fine (strokeWidth:2, roughness:0) + un label texte uniquement.`
                : `Aucune image trouvée pour "${args.topic}". Utilise update_sandbox avec des flèches et du texte uniquement.`,
              tool_call_id: tc.id,
            } as { role: string; content: string });
          } else if (name === 'update_sandbox') {
            const els = Array.isArray(args.elements) ? args.elements : [];
            const STROKE = '#e2e8f0';
            const ARROW_STROKE = '#ef4444';

            if (els.length > 0) {
              // Schéma professionnel : ne garder que arrow et text ; enrichir les styles
              const allowed = els.filter((el: unknown) => {
                const t = (el as Record<string, unknown>).type;
                return t === 'arrow' || t === 'text';
              });
              updateSandboxElements = allowed.map((el: unknown) => {
                const e = el as Record<string, unknown>;
                const isArrow = e.type === 'arrow';
                return {
                  ...e,
                  strokeColor: isArrow ? (e.strokeColor ?? ARROW_STROKE) : (e.strokeColor ?? STROKE),
                  strokeWidth: isArrow ? (e.strokeWidth ?? 2) : e.strokeWidth,
                  roughness: isArrow ? (e.roughness ?? 0) : e.roughness,
                  backgroundColor: e.backgroundColor ?? 'transparent',
                  fillStyle: e.fillStyle ?? 'solid',
                };
              }) as unknown[];
            } else if (!displaySchemaUrl) {
              // Pas de fallback hardcodé : on guide l'IA pour qu'elle réagisse dynamiquement
              messages.push({
                role: 'tool',
                content: 'Aucun élément reçu et aucune image. Réessaye display_schema avec un terme différent (anglais, format "X diagram" ou "X anatomy"), ou fournis des éléments (flèches + texte) via update_sandbox.',
                tool_call_id: tc.id,
              } as { role: string; content: string });
            }
            const toolResponse = els.length > 0
              ? 'Éléments injectés dans le Grimoire ! L\'élève voit maintenant la base de travail.'
              : displaySchemaUrl
                ? 'Aucun élément fourni — l\'image reste affichée.'
                : null;
            if (toolResponse) {
              messages.push({
                role: 'tool',
                content: toolResponse,
                tool_call_id: tc.id,
              } as { role: string; content: string });
            }
          } else if (name === 'complete_mission' && sessionId && chapterId && studentId) {
            missionCompleted = true;
            const xp = args.xp_earned ?? 50;
            const artifact = args.artifact_name ?? 'Artefact du Savoir';
            missionReward = { xp, artifactName: artifact };
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey, {
              global: { headers: { Authorization: authHeader } },
            });
            const endAt = new Date().toISOString();
            const { data: sess } = await supabase.from('sessions').select('start_at').eq('id', sessionId).single();
            const duration = sess
              ? Math.round((new Date(endAt).getTime() - new Date(sess.start_at).getTime()) / 60000)
              : 0;
            await supabase.from('curriculum').update({ status: 'maitrise', updated_at: endAt }).eq('id', chapterId);
            await supabase
              .from('sessions')
              .update({
                end_at: endAt,
                duration_minutes: duration,
                xp_earned: xp,
                artifacts_found: [artifact],
              })
              .eq('id', sessionId);
            const { data: gam } = await supabase.from('gamification').select('xp, artifacts_collected').eq('student_id', studentId).single();
            if (gam) {
              const newXP = gam.xp + xp;
              const newRank = newXP >= 10000 ? 'Maître Explorateur' : newXP >= 5000 ? 'Explorateur Légendaire' : newXP >= 2500 ? 'Explorateur Expert' : newXP >= 1000 ? 'Explorateur Confirmé' : newXP >= 500 ? 'Explorateur Novice' : 'Apprenti Explorateur';
              const artifacts = [...((gam.artifacts_collected as object[]) || []), { id: crypto.randomUUID(), name: artifact, description: 'Artefact gagné pour la maîtrise du chapitre', icon: '🏆', rarity: 'common', unlocked_at: endAt }];
              await supabase.from('gamification').update({ xp: newXP, rank: newRank, artifacts_collected: artifacts, updated_at: endAt }).eq('student_id', studentId);
            }
            messages.push({
              role: 'tool',
              content: `Mission accomplie ! +${xp} XP, artefact "${artifact}" attribué. Félicite l'exploratrice avec enthousiasme !`,
              tool_call_id: tc.id,
            } as { role: string; content: string });
          } else if (name === 'suggest_guardian' && args.subject && args.guardian_name) {
            collectedRedirect = { subject: args.subject, guardianName: args.guardian_name };
            messages.push({
              role: 'tool',
              content: `Redirection proposée vers ${args.guardian_name} pour la matière ${args.subject}. Un modal sera affiché à l'élève avec les boutons Rediriger et Annuler.`,
              tool_call_id: tc.id,
            } as { role: string; content: string });
          } else {
            messages.push({
              role: 'tool',
              content: 'Outil exécuté.',
              tool_call_id: tc.id,
            } as { role: string; content: string });
          }
        }
        openaiPayload.messages = messages;
        openaiPayload.tools = tools;
        openaiPayload.tool_choice = 'auto';
        iterations++;
        continue;
      }

      finalContent = (content || '').trim();
      break;
    }

    if (!finalContent) {
      finalContent = updateSandboxElements?.length
        ? "Voici un schéma dans le Grimoire pour t'aider ! Regarde à droite. 🗻"
        : "Je n'ai pas pu récupérer le programme cette fois. Tu peux aller dans l'onglet Programme pour le consulter ! 🗺️";
    }

    const result: {
      content: string;
      drawing?: { elements: unknown[]; appState?: Record<string, unknown> };
      updateSandbox?: { elements: unknown[] };
      displaySchemaUrl?: string;
      missionCompleted?: boolean;
      missionReward?: { xp: number; artifactName: string };
      redirectToGuardian?: { subject: string; guardianName: string };
    } = { content: finalContent };
    if (collectedDrawing) result.drawing = collectedDrawing;
    if (updateSandboxElements) result.updateSandbox = { elements: updateSandboxElements };
    if (collectedRedirect) {
      result.redirectToGuardian = collectedRedirect;
      if (!result.content.trim()) result.content = `Cette question concerne les ${collectedRedirect.subject}. Veux-tu aller voir le ${collectedRedirect.guardianName} ? 🗺️`;
    }
    if (displaySchemaUrl) result.displaySchemaUrl = displaySchemaUrl;
    if (missionCompleted && missionReward) {
      result.missionCompleted = true;
      result.missionReward = missionReward;
    }
    console.log('[chat] Réponse finale:', { hasDisplaySchemaUrl: !!displaySchemaUrl, hasUpdateSandbox: !!updateSandboxElements });
    return ok(result);
  } catch (e) {
    return err((e as Error).message);
  }
});
