// Edge Function: analyze-bulletin
// Analyse les bulletins avec OpenAI (GPT-4o Vision : images + PDF via base64)
// Nécessite OPENAI_API_KEY dans les secrets Supabase
// PDF : envoyé en base64 à OpenAI (pas unpdf, incompatible Deno Edge)

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    out += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(out);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulletinSubjectRaw {
  name: string;
  trend?: 'up' | 'down' | 'stable';
  priority?: 'high' | 'medium' | 'low';
  status?: 'ok' | 'reviser' | 'surveiller' | 'danger';
  gauge_niveau?: number | null;
}

interface BulletinSubject extends BulletinSubjectRaw {
  grade: number;
}

// Note sur 20 déduite du status (moyenne des status pour arriver à 20)
const STATUS_TO_GRADE: Record<string, number> = {
  ok: 18,
  reviser: 14,
  surveiller: 10,
  danger: 6,
};

// Jauge 0-5 déduite du status (pour affichage)
const STATUS_TO_GAUGE: Record<string, number> = {
  ok: 5,
  reviser: 4,
  surveiller: 2,
  danger: 1,
};

interface BulletinExtracted {
  subjects: BulletinSubject[];
  overall_average: number;
  weak_points: string[];
  recommendations: string[];
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return err('OPENAI_API_KEY non configurée. Déploie avec: supabase secrets set OPENAI_API_KEY=sk-...');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return err('Non authentifié. Reconnecte-toi.');
    }

    const { fileUrl, fileType, studentId, pageImageUrls } = await req.json();

    if (!fileUrl && !pageImageUrls?.length) {
      return err('fileUrl ou pageImageUrls requis');
    }

    const systemPrompt = `Tu es une IA experte en analyse de bulletins scolaires français (collège/lycée).

IMPORTANT : Le bulletin peut avoir PLUSIEURS PAGES. Analyse TOUTES les pages.
Pour CHAQUE matière, détermine UNIQUEMENT le STATUS (4 niveaux) selon les indicateurs visuels (barres, couleurs) :
  • "ok" = vert dominant, niveau correct
  • "reviser" = orange léger, à réviser
  • "surveiller" = beaucoup d'orange/rouge, à surveiller
  • "danger" = beaucoup de rouge, urgence

Ne calcule PAS les notes toi-même. La note sera déduite automatiquement du status.
Retourne UNIQUEMENT un JSON valide, sans markdown :
{
  "subjects": [
    {
      "name": "Nom de la matière",
      "trend": "up"|"down"|"stable",
      "priority": "high"|"medium"|"low",
      "status": "ok"|"reviser"|"surveiller"|"danger",
      "gauge_niveau": niveau jauge 0-5 si visible (sinon null)
    }
  ],
  "weak_points": ["point faible 1", "point faible 2"],
  "recommendations": ["recommandation 1", "recommandation 2"]
}

Règles :
- Matières : utilise ces noms : "Maths", "Français", "Histoire-Géo", "SVT", "Physique-Chimie", "Anglais", "Espagnol", "Théologie", "Arts", "Musique", "Technologie", "EPS".
- "status" : ok = vert, reviser = orange léger, surveiller = orange/rouge intermédiaire, danger = rouge.
- "priority" : high = danger, medium = surveiller ou reviser, low = ok.
- N'inclus PAS "grade" ni "overall_average" dans ta réponse.`;


    let messages: { role: string; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[];

    if (fileType === 'image') {
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyse ce bulletin. Inclus toutes les matières, signale les notes rouges. Extrais les informations au format JSON demandé.' },
            { type: 'image_url', image_url: { url: fileUrl } },
          ],
        },
      ];
    } else if (fileType === 'pdf_pages' && pageImageUrls?.length > 0) {
      // PDF chunké : chaque page = 1 image. Analyse TOUTES les pages.
      const contentParts: { type: string; text?: string; image_url?: { url: string } }[] = [
        { type: 'text', text: `Voici les ${pageImageUrls.length} pages du bulletin. Analyse TOUTES les pages et liste TOUTES les matières. Signale les notes rouges (< 10). Extrais les informations au format JSON demandé.` },
        ...pageImageUrls.map((url: string) => ({ type: 'image_url', image_url: { url } })),
      ];
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentParts },
      ];
    } else if (fileType === 'pdf') {
      // PDF: fetch + base64, puis envoi direct à OpenAI (native PDF support, pas unpdf)
      const pdfResponse = await fetch(fileUrl);
      if (!pdfResponse.ok) {
        return err('Impossible de télécharger le PDF. Vérifie que le bucket est public.');
      }
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const bytes = new Uint8Array(pdfBuffer);
      const base64 = toBase64(bytes);

      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file: {
                filename: 'bulletin.pdf',
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
            {
              type: 'text',
              text: 'Analyse TOUTES les pages de ce bulletin de notes scolaire. Inclus toutes les matières, y compris celles sur les pages 2, 3, etc. Signale les notes rouges (faibles). Extrais les informations au format JSON demandé.',
            },
          ],
        },
      ];
    } else {
      return err('Type de fichier non supporté. Utilise une image (PNG/JPG) ou un PDF.');
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errData = await openaiResponse.text();
      return err(`OpenAI API: ${openaiResponse.status} - ${errData.slice(0, 200)}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return err('Réponse OpenAI vide');
    }

    let parsed: { subjects?: BulletinSubjectRaw[]; overall_average?: number; weak_points?: string[]; recommendations?: string[] };
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      return err('Réponse OpenAI invalide (JSON)');
    }

    // Calculer grade, gauge_niveau et overall_average à partir des status uniquement (sans pastilles)
    const subjects: BulletinSubject[] = (parsed.subjects || []).map((s) => {
      const status = (s.status ?? (s.priority === 'high' ? 'danger' : s.priority === 'medium' ? 'reviser' : 'ok')) as keyof typeof STATUS_TO_GRADE;
      const grade = STATUS_TO_GRADE[status] ?? 10;
      const gauge_niveau = s.gauge_niveau ?? STATUS_TO_GAUGE[status] ?? 3;
      return { ...s, trend: s.trend ?? 'stable', priority: s.priority ?? 'medium', status, grade, gauge_niveau };
    });
    const overall_average = subjects.length > 0
      ? Math.round((subjects.reduce((acc, s) => acc + s.grade, 0) / subjects.length) * 10) / 10
      : 0;
    const result: BulletinExtracted = {
      subjects,
      overall_average,
      weak_points: parsed.weak_points ?? [],
      recommendations: parsed.recommendations ?? [],
    };

    // Normaliser les noms de matières pour correspondre au référentiel
    const SUBJECT_MAP: Record<string, string> = {
      maths: 'Maths', mathématiques: 'Maths', math: 'Maths',
      français: 'Français', francais: 'Français',
      'histoire-géo': 'Histoire-Géo', 'histoire-geo': 'Histoire-Géo',
      'histoire-géographie': 'Histoire-Géo', 'histoire-geographie': 'Histoire-Géo',
      histoire: 'Histoire-Géo', géographie: 'Histoire-Géo', geographie: 'Histoire-Géo', emc: 'Histoire-Géo',
      svt: 'SVT', 'sciences de la vie et de la terre': 'SVT', 'sciences vie & terre': 'SVT', biologie: 'SVT',
      'physique-chimie': 'Physique-Chimie', 'physique chimie': 'Physique-Chimie',
      physique: 'Physique-Chimie', chimie: 'Physique-Chimie',
      anglais: 'Anglais', 'anglais lv1': 'Anglais', lv1: 'Anglais',
      espagnol: 'Espagnol', 'espagnol lv2': 'Espagnol', lv2: 'Espagnol',
      théologie: 'Théologie', theologie: 'Théologie', religion: 'Théologie',
      arts: 'Arts', 'arts plastiques': 'Arts', 'éducation musicale': 'Musique', musique: 'Musique',
      technologie: 'Technologie',
      eps: 'EPS', 'éducation physique': 'EPS', 'education physique': 'EPS',
      'éducation physique & sport': 'EPS', 'éducation physique et sport': 'EPS', sport: 'EPS',
    };
    result.subjects = result.subjects.map((s) => {
      const key = String(s.name || '').trim().toLowerCase();
      const normalized = SUBJECT_MAP[key] ?? s.name;
      return { ...s, name: normalized };
    });

    return ok(result);
  } catch (e) {
    return err((e as Error).message);
  }
});
