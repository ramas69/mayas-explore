// Edge Function: analyze-planning
// L'IA analyse l'emploi du temps (image ou PDF) et propose des créneaux de révision hebdomadaires
// Identifie les plages libres (pas de cours) et suggère des créneaux optimaux

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

interface ProposedSlot {
  day: number; // 0 = dimanche, 1 = lundi, ...
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  subject?: string;  // matière suggérée (optionnel)
}

interface PlanningExtracted {
  slots: ProposedSlot[];
  vacation_slots?: ProposedSlot[]; // créneaux pendant les vacances (horaires différents)
  reasoning?: string;
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

const MAX_MINUTES_PER_DAY = 120;

function slotMinutes(s: ProposedSlot): number {
  const [sh, sm] = (s.startTime || '00:00').split(':').map(Number);
  const [eh, em] = (s.endTime || '00:00').split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function capSlotsToMaxPerDay(slots: ProposedSlot[], maxMinutes: number): ProposedSlot[] {
  const byDay = new Map<number, { slot: ProposedSlot; mins: number }[]>();
  for (const s of slots) {
    const mins = Math.max(0, slotMinutes(s));
    if (!byDay.has(s.day)) byDay.set(s.day, []);
    byDay.get(s.day)!.push({ slot: s, mins });
  }
  const result: ProposedSlot[] = [];
  for (const [, list] of byDay) {
    let total = 0;
    for (const { slot, mins } of list) {
      if (total + mins <= maxMinutes) {
        result.push(slot);
        total += mins;
      }
    }
  }
  return result.sort((a, b) => (a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)));
}

/** Hors vacances : danger = 30 min, autres (surveiller/reviser/ok) = 20 min. Vacances : idem. */
function generateBalancedSlots(
  bulletinSubjects: { name: string; status?: string }[],
  isVacation: boolean
): ProposedSlot[] {
  const need30 = bulletinSubjects.filter((s) => (s.status || 'ok') === 'danger').length;
  const need20 = bulletinSubjects.filter((s) => ['surveiller', 'reviser', 'ok'].includes((s.status || 'ok') as string)).length;
  const count30 = Math.max(need30 * 2, 4);
  const count20 = Math.max(need20 * 2, 6);

  const toMins = (h: number, m: number) => h * 60 + m;
  const overlaps = (startA: string, endA: string, startB: string, endB: string) => {
    const [ah, am] = startA.split(':').map(Number);
    const [aEh, aEm] = endA.split(':').map(Number);
    const [bh, bm] = startB.split(':').map(Number);
    const [bEh, bEm] = endB.split(':').map(Number);
    const aS = toMins(ah, am), aE = toMins(aEh, aEm);
    const bS = toMins(bh, bm), bE = toMins(bEh, bEm);
    return aS < bE && aE > bS;
  };

  const buildSlots = (dur: number, count: number, base: { day: number; start: string }[]): ProposedSlot[] => {
    const slots: ProposedSlot[] = [];
    const byDay = new Map<number, { startTime: string; endTime: string }[]>();
    for (let i = 0; i < count && i < base.length * 3; i++) {
      const b = base[i % base.length];
      const [sh, sm] = b.start.split(':').map(Number);
      const endM = sm + dur;
      const endH = sh + Math.floor(endM / 60);
      const endStr = `${String(endH).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
      const existing = byDay.get(b.day) ?? [];
      const hasOverlap = existing.some((e) => overlaps(b.start, endStr, e.startTime, e.endTime));
      const dailyTotal = existing.reduce((sum, e) => {
        const [eh, em] = e.endTime.split(':').map(Number);
        const [esH, esM] = e.startTime.split(':').map(Number);
        return sum + (toMins(eh, em) - toMins(esH, esM));
      }, 0);
      if (!hasOverlap && dailyTotal + dur <= MAX_MINUTES_PER_DAY) {
        slots.push({ day: b.day, startTime: b.start, endTime: endStr });
        existing.push({ startTime: b.start, endTime: endStr });
        byDay.set(b.day, existing);
      }
    }
    return slots;
  };

  const base30 = isVacation
    ? [ { day: 1, start: '14:00' }, { day: 2, start: '14:00' }, { day: 3, start: '14:00' }, { day: 4, start: '14:00' }, { day: 5, start: '14:00' }, { day: 6, start: '14:00' },
        { day: 1, start: '14:35' }, { day: 2, start: '14:35' }, { day: 3, start: '14:35' }, { day: 4, start: '14:35' }, { day: 5, start: '14:35' }, { day: 6, start: '14:35' },
        { day: 1, start: '15:10' }, { day: 2, start: '15:10' }, { day: 3, start: '15:10' }, { day: 4, start: '15:10' }, { day: 5, start: '15:10' }, { day: 6, start: '15:10' } ]
    : [ { day: 3, start: '14:00' }, { day: 5, start: '10:00' }, { day: 1, start: '18:30' }, { day: 2, start: '18:30' }, { day: 4, start: '18:30' }, { day: 6, start: '09:00' },
        { day: 3, start: '14:35' }, { day: 5, start: '10:35' }, { day: 1, start: '19:05' }, { day: 2, start: '19:05' }, { day: 4, start: '19:05' }, { day: 6, start: '09:35' },
        { day: 3, start: '15:10' }, { day: 5, start: '11:10' }, { day: 1, start: '19:40' }, { day: 2, start: '19:40' }, { day: 4, start: '19:40' }, { day: 6, start: '10:10' } ];
  const base20 = isVacation
    ? [ { day: 1, start: '15:45' }, { day: 2, start: '15:45' }, { day: 3, start: '15:45' }, { day: 4, start: '15:45' }, { day: 5, start: '15:45' }, { day: 6, start: '15:45' },
        { day: 1, start: '16:10' }, { day: 2, start: '16:10' }, { day: 3, start: '16:10' }, { day: 4, start: '16:10' }, { day: 5, start: '16:10' }, { day: 6, start: '16:10' } ]
    : [ { day: 3, start: '15:45' }, { day: 5, start: '11:45' }, { day: 1, start: '20:15' }, { day: 2, start: '20:15' }, { day: 4, start: '20:15' }, { day: 6, start: '10:45' },
        { day: 3, start: '16:10' }, { day: 5, start: '12:10' }, { day: 1, start: '20:40' }, { day: 2, start: '20:40' }, { day: 4, start: '20:40' }, { day: 6, start: '11:10' } ];

  const slots30 = buildSlots(30, count30, base30);
  const slots20 = buildSlots(20, count20, base20);
  const combined = [...slots30, ...slots20].sort((a, b) => (a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)));
  const byDay = new Map<number, ProposedSlot[]>();
  for (const s of combined) {
    const list = byDay.get(s.day) ?? [];
    if (list.length < 2) list.push(s);
    byDay.set(s.day, list);
  }
  return [...byDay.values()].flat().sort((a, b) => (a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)));
}

const SYSTEM_PROMPT = `Tu es un ingénieur pédagogique et professeur de collège. Tu conçois des plannings de révision équilibrés pour aider l'élève à progresser dans TOUTES les matières.

RÔLE : Tu proposes des créneaux de révision hebdomadaires qui couvrent l'ensemble des matières (danger, surveiller, reviser, ok) de façon équilibrée : plus de créneaux pour les matières en difficulté, mais INCLUSION de toutes les matières pour consolider et maintenir le niveau.

RÈGLE CRITIQUE - BUFFER APRÈS LA FIN DES COURS :
Si l'enfant termine à 17h ou 17h30, il est IMPOSSIBLE de réviser juste après :
- Trajet école-maison : 15 à 30 min
- Goûter / pause : 15 à 20 min
- Temps de repos : 10 à 15 min
→ Minimum 1h30 après la fin des cours avant de proposer une révision.
Exemple : si les cours finissent à 17h ou 17h30, ne propose PAS de créneau avant 18h30 ou 19h au plus tôt.

Objectif : identifier les plages réellement libres (après trajet, goûter, repos) et proposer des créneaux variés pour couvrir toutes les matières.
- Durées possibles : quiz 15 min, révision courte 30 min, révision standard 1h. Varie les durées pour équilibrer (ex : 2×30 min + 1×1h = 2h/jour).
- Privilégie : mercredi après-midi, samedi matin, soirées avec buffer suffisant après les cours
- Jours : 0 = dimanche, 1 = lundi, 2 = mardi, 3 = mercredi, 4 = jeudi, 5 = vendredi, 6 = samedi
- Heures au format HH:mm (ex: 18:30, 19:00, 14:00)

Retourne UNIQUEMENT un JSON valide, sans markdown :
{
  "slots": [ { "day": 3, "startTime": "14:00", "endTime": "15:00" }, ... ],
  "vacation_slots": [ { "day": 1, "startTime": "10:00", "endTime": "11:00" }, ... ],
  "reasoning": "court résumé (optionnel)"
}

VACANCES (OBLIGATOIRE) — "vacation_slots" : créneaux PENDANT les vacances scolaires. Les révisions se font APRÈS 13h :
- AUCUN créneau avant 13:00. Varie les durées : quiz 15 min (ex: 14:00-14:15), révision 30 min (14:30-15:00), révision 1h (15:30-16:30).
- 6 à 12 créneaux répartis sur Lundi-Samedi. Max 2h de révision par jour.

Règles :
- day : 0 à 6 (0 = dimanche)
- startTime et endTime : HH:mm (format 24h)
- Jamais de créneau dans les 1h30 suivant la fin des cours (trajet + goûter + repos)
- subject : optionnel, matière prioritaire si identifiable
- Propose des créneaux variés : 15 min (quiz), 30 min, 1h. Plus de créneaux courts = plus de matières couvertes.
- LIMITE ABSOLUE : maximum 2h de révision par jour. Ne propose jamais plus de 2h de créneaux pour un même jour.
- ÉQUILIBRE PÉDAGOGIQUE : Si des matières sont fournies (bulletin), propose assez de créneaux pour que TOUTES apparaissent : danger et surveiller en priorité, mais aussi reviser et ok. Un bon planning couvre toutes les matières de la semaine.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return err('OPENAI_API_KEY non configurée.');
    }

    const { fileUrl, fileType, studentId, cityZone, pageImageUrls, bulletinSubjects } = await req.json();

    if (!fileUrl && !pageImageUrls?.length) {
      return err('fileUrl ou pageImageUrls requis');
    }

    const bulletinHint = Array.isArray(bulletinSubjects) && bulletinSubjects.length > 0
      ? ` Matières de l'élève à couvrir (statut = priorité) : ${bulletinSubjects.map((s: { name: string; status?: string }) => `${s.name}(${s.status || 'ok'})`).join(', ')}. Propose assez de créneaux pour que TOUTES ces matières soient révisées chaque semaine, avec plus de créneaux pour danger/surveiller.`
      : '';

    let messages: { role: string; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[];

    if (fileType === 'image') {
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyse cet emploi du temps scolaire. Identifie les plages libres et propose 3 à 6 créneaux de révision par semaine (format JSON demandé).${bulletinHint}` },
            { type: 'image_url', image_url: { url: fileUrl } },
          ],
        },
      ];
    } else if (fileType === 'pdf_pages' && pageImageUrls?.length > 0) {
      const contentParts: { type: string; text?: string; image_url?: { url: string } }[] = [
        { type: 'text', text: `Voici les ${pageImageUrls.length} pages de l'emploi du temps. Analyse-les et propose 3 à 6 créneaux de révision par semaine (format JSON demandé).${bulletinHint}` },
        ...pageImageUrls.map((url: string) => ({ type: 'image_url', image_url: { url } })),
      ];
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: contentParts },
      ];
    } else if (fileType === 'pdf' && fileUrl) {
      const pdfResponse = await fetch(fileUrl);
      if (!pdfResponse.ok) return err('Impossible de télécharger le PDF.');
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const bytes = new Uint8Array(pdfBuffer);
      const base64 = toBase64(bytes);

      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'file', file: { filename: 'planning.pdf', file_data: `data:application/pdf;base64,${base64}` } },
            { type: 'text', text: `Analyse cet emploi du temps. Propose 3 à 6 créneaux de révision par semaine (format JSON demandé).${bulletinHint}` },
          ],
        },
      ];
    } else {
      return err('Type non supporté. Utilise image ou pdf.');
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
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errData = await openaiResponse.text();
      return err(`OpenAI: ${errData.slice(0, 200)}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) return err('Réponse OpenAI vide');

    let parsed: PlanningExtracted;
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      return err('Réponse invalide (JSON)');
    }

    // Valider slots
    if (!Array.isArray(parsed.slots)) parsed.slots = [];
    parsed.slots = parsed.slots.filter((s: ProposedSlot) =>
      typeof s.day === 'number' && s.day >= 0 && s.day <= 6 &&
      typeof s.startTime === 'string' && typeof s.endTime === 'string'
    );
    // Valider vacation_slots
    if (!Array.isArray(parsed.vacation_slots)) parsed.vacation_slots = [];
    parsed.vacation_slots = parsed.vacation_slots.filter((s: ProposedSlot) =>
      typeof s.day === 'number' && s.day >= 0 && s.day <= 6 &&
      typeof s.startTime === 'string' && typeof s.endTime === 'string'
    );

    // Fallback : vacation_slots = uniquement après 13h. Filtrer ou régénérer si invalides.
    parsed.vacation_slots = parsed.vacation_slots.filter((s) => {
      const h = parseInt((s.startTime || '00').split(':')[0], 10);
      return h >= 13 && h < 17;
    });
    if (parsed.vacation_slots.length < 4) {
      parsed.vacation_slots = [
        { day: 1, startTime: '14:00', endTime: '14:15' }, { day: 1, startTime: '14:30', endTime: '15:00' }, { day: 1, startTime: '15:30', endTime: '16:30' },
        { day: 2, startTime: '14:00', endTime: '14:30' }, { day: 2, startTime: '15:00', endTime: '16:00' },
        { day: 3, startTime: '14:00', endTime: '14:15' }, { day: 3, startTime: '14:30', endTime: '15:00' }, { day: 3, startTime: '15:30', endTime: '16:30' },
        { day: 4, startTime: '14:00', endTime: '14:30' }, { day: 4, startTime: '15:00', endTime: '16:00' },
        { day: 5, startTime: '14:00', endTime: '14:15' }, { day: 5, startTime: '14:30', endTime: '15:30' },
        { day: 6, startTime: '14:00', endTime: '14:30' }, { day: 6, startTime: '15:00', endTime: '16:00' },
      ];
    }

    const subs = Array.isArray(bulletinSubjects) ? bulletinSubjects : [];
    if (subs.length > 0) {
      parsed.slots = generateBalancedSlots(subs, false);
      parsed.vacation_slots = generateBalancedSlots(subs, true);
    } else {
      parsed.slots = capSlotsToMaxPerDay(parsed.slots, MAX_MINUTES_PER_DAY);
      parsed.vacation_slots = capSlotsToMaxPerDay(parsed.vacation_slots, MAX_MINUTES_PER_DAY);
    }

    return ok(parsed);
  } catch (e) {
    return err((e as Error).message);
  }
});
