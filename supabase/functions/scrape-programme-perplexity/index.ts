// Edge Function: scrape-programme-perplexity
// Récupère le programme collège via Perplexity (remplace l'API Éducation nationale)
// Nécessite PERPLEXITY_API_KEY dans les secrets Supabase

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProgrammeChapter {
  classe: string;
  subject: string;
  chapter_name: string;
  description: string | null;
}

const SYSTEM_PROMPT = `Tu es un expert des programmes scolaires français du collège (cycles 3 et 4).
Tu dois fournir le programme officiel de l'Éducation nationale pour le collège.

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.
Format exigé : un tableau JSON avec des objets ayant exactement ces clés :
- classe : "6ème" | "5ème" | "4ème" | "3ème"
- subject : matière — utilise EXACTEMENT ces noms : "Maths", "Français", "Histoire-Géo", "SVT", "Physique-Chimie", "Anglais", "Espagnol", "Arts", "EPS"
- chapter_name : titre du chapitre (max 200 caractères)
- description : description courte ou null

Exemple :
[{"classe":"6ème","subject":"Maths","chapter_name":"Nombres décimaux et fractions","description":"Comparaison, calcul, proportionnalité"},{"classe":"6ème","subject":"Français","chapter_name":"Lecture et compréhension","description":"Textes littéraires et documentaires"}]

Tu DOIS inclure TOUTES ces matières pour chaque classe : Maths, Français, Histoire-Géo, SVT, Physique-Chimie, Anglais, Espagnol, Arts, EPS.
Cycle 3 = 6ème. Cycle 4 = 5ème, 4ème, 3ème.
Utilise le programme officiel en vigueur pour l'année scolaire ACTUELLE (rentrée 2025, arrêté du 17-7-2020).
Génère au moins 40 chapitres couvrant les programmes officiels, avec plusieurs chapitres par matière.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'PERPLEXITY_API_KEY manquante. Configure la dans Supabase > Edge Functions > Secrets.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cycles = body.cycles || ['Cycle 3', 'Cycle 4'];
    const classe = body.classe || null;
    const subject = body.subject || null;

    let userPrompt = `Donne-moi le programme scolaire officiel français du collège pour les cycles : ${cycles.join(', ')}.
Programme en vigueur année scolaire 2025-2026 (rentrée 2025). Liste tous les chapitres par matière et par niveau (classe).`;
    if (classe && ['6ème', '5ème', '4ème', '3ème'].includes(classe)) {
      userPrompt = `Donne-moi le programme scolaire officiel français du collège pour la classe ${classe} uniquement.
Programme en vigueur année scolaire 2025-2026 (rentrée 2025). Cycle 3 = 6ème. Cycle 4 = 5ème, 4ème, 3ème.`;
      if (subject) {
        userPrompt += ` Liste UNIQUEMENT les chapitres pour la matière "${subject}".`;
      } else {
        userPrompt += ` Liste tous les chapitres par matière pour cette classe.`;
      }
    }

    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || data?.detail || JSON.stringify(data);
      return new Response(
        JSON.stringify({ error: `Perplexity API: ${errMsg}` }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Réponse vide de Perplexity', raw: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extraire le JSON (parfois entouré de markdown ou de texte)
    let jsonStr = content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    let chapters: ProgrammeChapter[];
    try {
      chapters = JSON.parse(jsonStr);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Impossible de parser la réponse JSON de Perplexity',
          raw: content.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(chapters)) {
      return new Response(
        JSON.stringify({ error: 'Réponse non-tableau', chapters }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validClasses = ['6ème', '5ème', '4ème', '3ème'];
    const cleaned = chapters
      .filter((c) => c && typeof c.classe === 'string' && typeof c.chapter_name === 'string')
      .map((c) => ({
        classe: validClasses.includes(c.classe) ? c.classe : (c.classe?.includes('6') ? '6ème' : '5ème'),
        subject: subject ? String(subject).slice(0, 100) : String(c.subject || 'Programme général').slice(0, 100),
        chapter_name: String(c.chapter_name).slice(0, 200),
        description: c.description ? String(c.description).slice(0, 500) : null,
      }));

    return new Response(
      JSON.stringify({ chapters: cleaned, count: cleaned.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
