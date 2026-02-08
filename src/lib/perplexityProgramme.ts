/**
 * Scraping du programme collège via Perplexity (remplace l'API Éducation nationale)
 * Appelle l'Edge Function scrape-programme-perplexity qui utilise l'API Perplexity
 */
import { supabase } from './supabase';

export interface ProgrammeChapter {
  classe: string;
  subject: string;
  chapter_name: string;
  description: string | null;
}

/** Appelle l'Edge Function pour récupérer le programme via Perplexity */
export async function scrapeProgrammeViaPerplexity(
  cycles: ('Cycle 3' | 'Cycle 4')[] = ['Cycle 3', 'Cycle 4'],
  classe?: string | null,
  subject?: string | null,
  signal?: AbortSignal
): Promise<{ chapters: ProgrammeChapter[] | null; error: string | null }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-programme-perplexity`;
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cycles, classe: classe || undefined, subject: subject || undefined }),
      signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { chapters: null, error: data?.error || `Erreur ${res.status}` };
    }

    if (data?.error) {
      return { chapters: null, error: data.error };
    }

    const chapters = data?.chapters;
    if (!Array.isArray(chapters)) {
      return { chapters: null, error: 'Format de réponse invalide' };
    }

    return { chapters, error: null };
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { chapters: null, error: 'Scraping annulé' };
    }
    return { chapters: null, error: (e as Error).message };
  }
}
