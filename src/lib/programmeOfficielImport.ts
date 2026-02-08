/**
 * Import du programme officiel depuis l'API Éducation nationale (data.education.gouv.fr)
 */
import { supabase } from './supabase';
import { API_PROGRAMMES_EDUCATION, getCyclesForClasse } from './programmeScolaire';
import type { Classe } from '../types';

export interface ProgrammeImportRecord {
  id: string;
  student_id: string;
  cycle: string;
  discipline: string;
  descriptif: string;
  contenu_url: string | null;
  texte_officiel: string | null;
  entre_en_vigueur: string | null;
  imported_at: string;
}

/** Réponse API data.education.gouv.fr */
interface ApiRecord {
  descriptif: string;
  niveau_d_enseignement: string;
  discipline: string;
  contenu_sur_le_site?: string | null;
  texte_officiel?: string | null;
  entre_en_vigueur_a_la_rentree?: string | null;
}

/** Récupère les programmes officiels depuis l'API Éducation nationale */
export async function fetchProgrammeOfficiel(cycles: ('Cycle 3' | 'Cycle 4')[]): Promise<ApiRecord[]> {
  const allRecords: ApiRecord[] = [];

  for (const cycle of cycles) {
    const params = new URLSearchParams({
      where: `niveau_d_enseignement = "${cycle}"`,
      limit: '50',
    });
    const res = await fetch(`${API_PROGRAMMES_EDUCATION}?${params}`);
    const json = await res.json();
    if (json.results && Array.isArray(json.results)) {
      allRecords.push(
        ...json.results.map((r: ApiRecord) => ({
          descriptif: r.descriptif || '',
          niveau_d_enseignement: r.niveau_d_enseignement || cycle,
          discipline: r.discipline ?? '-',
          contenu_sur_le_site: r.contenu_sur_le_site ?? null,
          texte_officiel: r.texte_officiel ?? null,
          entre_en_vigueur_a_la_rentree: r.entre_en_vigueur_a_la_rentree ?? null,
        }))
      );
    }
  }

  return allRecords;
}

/** Importe les programmes dans la base et retourne les enregistrements */
export async function importProgrammeOfficiel(
  studentId: string,
  classe: Classe | string | null
): Promise<{ data: ProgrammeImportRecord[] | null; error: Error | null }> {
  const cycles = getCyclesForClasse(classe);

  const records = await fetchProgrammeOfficiel(cycles);
  if (records.length === 0) {
    return { data: null, error: new Error('Aucune donnée reçue de l\'API') };
  }

  // Supprimer les anciens imports
  await supabase.from('programme_officiel_importe').delete().eq('student_id', studentId);

  // Garder uniquement la version 2020 (rentrée en vigueur actuelle)
  const records2020 = records.filter(
    (r) => r.entre_en_vigueur_a_la_rentree === '2020' || (r.texte_officiel && r.texte_officiel.includes('17-7-2020'))
  );
  const toInsert = records2020.length > 0 ? records2020 : records.slice(0, 5);

  const rows = toInsert.map((r) => ({
    student_id: studentId,
    cycle: r.niveau_d_enseignement,
    discipline: r.discipline,
    descriptif: r.descriptif,
    contenu_url: r.contenu_sur_le_site || null,
    texte_officiel: r.texte_officiel || null,
    entre_en_vigueur: r.entre_en_vigueur_a_la_rentree || null,
  }));

  const { data: inserted, error } = await supabase
    .from('programme_officiel_importe')
    .insert(rows)
    .select();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: inserted as ProgrammeImportRecord[], error: null };
}

/** Récupère les programmes importés pour un élève */
export async function getProgrammeImport(
  studentId: string
): Promise<{ data: ProgrammeImportRecord[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('programme_officiel_importe')
    .select('*')
    .eq('student_id', studentId)
    .order('cycle')
    .order('discipline');

  return { data: (data as ProgrammeImportRecord[]) || null, error };
}
