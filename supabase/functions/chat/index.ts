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

/** 
 * Recherche une image éducative de haute qualité via Perplexity API.
 * Le prompt force l'API à identifier une URL unique et pertinente.
 */
/** 
 * Vérifie si une URL existe réellement (HEAD request) avec un User-Agent de navigateur.
 */
async function checkUrlValidity(url: string): Promise<boolean> {
  // On ne fait PAS confiance aveuglément pour éviter les hallucinations de chemins (404)
  try {
    const res = await fetchWithTimeout(url, {
      method: 'HEAD',
      timeoutMs: 4000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    // On accepte 200 OK et les Content-Type images
    const type = res.headers.get('content-type') || '';
    return res.ok && (type.startsWith('image') || type.includes('application/octet-stream') || url.match(/\.(jpg|jpeg|png|webp|svg)$/i) !== null);
  } catch {
    return false;
  }
}

/** 
 * Tente de convertir une URL SVG Wikimedia en PNG 800px via Special:FilePath.
 */
function optimiserUrlWikimedia(url: string): string {
  if (url.match(/\.svg$/i) && (url.includes('wikimedia.org') || url.includes('wikipedia.org'))) {
    const filename = url.split('/').pop();
    if (filename) {
      // Force le rendu PNG 800px via l'outil spécial de Commons
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=800`;
    }
  }
  return url;
}

/** 
 * Recherche une image via Perplexity en demandant un format Markdown Galerie.
 * Stratégie : Forcer le modèle à générer des liens d'images explicites trouvés dans sa recherche.
 */
async function searchPerplexityImage(topic: string, classe: string | null): Promise<string | null> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!apiKey) return null;

  const level = classe || 'collège';
  const prompt = `Create a markdown image gallery with 3 high-quality educational images (diagrams, maps, historical photos, artworks, charts) of "${topic}" (${level} level).
  Source ONLY from reliable public educational sites (Wikimedia, OpenStax, Flickr Commons, Library of Congress).
  Format: ![Alt Text](https://exact-url-to-image.jpg)
  Do not explain. Just the markdown. If you find a page, extract the main image URL.
  Example: ![Heart](https://upload.wikimedia.org/wikipedia/commons/e/e5/Diagram_heart.png)`;

  try {
    const res = await fetchWithTimeout('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
      timeoutMs: 30000,
    });

    if (!res.ok) {
      console.error('[Perplexity] API Error:', res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '';
    console.log('[Perplexity] Response:', content);

    // Extraction des URLs Markdown ![...](URL)
    const markdownRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
    const matches = [...content.matchAll(markdownRegex)];
    let candidates = matches.map(m => m[1]);

    // Fallback: Tentative regex raw URL si pas de markdown
    if (candidates.length === 0) {
      const rawMatches = content.match(/https?:\/\/[^\s")\]]+\.(?:jpg|jpeg|png|svg|webp)/gi);
      if (rawMatches) candidates.push(...rawMatches);
    }

    // Nettoyage : retirer les [1], [2] de fin d'URL et doublons
    candidates = candidates.map(url => url.replace(/\[\d+\]$/, ''));
    candidates = [...new Set(candidates)]; // Dedup

    console.log('[Perplexity] Candidates:', candidates.length);

    // Validation
    for (let url of candidates) {
      // Optimisation Wikimedia SVG -> PNG
      url = optimiserUrlWikimedia(url);

      if (await checkUrlValidity(url)) {
        console.log('[Perplexity] Valid Image URL:', url);
        return url;
      } else {
        console.log('[Perplexity] Invalid/Blocked URL:', url);
      }
    }

    console.log('[Perplexity] No valid image found.');
    return null;

  } catch (err) {
    console.error('[Perplexity] Error:', err);
    return null;
  }
}

/** 
 * Recherche de secours si Perplexity échoue (ce qui arrive souvent pour les URLs directes).
 * Utilise l'API Wikimedia Commons pour trouver une image fiable.
 */
async function fallbackImageSearch(topic: string): Promise<string | null> {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(topic)}&gsrlimit=3&prop=imageinfo&iiprop=url&format=json&origin=*`;
  try {
    console.log('[Fallback] Searching Wikimedia API for:', topic);
    const res = await fetchWithTimeout(searchUrl, { timeoutMs: 5000 });
    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return null;

    const candidates = Object.values(pages) as { imageinfo?: { 0?: { url?: string } } }[];
    for (const page of candidates) {
      const url = page?.imageinfo?.[0]?.url;
      if (url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.svg'))) {
        return optimiserUrlWikimedia(url);
      }
    }
    return null;
  } catch (e) {
    console.error('[Fallback] Error:', e);
    return null;
  }
}

/** 
 * Orchestrateur Perplexity + Vision.
 */
async function searchAndAnalyzeImage(topic: string, classe: string | null, openaiKey: string): Promise<{ url: string | null, analysis: string }> {
  // 1. Essai Perplexity (IA)
  let url = await searchPerplexityImage(topic, classe);

  // 2. Fallback si Perplexity échoue (API Directe)
  if (!url) {
    console.log('[Note] Perplexity a échoué pas grave, passage au mode secours (API WikimediaDirect).');
    url = await fallbackImageSearch(topic);
  }

  if (!url) {
    return { url: null, analysis: "Le Gardien n'a pas pu visualiser cet artefact (image illisible ou introuvable)." };
  }

  const analysis = await analyzeImageWithVision(url, openaiKey, classe);
  return { url, analysis };
}

/** 
 * Analyse une image via GPT-4o Vision pour identifier un détail pédagogique.
 * Renvoie une description qui servira de base à la question socratique.
 */
async function analyzeImageWithVision(imageUrl: string, openaiKey: string, classe: string | null): Promise<string> {
  const level = classe || 'collège';
  const prompt = `Tu es le Gardien du savoir. Analyse les détails visuels de ce document (carte, oeuvre, schéma, photo) pour un élève de niveau ${level}. Identifie un élément spécifique (une couleur, une flèche, une légende, un personnage, un lieu, une date, un symbole) que l'élève peut observer. Décris-le brièvement pour que je puisse poser une question dessus.`;

  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            ],
          },
        ],
        max_tokens: 150,
      }),
      timeoutMs: 25000,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Vision] API Error:', res.status, errText);
      // Fallback: Si erreur Vision, on renvoie une phrase générique pour ne pas bloquer
      return "Je vois l'image mais l'analyse détaillée est momentanément indisponible. Que remarques-tu ?";
    }

    const json = await res.json();
    if (!json.choices?.[0]?.message?.content) {
      console.error('[Vision] Empty response:', JSON.stringify(json));
      return "Analyse visuelle impossible (réponse vide).";
    }
    return json.choices[0].message.content;
  } catch (err) {
    console.error('[Vision] Erreur Exception:', err);
    return "Je n'ai pas pu analyser l'image en détail, mais observons-la ensemble.";
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

  // --- PROXY IMAGE POUR CONTOURNER CORS ---
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('image_url');
    if (imageUrl) {
      try {
        console.log('[Proxy] Fetching image:', imageUrl);
        // Important: Add User-Agent to avoid blocking by Wikimedia/others (Cloudflare often blocks Deno without UA)
        const imgRes = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });

        if (!imgRes.ok) {
          console.error('[Proxy] Upstream Error:', imgRes.status, imgRes.statusText);
          return new Response(`Image Fetch Error: ${imgRes.status} ${imgRes.statusText}`, { status: imgRes.status, headers: corsHeaders });
        }

        const blob = await imgRes.blob();
        return new Response(blob, {
          headers: {
            ...corsHeaders,
            'Content-Type': imgRes.headers.get('Content-Type') || 'application/octet-stream',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } catch (e) {
        console.error('[Proxy] Error:', e);
        return new Response('Proxy Error', { status: 500, headers: corsHeaders });
      }
    }
  }
  // ----------------------------------------

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
                description: "Recherche une image scientifique via Perplexity et l'analyse avec Vision. Terme de recherche : anglais. Adapte au concept demandé et au NIVEAU SCOLAIRE. Précise 'human' pour l'anatomie.",
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

4. display_schema : Recherche une image éducative (via Perplexity) et l'analyse visuellement. Extrais le sujet, choisis un terme anglais optimisé. L'outil te renverra une ANALYSE VISUELLE que tu devras utiliser pour ta réponse socratique.

5. complete_mission : Appelle UNIQUEMENT quand l'élève a validé sa compréhension (réponses correctes OU a bien accompli la tâche visuelle demandée). Avant d'appeler, vérifie dans sandboxElements si tu avais demandé une action visuelle (ex: "entoure", "relie") que l'élève a bien exécutée.

6. suggest_guardian : Appelle UNIQUEMENT si la question concerne une matière DIFFÉRENTE de ta matière actuelle. Si la question est DANS ta matière (ex: SVT + poumons/cœur/cellules ; Maths + équations ; Français + conjugaison) → NE PAS appeler suggest_guardian, réponds normalement.

⚠️ HORS-SUJET : suggest_guardian SEULEMENT si la question est sur une matière AUTRE que la tienne. Vérifie le CONTEXTE ACTUEL (Matière) avant d'appeler.

## PROTOCOLE DE GÉNÉRATION SVG
- **Usage :** Obligatoire pour Maths, Physique, Chimie et schémas simples de SVT.
- **Format :** Tu dois générer un bloc de code SVG valide entre des balises spécifiques : [SVG_START] <svg viewBox="0 0 400 400"> ... </svg> [SVG_END].
- **Style :** - viewBox="0 0 400 400" pour la cohérence.
  - Fond blanc ou transparent.
  - Couleurs vives pour les éléments clés (ex: #E74C3C pour le sang oxygéné, #3498DB pour l'azote).
  - **Labels :** Utilise la balise <text> pour nommer CHAQUE partie du schéma. C'est crucial pour l'analyse visuelle.`;

    const sandboxContext =
      Array.isArray(sandboxElements) && sandboxElements.length > 0
        ? `\n\n--- ÉTAT DU GRIMMOIRE (canvas) ---\nL'élève a actuellement ${sandboxElements.length} élément(s) sur le canvas. Tu peux demander "entoure la réponse", "relie ces deux concepts", etc. Avant complete_mission, vérifie que l'élève a bien ajouté l'élément demandé.\n`
        : '';

    // Approche dynamique : l'IA décide quand appeler display_schema (pas de mots-clés en dur)
    const contextLevel = classe ? `NIVEAU SCOLAIRE : ${classe}. ` : '';
    const schemaContext = `\n\n⚠️ GRIMMOIRE (IMPORTANT) :
    ${contextLevel}Adapte TOUJOURS le contenu au niveau de l'élève (ex: 6ème = simple, 3ème = détaillé).
    1. MATHS / GÉOMÉTRIE :
       - Figures simples (triangle, carré, thalès...) : Appelle draw_schema(shape: "triangle" | "square" | "circle" | "pythagore" | "thales").
       - Concepts complexes (fonctions, graphiques, 3D...) : Appelle display_schema(topic: "anglais").
    2. AUTRES (SVT, Histoire, Français, Arts...) :
       - Appelle TOUJOURS display_schema(topic: "terme anglais") — format "X diagram", "X anatomy", "X map".
       - Exemples : "human heart diagram" (ajoute 'human' pour l'anatomie), "roman empire map", "sentence diagram", "mind map".
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
            console.log('[display_schema] Topic:', args.topic);
            const { url, analysis } = await searchAndAnalyzeImage(args.topic, classe, openaiKey);

            let toolContent = '';
            if (url) {
              displaySchemaUrl = url;
              console.log('[display_schema] Image trouvée:', url);
              console.log('[display_schema] Analyse Vision:', analysis.slice(0, 50) + '...');

              toolContent = `IMAGE AFFICHÉE : ${url}\n\nANALYSE VISUELLE (Vision API) :\n"${analysis}"\n\nCONSIGNE GARDIEN : Utilise cette analyse pour poser une question socratique précise sur un détail visuel (couleur, forme, texte) de ce schéma. Incarne le style Tomb Raider/Mystique.`;
            } else {
              console.log('[display_schema] Aucune image trouvée.');
              toolContent = `Impossible de trouver une image fiable pour "${args.topic}". Décris le concept avec des mots mystérieux et demande à l'élève de l'imaginer.`;
            }

            messages.push({
              role: 'tool',
              content: toolContent,
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
