// Edge Function: chat (v7 — Détection schéma vs photo)
// Sources images : Wikipédia FR, Wikimedia Commons, Perplexity
// Routage intelligent : "structure du volcan" → schéma, "volcan" → photo
// Secrets requis : OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
// Secrets optionnels : PERPLEXITY_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const API_PROGRAMMES_EDUCATION =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-programmes-enseignement-2nd-degre/records';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WIKI_USER_AGENT = 'EdTech-App/1.0 (contact@edtech.com)';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

function safeJsonParse<T = unknown>(raw: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type PerfLogger = (step: string) => void;

const createPerfLogger = (requestId: string): PerfLogger => {
  const start = performance.now();
  let last = start;
  return (step: string) => {
    const now = performance.now();
    const diff = (now - last).toFixed(0);
    const total = (now - start).toFixed(0);
    console.log(`[PERF] [${requestId}] ${step} (+${diff}ms | Total: ${total}ms)`);
    last = now;
  };
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...init } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── SLICING INTELLIGENT DE L'HISTORIQUE ─────────────────────────────────────

function safeSliceHistory(history: any[], maxMessages = 10): any[] {
  if (!Array.isArray(history) || history.length === 0) return [];
  const sliced = history.slice(-maxMessages);

  while (sliced.length > 0 && sliced[0].role === 'tool') {
    sliced.shift();
  }

  if (
    sliced.length > 0 &&
    sliced[0].role === 'assistant' &&
    sliced[0].tool_calls?.length > 0
  ) {
    const expectedIds = new Set(sliced[0].tool_calls.map((tc: any) => tc.id));
    const presentIds = new Set(
      sliced.filter((m: any) => m.role === 'tool').map((m: any) => m.tool_call_id)
    );
    if (![...expectedIds].every((id) => presentIds.has(id))) {
      sliced.shift();
      while (sliced.length > 0 && sliced[0].role === 'tool') sliced.shift();
    }
  }
  return sliced;
}

// ─── DÉTECTION TYPE D'IMAGE : SCHÉMA vs PHOTO ──────────────────────────────
// "structure d'un volcan" → SCHÉMA (coupe transversale, diagramme)
// "volcan" → PHOTO (image Wikipédia)
// "Napoléon Bonaparte" → PHOTO (portrait)
// "anatomie du cœur" → SCHÉMA (coupe avec légendes)

type ImageType = 'schema' | 'photo';

const SCHEMA_KEYWORDS = [
  'structure', 'schéma', 'schema', 'anatomie', 'coupe', 'fonctionnement',
  'cycle', 'diagramme', 'mécanisme', 'étapes', 'processus', 'composition',
  'organisation', 'parties', 'éléments', 'couches', 'système',
  'circuit', 'chaîne', 'trajet', 'parcours',
  // Mots implicites de schéma
  'comment fonctionne', 'comment marche', 'expliquer le',
  'intérieur', 'interne', 'en coupe', 'transversale',
];

function detectImageType(topic: string): ImageType {
  const lower = topic.toLowerCase();
  for (const kw of SCHEMA_KEYWORDS) {
    if (lower.includes(kw)) return 'schema';
  }
  return 'photo';
}

// Extrait le sujet principal sans les mots-clés de type
// "structure d'un volcan" → "volcan"
// "anatomie du cœur humain" → "cœur humain"
function extractSubject(topic: string): string {
  let subject = topic.toLowerCase();
  // Retirer les mots-clés de type
  const removeWords = [
    'structure de ', "structure d'un ", "structure d'une ", 'structure du ', 'structure des ',
    'schéma de ', "schéma d'un ", "schéma d'une ", 'schéma du ', 'schéma des ',
    'anatomie de ', "anatomie d'un ", "anatomie d'une ", 'anatomie du ', 'anatomie des ',
    'coupe de ', "coupe d'un ", "coupe d'une ", 'coupe du ', 'coupe des ',
    'fonctionnement de ', "fonctionnement d'un ", "fonctionnement d'une ", 'fonctionnement du ', 'fonctionnement des ',
    'cycle de ', "cycle d'un ", "cycle d'une ", 'cycle du ', 'cycle des ',
    'diagramme de ', "diagramme d'un ", "diagramme d'une ", 'diagramme du ', 'diagramme des ',
    'composition de ', "composition d'un ", "composition d'une ", 'composition du ', 'composition des ',
    'parties de ', "parties d'un ", "parties d'une ", 'parties du ', 'parties des ',
    'circuit ', 'système ', 'mécanisme du ', "mécanisme d'un ",
    'les étapes de ', "les étapes d'un ", 'les étapes du ',
    'le trajet de ', "le trajet d'un ", 'le trajet du ',
    'en coupe', 'transversale',
  ];
  for (const w of removeWords) {
    if (subject.startsWith(w)) {
      subject = subject.slice(w.length).trim();
      break;
    }
  }
  // Capitaliser la première lettre
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

// ─── TRADUCTION FR → EN ─────────────────────────────────────────────────────

const FR_EN_COMMON: Record<string, string> = {
  'coeur': 'heart', 'cœur': 'heart', 'poumon': 'lung', 'cerveau': 'brain',
  'squelette': 'skeleton', 'muscle': 'muscle', 'cellule': 'cell', 'oeil': 'eye',
  'estomac': 'stomach', 'intestin': 'intestine', 'rein': 'kidney', 'foie': 'liver',
  'système solaire': 'solar system', 'terre': 'earth', 'lune': 'moon', 'soleil': 'sun',
  'volcan': 'volcano', 'séisme': 'earthquake', 'tsunami': 'tsunami',
  'cycle eau': 'water cycle', "cycle de l'eau": 'water cycle', "l'eau": 'water cycle',
  'photosynthèse': 'photosynthesis', 'respiration': 'respiration',
  'digestion': 'digestion', 'circulation sanguine': 'blood circulation',
  'système nerveux': 'nervous system', 'système digestif': 'digestive system',
  'révolution française': 'french revolution', 'empire romain': 'roman empire',
  'napoléon': 'napoleon', 'napoleon': 'napoleon',
  'pyramide': 'pyramid', 'château fort': 'medieval castle',
  'première guerre mondiale': 'world war 1', 'seconde guerre mondiale': 'world war 2',
  'moyen âge': 'middle ages', 'moyen age': 'middle ages',
  'atome': 'atom', 'molécule': 'molecule', 'électricité': 'electricity',
  'circuit électrique': 'electric circuit', 'force': 'force', 'énergie': 'energy',
  'triangle': 'triangle', 'cercle': 'circle', 'rectangle': 'rectangle',
  'théorème de pythagore': 'pythagorean theorem', 'thalès': 'thales theorem',
  'carte de france': 'map of france', 'continent': 'continent',
  'climat': 'climate', 'océan': 'ocean', 'montagne': 'mountain',
  'fleuve': 'river', 'désert': 'desert',
  'renaissance': 'renaissance', 'antiquité': 'antiquity',
  'préhistoire': 'prehistory', 'grèce antique': 'ancient greece',
  'rome antique': 'ancient rome', 'égypte antique': 'ancient egypt',
  'cœur humain': 'human heart', 'coeur humain': 'human heart',
  'corps humain': 'human body', 'appareil digestif': 'digestive system',
  'appareil respiratoire': 'respiratory system',
};

function translateToEnglish(frTopic: string): string {
  const lower = frTopic.toLowerCase().trim();
  if (FR_EN_COMMON[lower]) return FR_EN_COMMON[lower];
  for (const [fr, en] of Object.entries(FR_EN_COMMON)) {
    if (lower.includes(fr)) return lower.replace(fr, en);
  }
  return frTopic;
}

// ─── SOURCE : WIKIPÉDIA FR (image principale article) ──────────────────────

async function searchWikipediaFR(
  topic: string,
  logPerf: PerfLogger
): Promise<string | null> {
  try {
    logPerf('WikipédiaFR: Start');
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srlimit=3&format=json&origin=*`;
    const searchRes = await fetchWithTimeout(searchUrl, {
      timeoutMs: 5000,
      headers: { 'User-Agent': WIKI_USER_AGENT }
    });
    if (!searchRes.ok) return null;

    const searchJson = await searchRes.json();
    const results = searchJson?.query?.search;
    if (!results || results.length === 0) return null;

    for (const result of results) {
      const imageUrl = await _getWikipediaImage(result.title);
      if (imageUrl) {
        logPerf(`WikipédiaFR: Found for "${result.title}"`);
        return imageUrl;
      }
    }
    return null;
  } catch (e: any) {
    console.error('[WikipédiaFR]', e?.message);
    return null;
  }
}

async function _getWikipediaImage(title: string): Promise<string | null> {
  try {
    const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 4000,
      headers: { 'User-Agent': WIKI_USER_AGENT }
    });
    if (!res.ok) return null;
    const json = await res.json();

    if (json.originalimage?.source && _isGoodImage(json.originalimage.source)) {
      return _optimizeWikiUrl(json.originalimage.source);
    }
    if (json.thumbnail?.source && _isGoodImage(json.thumbnail.source)) {
      return _optimizeWikiUrl(json.thumbnail.source);
    }
    return null;
  } catch { return null; }
}

function _isGoodImage(url: string): boolean {
  const lower = url.toLowerCase();
  const bad = ['icon', 'pictogram', 'logo', 'flag_of_', 'coat_of_arms', 'disambig', 'edit-clear', 'question_book', 'wiki_letter', 'padlock', 'ambox', 'info_sign', 'symbol_', 'stub', '.svg'];
  return !bad.some(b => lower.includes(b));
}

function _optimizeWikiUrl(url: string): string {
  if (url.includes('wikimedia.org') || url.includes('wikipedia.org')) {
    try {
      const decoded = decodeURIComponent(url);
      let filename = '';
      if (decoded.includes('/thumb/')) {
        const parts = decoded.split('/');
        if (parts.length >= 2) filename = parts[parts.length - 2];
      } else {
        filename = decoded.split('/').pop() || '';
      }
      if (filename && !filename.includes('/') && !filename.endsWith('.svg')) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;
      }
    } catch { /* ignore */ }
  }
  return url;
}

// ─── SOURCE : WIKIMEDIA COMMONS ─────────────────────────────────────────────

async function searchWikimediaCommons(
  query: string,
  logPerf: PerfLogger
): Promise<string | null> {
  logPerf('Wikimedia: Start');

  // Essayer la requête directe
  const result = await _wikimediaSearch(query);
  if (result) { logPerf('Wikimedia: Found direct'); return result; }

  // Fallback EN
  const enQuery = translateToEnglish(query);
  if (enQuery !== query) {
    const enResult = await _wikimediaSearch(enQuery);
    if (enResult) { logPerf('Wikimedia: Found EN'); return enResult; }
  }

  logPerf('Wikimedia: Nothing');
  return null;
}

async function _wikimediaSearch(query: string): Promise<string | null> {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=imageinfo&iiprop=url|size&format=json&origin=*`;
  try {
    const res = await fetchWithTimeout(searchUrl, {
      timeoutMs: 5000,
      headers: { 'User-Agent': WIKI_USER_AGENT }
    });
    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return null;

    for (const page of Object.values(pages) as any[]) {
      const info = page?.imageinfo?.[0];
      if (!info?.url) continue;
      const w = info.width || 0, h = info.height || 0;
      if (w < 200 || h < 150) continue;
      if (/\.(jpg|jpeg|png)$/i.test(info.url) && _isGoodImage(info.url)) {
        return _optimizeWikiUrl(info.url);
      }
    }
    return null;
  } catch { return null; }
}

// ─── SOURCE : PERPLEXITY ────────────────────────────────────────────────────

async function searchPerplexityImage(
  topic: string,
  imageType: ImageType,
  classe: string | null,
  logPerf: PerfLogger
): Promise<string | null> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!apiKey) return null;

  const level = classe || 'collège';

  // Adapter le prompt selon le type d'image voulu
  const typeInstruction = imageType === 'schema'
    ? `IMPORTANT : Je cherche un SCHÉMA ÉDUCATIF, un DIAGRAMME ou une COUPE TRANSVERSALE, PAS une photo.
Priorité : schéma annoté avec légendes, coupe transversale, diagramme avec flèches et labels.`
    : `Je cherche une IMAGE ou PHOTO claire et pédagogique.`;

  const prompt = `Trouve 3 images pédagogiques pour "${topic}" pour un élève de ${level}.

${typeInstruction}

Sources prioritaires : Wikimedia Commons, sites éducatifs français (.fr), manuels scolaires.
ÉVITE : photos stock, watermarks, schémas universitaires complexes.

Format : ![Description](https://url-exacte-image.jpg)
Juste les liens.`;

  try {
    logPerf('Perplexity: Start');
    const res = await fetchWithTimeout('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
      timeoutMs: 20000,
    });
    logPerf('Perplexity: End');
    if (!res.ok) return null;

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '';

    const mdRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
    let candidates = [...content.matchAll(mdRegex)].map((m: any) => m[1]);
    if (candidates.length === 0) {
      const raw = content.match(/https?:\/\/[^\s")\]]+\.(?:jpg|jpeg|png|svg|webp)/gi);
      if (raw) candidates.push(...raw);
    }
    candidates = [...new Set(candidates.map((u: string) => u.replace(/\[\d+\]$/, '')))];

    for (let url of candidates) {
      url = _optimizeWikiUrl(url);
      if (await _checkUrlValidity(url)) return url;
    }
    return null;
  } catch (e) {
    console.error('[Perplexity]', e);
    return null;
  }
}

async function _checkUrlValidity(url: string): Promise<boolean> {
  if (url.includes('upload.wikimedia.org') || url.includes('commons.wikimedia.org')) return true;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'HEAD', timeoutMs: 4000,
      headers: { 'User-Agent': WIKI_USER_AGENT, Accept: 'image/*,*/*;q=0.8' },
    });
    const type = res.headers.get('content-type') || '';
    return res.ok && (type.startsWith('image') || !!url.match(/\.(jpg|jpeg|png|webp)$/i));
  } catch {
    return !!url.match(/\.(jpg|jpeg|png|webp)$/i);
  }
}

// ─── ORCHESTRATEUR IMAGE (ROUTAGE INTELLIGENT) ─────────────────────────────
//
// SCHÉMA demandé ("structure du volcan", "anatomie du cœur") :
//   1. Wikimedia Commons FR → "volcan coupe transversale schéma"
//   2. Wikimedia Commons EN → "volcano cross section diagram"
//   3. Perplexity (mode schéma)
//
// PHOTO demandée ("Napoléon", "volcan") :
//   1. Wikipédia FR (image principale article)
//   2. Wikimedia Commons FR/EN
//   3. Perplexity (mode photo)

async function searchAndAnalyzeImage(
  topic: string,
  classe: string | null,
  openaiKey: string,
  logPerf: PerfLogger
): Promise<{ url: string | null; analysis: string }> {

  const imageType = detectImageType(topic);
  const subject = extractSubject(topic);
  const enSubject = translateToEnglish(subject);

  console.log(`[Image] Type: ${imageType} | Topic: "${topic}" | Subject: "${subject}" | EN: "${enSubject}"`);

  let url: string | null = null;

  if (imageType === 'schema') {
    // ── SCHÉMA : Wikimedia Commons d'abord avec mots-clés "diagram" ──

    // 1. Wikimedia Commons FR avec mots-clés schéma
    const schemaQueriesFR = [
      `${subject} schéma`,
      `${subject} coupe transversale`,
      `${subject} diagramme`,
      subject,
    ];
    for (const q of schemaQueriesFR) {
      console.log(`[Image] Schema FR: "${q}"`);
      url = await searchWikimediaCommons(q, logPerf);
      if (url) break;
    }

    // 2. Wikimedia Commons EN avec mots-clés diagram
    if (!url) {
      const schemaQueriesEN = [
        `${enSubject} diagram`,
        `${enSubject} cross section`,
        `${enSubject} anatomy`,
        `${enSubject} structure`,
      ];
      for (const q of schemaQueriesEN) {
        console.log(`[Image] Schema EN: "${q}"`);
        url = await _wikimediaSearch(q);
        if (url) { url = _optimizeWikiUrl(url); break; }
      }
    }

    // 3. Perplexity mode schéma
    if (!url) {
      console.log('[Image] Perplexity (schema)...');
      url = await searchPerplexityImage(topic, 'schema', classe, logPerf);
    }

  } else {
    // ── PHOTO : Wikipédia FR d'abord ──

    // 1. Wikipédia FR
    console.log(`[Image] Photo WikipédiaFR: "${subject}"`);
    url = await searchWikipediaFR(subject, logPerf);

    // 2. Wikimedia Commons FR/EN
    if (!url) {
      console.log(`[Image] Photo Wikimedia: "${subject}"`);
      url = await searchWikimediaCommons(subject, logPerf);
    }

    // 3. Perplexity mode photo
    if (!url) {
      console.log('[Image] Perplexity (photo)...');
      url = await searchPerplexityImage(topic, 'photo', classe, logPerf);
    }
  }

  if (!url) {
    console.warn('[Image] AUCUNE IMAGE pour:', topic);
    return {
      url: null,
      analysis: "Aucune image trouvée. Décris le concept simplement et propose à l'élève de dessiner.",
    };
  }

  console.log(`[Image] ✅ ${imageType}:`, url.slice(0, 100));

  logPerf('Vision: Start');
  const analysis = await analyzeImageWithVision(url, openaiKey, classe);
  logPerf('Vision: End');
  return { url, analysis };
}

// ─── VISION ─────────────────────────────────────────────────────────────────

async function analyzeImageWithVision(
  imageUrl: string,
  openaiKey: string,
  classe: string | null
): Promise<string> {
  const level = classe || 'collège';
  const prompt = `Tu es le Gardien du savoir. Analyse cette image pour un élève français de ${level}.

CONSIGNES :
1. Identifie 2-3 éléments visuels PRÉCIS (couleur, forme, légende, symbole, flèche, zone).
2. Décris en FRANÇAIS avec des termes simples adaptés au ${level}.
3. Suggère un détail précis pour une question socratique.
4. Si du texte est en anglais, traduis-le.

3-4 phrases max.`;

  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        }],
        max_tokens: 250,
      }),
      timeoutMs: 20000,
    });
    if (!res.ok) return "Image affichée. Que remarques-tu ?";
    const json = await res.json();
    return json.choices?.[0]?.message?.content || "Observe bien. Que vois-tu ?";
  } catch {
    return "Observons cette image ensemble. Que remarques-tu ?";
  }
}

// ─── PROGRAMME OFFICIEL ─────────────────────────────────────────────────────

function getCyclesForClasse(classe: string | null): ('Cycle 3' | 'Cycle 4')[] {
  if (!classe) return ['Cycle 3', 'Cycle 4'];
  if (classe === '6ème') return ['Cycle 3'];
  return ['Cycle 4'];
}

async function fetchProgrammeOfficiel(cycles: ('Cycle 3' | 'Cycle 4')[]): Promise<string> {
  const allRecords: { descriptif: string; discipline: string; niveau: string }[] = [];
  try {
    for (const cycle of cycles) {
      const params = new URLSearchParams({ where: `niveau_d_enseignement = "${cycle}"`, limit: '30' });
      const res = await fetchWithTimeout(`${API_PROGRAMMES_EDUCATION}?${params}`, { timeoutMs: 15000 });
      const json = await res.json();
      if (json.results && Array.isArray(json.results)) {
        for (const r of json.results) {
          allRecords.push({
            descriptif: (r.descriptif || '').slice(0, 800),
            discipline: r.discipline ?? '-',
            niveau: r.niveau_d_enseignement ?? cycle,
          });
        }
      }
    }
    if (allRecords.length === 0) return 'Aucun programme trouvé.';
    const grouped = allRecords.reduce((acc, r) => {
      const key = `${r.niveau} - ${r.discipline}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r.descriptif);
      return acc;
    }, {} as Record<string, string[]>);
    let out = '📚 Programme officiel :\n\n';
    for (const [key, descs] of Object.entries(grouped)) {
      out += `### ${key}\n${descs.join('\n\n')}\n\n`;
    }
    return out;
  } catch {
    return "Impossible de récupérer le programme.";
  }
}

// ─── SVG SHAPES ─────────────────────────────────────────────────────────────

function generateSvgShape(shape: string): { type: string;[k: string]: any }[] {
  const color = '#fbbf24';
  const sw = 2;
  switch (shape) {
    case 'triangle':
      return [
        { type: 'line', x1: 200, y1: 50, x2: 100, y2: 250, strokeColor: color, strokeWidth: sw },
        { type: 'line', x1: 100, y1: 250, x2: 300, y2: 250, strokeColor: color, strokeWidth: sw },
        { type: 'line', x1: 300, y1: 250, x2: 200, y2: 50, strokeColor: color, strokeWidth: sw },
        { type: 'text', x: 190, y: 260, text: 'Base', strokeColor: color },
      ];
    case 'square':
      return [{ type: 'rect', x: 100, y: 50, width: 200, height: 200, strokeColor: color, strokeWidth: sw }];
    case 'rectangle':
      return [{ type: 'rect', x: 50, y: 100, width: 300, height: 100, strokeColor: color, strokeWidth: sw }];
    case 'circle':
      return [{ type: 'circle', x: 100, y: 50, width: 200, height: 200, strokeColor: color, strokeWidth: sw }];
    default:
      return [];
  }
}

// ─── TOOLS DEFINITION ───────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_programme_officiel',
      description: "Récupère le programme officiel de l'Éducation nationale.",
      parameters: {
        type: 'object',
        properties: {
          cycle_hint: { type: 'string', enum: ['Cycle 3', 'Cycle 4', 'les deux'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'draw_schema',
      description: 'Dessine une figure géométrique simple. UNIQUEMENT : triangle, carré, rectangle, cercle.',
      parameters: {
        type: 'object',
        required: ['shape'],
        properties: {
          shape: { type: 'string', enum: ['triangle', 'square', 'rectangle', 'circle'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'display_schema',
      description:
        "Affiche une image éducative dans le Grimoire. APPELLE dès qu'un concept visuel est abordé. Si l'élève veut comprendre la structure/fonctionnement, inclus le mot 'structure' ou 'anatomie' dans le topic. Si c'est juste pour voir à quoi ça ressemble, donne juste le nom.",
      parameters: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: {
            type: 'string',
            description:
              `Terme en FRANÇAIS, 2-5 mots. IMPORTANT :
- Pour un SCHÉMA/DIAGRAMME, commence par "structure", "anatomie", "cycle", "fonctionnement" : "structure d'un volcan", "anatomie du cœur humain", "cycle de l'eau", "fonctionnement d'un circuit électrique"
- Pour une PHOTO/IMAGE, donne juste le nom : "Napoléon Bonaparte", "Mont Blanc", "Pyramide de Khéops", "Cellule animale"`,
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_sandbox',
      description: "Annotations (flèches + texte) sur l'image affichée. APRÈS display_schema.",
      parameters: {
        type: 'object',
        required: ['elements'],
        properties: {
          elements: {
            type: 'array',
            description: "{type:'arrow', points:[[x1,y1],[x2,y2]], strokeColor:'red'} ou {type:'text', x, y, text, strokeColor:'yellow'}. 400x300.",
            items: { type: 'object' },
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'complete_mission',
      description: "Valide la mission quand l'élève a compris.",
      parameters: {
        type: 'object',
        required: ['xp_earned', 'artifact_name'],
        properties: {
          xp_earned: { type: 'number' },
          artifact_name: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'suggest_guardian',
      description: "Redirige vers un autre Gardien si hors matière.",
      parameters: {
        type: 'object',
        required: ['subject', 'guardian_name'],
        properties: {
          subject: { type: 'string' },
          guardian_name: { type: 'string' },
        },
      },
    },
  },
];

// ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────

function buildSystemPrompt(
  userSystemPrompt: string,
  classe: string | null,
  sandboxElements: any[] | null,
  hasUserImage: boolean
): string {
  const level = classe || 'non spécifié';

  const instructions = `
## OUTILS (OBLIGATOIRE)

Tu DOIS appeler un outil quand c'est pertinent (display_schema, draw_schema, etc.).
NE FAIS PAS de JSON quand tu appelles un outil (OpenAI gère ça).

## FORMAT DE RÉPONSE FINALE (OBLIGATOIRE)

Quand tu réponds à l'élève (sans outil), tu DOIS retourner un JSON valide avec ce schéma :

{
  "content": "Ta réponse textuelle pour l'élève (avec emojis 🏛️ ✨, markdown, gras, sauts de ligne)",
  "evaluation": {
    "evaluation": "correct|partial|incorrect",
    "reasoning": "Analyse de la réponse élève",
    "question_topic": "Sujet abordé",
    "question_difficulty": "easy|medium|hard",
    "mistakes": ["Erreur 1", "Erreur 2"]
  } | null,
  "svg_code": "<svg viewBox=...>...</svg>" | null
}

N'utilise JAMAIS de balises comme [EVAL_START] ou [SVG_START]. Tout doit être dans le JSON.
`;

  const sandbox = Array.isArray(sandboxElements) && sandboxElements.length > 0
    ? `\n\n${sandboxElements.length} élément(s) sur le canvas.` : '';
  const img = hasUserImage ? `\n\nPhoto envoyée. Analyse-la.` : '';

  return `${userSystemPrompt}\nNiveau: ${level}.${instructions}${sandbox}${img}\n\nIMPORTANT: Réponds UNIQUEMENT en JSON valide.`;
}

// ─── TOOL EXECUTION ─────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: {
    classe: string | null; openaiKey: string; authHeader: string;
    studentId?: string; sessionId?: string; chapterId?: string; logPerf: PerfLogger;
  }
): Promise<{
  toolResult: string;
  displaySchemaUrl?: string | null;
  drawing?: { elements: unknown[]; clearBefore?: boolean } | null;
  updateSandboxElements?: unknown[] | null;
  missionCompleted?: boolean;
  missionReward?: { xp: number; artifactName: string } | null;
  redirect?: { subject: string; guardianName: string } | null;
}> {
  switch (name) {
    case 'get_programme_officiel':
      return { toolResult: await fetchProgrammeOfficiel(getCyclesForClasse(ctx.classe)) };

    case 'draw_schema': {
      const elements = generateSvgShape(args.shape || '');
      return elements.length > 0
        ? { toolResult: 'Figure dessinée.', drawing: { elements, clearBefore: true } }
        : { toolResult: 'Forme non supportée.' };
    }

    case 'display_schema': {
      const topic = args.topic || '';
      console.log('[display_schema] Topic:', topic);
      const { url, analysis } = await searchAndAnalyzeImage(topic, ctx.classe, ctx.openaiKey, ctx.logPerf);
      if (url) {
        return {
          toolResult: `IMAGE AFFICHÉE.\n\nANALYSE VISUELLE :\n"${analysis}"\n\nPose une question socratique sur un détail visuel. En français.`,
          displaySchemaUrl: url,
        };
      }
      return { toolResult: `Aucune image pour "${topic}". Décris le concept simplement.` };
    }

    case 'update_sandbox': {
      const els = Array.isArray(args.elements) ? args.elements : [];
      if (els.length === 0) return { toolResult: 'Aucun élément.' };
      const styled = els
        .filter((el: any) => el.type === 'arrow' || el.type === 'text')
        .map((el: any) => ({
          ...el,
          strokeColor: el.type === 'arrow' ? (el.strokeColor ?? '#ef4444') : (el.strokeColor ?? '#e2e8f0'),
          strokeWidth: el.type === 'arrow' ? (el.strokeWidth ?? 2) : el.strokeWidth,
          roughness: el.type === 'arrow' ? 0 : el.roughness,
          backgroundColor: 'transparent',
        }));
      return { toolResult: 'Annotations ajoutées.', updateSandboxElements: styled };
    }

    case 'complete_mission': {
      const { studentId, sessionId, chapterId, authHeader } = ctx;
      if (!sessionId || !chapterId || !studentId) return { toolResult: 'Données manquantes.' };

      const xp = args.xp_earned ?? 50;
      const artifact = args.artifact_name ?? 'Artefact du Savoir';
      const endAt = new Date().toISOString();
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });

      await supabase.from('curriculum').update({ status: 'maitrise', updated_at: endAt }).eq('id', chapterId);
      const { data: sess } = await supabase.from('sessions').select('start_at').eq('id', sessionId).single();
      const dur = sess ? Math.round((new Date(endAt).getTime() - new Date(sess.start_at).getTime()) / 60000) : 0;
      await supabase.from('sessions').update({ end_at: endAt, duration_minutes: dur, xp_earned: xp, artifacts_found: [artifact] }).eq('id', sessionId);

      const { data: gam } = await supabase.from('gamification').select('xp, artifacts_collected').eq('student_id', studentId).single();
      if (gam) {
        const nxp = gam.xp + xp;
        const rank = nxp >= 10000 ? 'Maître Explorateur' : nxp >= 5000 ? 'Explorateur Légendaire' : nxp >= 2500 ? 'Explorateur Expert' : nxp >= 1000 ? 'Explorateur Confirmé' : nxp >= 500 ? 'Explorateur Novice' : 'Apprenti Explorateur';
        const arts = [...((gam.artifacts_collected as object[]) || []), { id: crypto.randomUUID(), name: artifact, description: 'Maîtrise du chapitre', icon: '🏆', rarity: 'common', unlocked_at: endAt }];
        await supabase.from('gamification').update({ xp: nxp, rank, artifacts_collected: arts, updated_at: endAt }).eq('student_id', studentId);
      }
      return { toolResult: `+${xp} XP, "${artifact}".`, missionCompleted: true, missionReward: { xp, artifactName: artifact } };
    }

    case 'suggest_guardian':
      return { toolResult: `Redirection vers ${args.guardian_name}.`, redirect: { subject: args.subject || '', guardianName: args.guardian_name || '' } };

    default:
      return { toolResult: `Outil "${name}" inconnu.` };
  }
}

// ─── HANDLER PRINCIPAL ──────────────────────────────────────────────────────

const MAX_ITERATIONS = 4;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const rid = crypto.randomUUID().slice(0, 8);
  const logPerf = createPerfLogger(rid);
  logPerf('Request');

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return err('OPENAI_API_KEY manquante.');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return err('Non authentifié.');

    // Proxy image avec validation stricte (SSRF Protection)
    const reqUrl = new URL(req.url);
    const proxyUrl = reqUrl.searchParams.get('image_url');
    if (req.method === 'GET' && proxyUrl) {
      try {
        const allowedDomains = ['wikipedia.org', 'wikimedia.org', 'upload.wikimedia.org', 'commons.wikimedia.org', 'kartable.fr', 'lumni.fr', 'alloprof.qc.ca', 'freepik.com'];
        const targetUrl = new URL(proxyUrl);

        // Vérification du domaine autorisé
        const isAllowed = allowedDomains.some(domain => targetUrl.hostname.endsWith(domain));
        if (!isAllowed) {
          return err('Domaine non autorisé pour le proxy.');
        }

        // Vérification du protocole (HTTP/HTTPS uniquement)
        if (!['http:', 'https:'].includes(targetUrl.protocol)) {
          return err('Protocole non autorisé.');
        }

        const r = await fetchWithTimeout(proxyUrl, { method: 'GET', headers: { 'User-Agent': WIKI_USER_AGENT }, timeoutMs: 15000 });
        if (!r.ok) {
          return new Response(JSON.stringify({ error: `Proxy: ${r.status}` }), {
            status: r.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(await r.blob(), {
          headers: { ...corsHeaders, 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: `Proxy: ${e?.message}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = await req.json();
    const { message, history, systemPrompt, studentId, classe, sessionId, chapterId, sandboxElements, userImageBase64 } = payload;
    logPerf('Parsed');

    if (!message || typeof message !== 'string') return err('message requis.');

    // ─── SÉCURITÉ : Validation Identité & Limite de Temps (Server-Side) ───

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return err('Token invalide ou expiré.');

    // Vérification cohérence ID (anti-spoofing)
    if (studentId && user.id !== studentId) {
      // Tolérance pour les parents qui testent (si implémenté un jour), sinon rejet
      // Pour l'instant on rejette si l'ID ne matche pas
      return err('Incohérence identité.');
    }

    // Calcul du temps utilisé (Source de vérité : Base de données)
    const { data: profile } = await supabaseClient.from('profiles').select('daily_time_limit').eq('id', user.id).single();
    const limit = profile?.daily_time_limit ?? 120;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0); // Début de journée UTC

    const { data: sessions } = await supabaseClient
      .from('sessions')
      .select('id, start_at, duration_minutes')
      .eq('student_id', user.id)
      .gte('start_at', todayStart.toISOString());

    let minutesUsed = 0;
    if (sessions) {
      const now = Date.now();
      for (const s of sessions) {
        if (s.duration_minutes != null) {
          minutesUsed += s.duration_minutes;
        } else if (s.id === sessionId) {
          // Session en cours : on calcule le delta
          const currentDuration = Math.floor((now - new Date(s.start_at).getTime()) / 60000);
          minutesUsed += Math.max(0, currentDuration);
        }
      }
    }

    console.log(`[TimeCheck] User: ${user.id} | Used: ${minutesUsed}m | Limit: ${limit}m`);

    if (minutesUsed >= limit) {
      return ok({ content: "Limite de temps atteinte (validée par le temple). Repose-toi ! 🌅" });
    }

    // ──────────────────────────────────────────────────────────────────────

    const systemContent = buildSystemPrompt(systemPrompt || '', classe || null, sandboxElements, !!userImageBase64);
    const safeHistory = safeSliceHistory(history || [], 10);
    const messages: any[] = [{ role: 'system', content: systemContent }, ...safeHistory];

    if (userImageBase64) {
      messages.push({ role: 'user', content: [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${userImageBase64}` } }] });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const model = userImageBase64 ? 'gpt-4o' : 'gpt-4o-mini';
    let finalContent = '';
    let displaySchemaUrl: string | null = null;
    let collectedDrawing: { elements: unknown[]; clearBefore?: boolean } | null = null;
    let updateSandboxElements: unknown[] | null = null;
    let missionCompleted = false;
    let missionReward: { xp: number; artifactName: string } | null = null;
    let collectedRedirect: { subject: string; guardianName: string } | null = null;
    let evaluation: any = null; // Variable d'évaluation pour le JSON

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      logPerf(`Iter ${i + 1}`);
      let oaiRes: Response;
      try {
        oaiRes = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 1500,
            tools: TOOLS,
            tool_choice: 'auto',
            response_format: { type: "json_object" }
          }),
          timeoutMs: 40000,
        });
      } catch (e: any) {
        return err(e?.name === 'AbortError' ? "Trop long. Réessaie ! 🏕️" : e?.message || 'Erreur');
      }

      if (!oaiRes.ok) return err(`OpenAI ${oaiRes.status}: ${(await oaiRes.text()).slice(0, 300)}`);
      const data = await oaiRes.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) return err('Réponse vide.');

      if (msg.tool_calls?.length > 0) {
        messages.push(msg);
        for (const tc of msg.tool_calls) {
          const args = safeJsonParse<Record<string, any>>(tc.function?.arguments || '{}', {});
          const res = await executeTool(tc.function.name, args || {}, { classe, openaiKey, authHeader, studentId, sessionId, chapterId, logPerf });

          if (res.displaySchemaUrl) displaySchemaUrl = res.displaySchemaUrl;
          if (res.drawing) collectedDrawing = res.drawing;
          if (res.updateSandboxElements) updateSandboxElements = res.updateSandboxElements;
          if (res.missionCompleted) { missionCompleted = true; missionReward = res.missionReward || null; }
          if (res.redirect) collectedRedirect = res.redirect;

          messages.push({ role: 'tool', tool_call_id: tc.id, content: res.toolResult });
        }
        continue;
      }

      finalContent = (msg.content || '').trim();

      // Nettoyage Markdown (```json ... ```)
      const jsonMatch = finalContent.match(/```json\n([\s\S]*?)\n```/) || finalContent.match(/```([\s\S]*?)```/);
      if (jsonMatch) {
        finalContent = jsonMatch[1].trim();
      }

      // Nouveau Parsing JSON
      let parsed: any = {};
      try {
        parsed = JSON.parse(finalContent);
      } catch {
        console.warn('JSON Parse failed, fallback text', finalContent.slice(0, 50));
        // Si c'est déjà du texte brut qui ressemble à du JSON mais mal formé, on le garde tel quel
        // Mais si c'est valide JSON affiché en brut, c'est ce qu'on veut éviter.
        // Ici, si ça fail, on considère que c'est du texte normal (content).
        parsed = { content: finalContent };
      }

      // Support de 'response' comme alias de 'content' (car l'LLM se trompe parfois)
      finalContent = parsed.content || parsed.response || "Je n'ai pas compris. Peux-tu reformuler ? 🏛️";

      // Extraction Evaluation depuis JSON
      evaluation = parsed.evaluation || null;

      // Extraction SVG depuis JSON
      if (parsed.svg_code) {
        collectedDrawing = { elements: [], clearBefore: true, svgCode: parsed.svg_code } as any;
      }

      // Nettoyage pour le retour final (on ne retourne que ce qui est nécessaire)
      // La variable 'evaluation' est déjà extraite pour être passée plus bas
      // Le svg_code est dans drawingData

      break;
    }

    if (!finalContent) {
      finalContent = displaySchemaUrl ? "Image dans le Grimoire ! Observe bien. 🔍"
        : updateSandboxElements?.length ? 'Schéma ajouté ! 🗻'
          : 'Reformule ta question ! 🗺️';
    }

    // (La section regex EVAL_START et SVG_START est supprimée car remplacée par le parsing JSON ci-dessus)

    // SVG processing done internally above via collectedDrawing variable

    const result: Record<string, unknown> = { content: finalContent };
    if (collectedDrawing) result.drawing = collectedDrawing;
    if (updateSandboxElements) result.updateSandbox = { elements: updateSandboxElements };
    if (displaySchemaUrl) result.displaySchemaUrl = displaySchemaUrl;
    if (collectedRedirect) { result.redirectToGuardian = collectedRedirect; if (!finalContent.trim()) result.content = `Question sur ${collectedRedirect.subject}. Voir le ${collectedRedirect.guardianName} ? 🗺️`; }
    if (missionCompleted && missionReward) { result.missionCompleted = true; result.missionReward = missionReward; }
    if (evaluation) result.evaluation = evaluation;

    console.log('[chat]', { img: !!displaySchemaUrl, sandbox: !!updateSandboxElements, draw: !!collectedDrawing, eval: !!evaluation, mission: missionCompleted });
    return ok(result);
  } catch (e: any) {
    console.error('[ERROR]', e?.message);
    return err(`Souci : ${e?.message || 'Erreur inconnue'}`);
  }
});