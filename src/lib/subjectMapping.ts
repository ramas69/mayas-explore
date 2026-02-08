/**
 * Mapping bulletin → Subject pour aligner les noms extraits des bulletins
 * avec les matières affichées sur la carte.
 */
import type { Subject } from '../types';

/** Variantes courantes des noms de matières dans les bulletins français */
const BULLETIN_TO_SUBJECT: Record<string, Subject> = {
  // Maths
  maths: 'Maths',
  mathématiques: 'Maths',
  math: 'Maths',
  // Français
  français: 'Français',
  francais: 'Français',
  // Histoire-Géo
  'histoire-géo': 'Histoire-Géo',
  'histoire-geo': 'Histoire-Géo',
  'histoire-géographie': 'Histoire-Géo',
  'histoire-geographie': 'Histoire-Géo',
  histoire: 'Histoire-Géo',
  géographie: 'Histoire-Géo',
  geographie: 'Histoire-Géo',
  emc: 'Histoire-Géo',
  'éducation morale et civique': 'Histoire-Géo',
  // SVT
  svt: 'SVT',
  'sciences de la vie et de la terre': 'SVT',
  'sciences de la vie': 'SVT',
  'sciences et vie de la terre': 'SVT',
  biologie: 'SVT',
  // Physique-Chimie
  'physique-chimie': 'Physique-Chimie',
  'physique chimie': 'Physique-Chimie',
  physique: 'Physique-Chimie',
  chimie: 'Physique-Chimie',
  'sciences physiques': 'Physique-Chimie',
  // Anglais
  anglais: 'Anglais',
  'anglais lv1': 'Anglais',
  lv1: 'Anglais',
  // Espagnol
  espagnol: 'Espagnol',
  'espagnol lv2': 'Espagnol',
  lv2: 'Espagnol',
  // Théologie
  théologie: 'Théologie',
  theologie: 'Théologie',
  religion: 'Théologie',
  'éducation religieuse': 'Théologie',
  'education religieuse': 'Théologie',
  // Arts (arts plastiques uniquement)
  arts: 'Arts',
  'arts plastiques': 'Arts',
  'histoire des arts': 'Arts',
  // Musique (séparé de Arts)
  'éducation musicale': 'Musique',
  'education musicale': 'Musique',
  musique: 'Musique',
  'éducation physique et sport': 'EPS',
  'education physique et sport': 'EPS',
  'éducation physique & sport': 'EPS',
  'education physique & sport': 'EPS',
  // EPS
  eps: 'EPS',
  'éducation physique et sportive': 'EPS',
  'education physique et sportive': 'EPS',
  'éducation physique': 'EPS',
  'education physique': 'EPS',
  sport: 'EPS',
  // SVT
  'sciences vie & terre': 'SVT',
  'sciences vie et terre': 'SVT',
  // Technologie
  technologie: 'Technologie',
};

/**
 * Normalise un nom de matière du bulletin vers notre type Subject.
 */
export function normalizeBulletinSubject(name: string): Subject | null {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  return BULLETIN_TO_SUBJECT[key] ?? null;
}

/**
 * Extrait les matières uniques du bulletin et les normalise.
 * Retourne les Subject valides trouvés (dans l'ordre du bulletin).
 */
export function getSubjectsFromBulletin(
  subjects: { name: string }[] | undefined
): Subject[] {
  if (!subjects?.length) return [];
  const seen = new Set<Subject>();
  const result: Subject[] = [];
  for (const s of subjects) {
    const normalized = normalizeBulletinSubject(s.name);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

/**
 * Trouve les données bulletin pour une matière (Subject) en acceptant
 * les noms variés du bulletin.
 */
export function findBulletinDataForSubject<T extends { name: string }>(
  subjects: T[] | undefined,
  subject: Subject
): T | null {
  if (!subjects?.length) return null;
  const subjectLower = subject.toLowerCase();
  for (const s of subjects) {
    const name = String(s.name || '').trim();
    const nameLower = name.toLowerCase();
    if (nameLower === subjectLower) return s;
    const normalized = normalizeBulletinSubject(name);
    if (normalized === subject) return s;
  }
  return null;
}
