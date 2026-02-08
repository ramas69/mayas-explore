/**
 * Groupes de matières pour les mentors (image 2).
 * Chaque mentor a un groupe de matières et un nom unique.
 * Tous les mentors partagent le même avatar.
 */
import type { Subject } from '../types';

export interface MentorGroup {
  id: string;
  name: string;
  subjects: Subject[];
}

export const MENTOR_GROUPS: MentorGroup[] = [
  { id: 'runes', name: 'Runes Numériques', subjects: ['Maths', 'Technologie'] },
  { id: 'glyphes', name: 'Glyphes Anciens', subjects: ['Français'] },
  { id: 'chroniques', name: 'Chroniques Oubliées', subjects: ['Histoire-Géo'] },
  { id: 'potions', name: 'Potions Mayas', subjects: ['SVT', 'Physique-Chimie'] },
  { id: 'langages', name: 'Langages Perdus', subjects: ['Anglais', 'Espagnol'] },
  { id: 'creations', name: 'Créations Sacrées', subjects: ['Arts', 'EPS', 'Musique', 'Théologie'] },
];

/** Avatar partagé par tous les mentors */
export const MENTOR_AVATAR = '/mentor-avatar.png';

/** Nom du mentor par groupe (chaque mentor a un nom différent) */
export const MENTOR_NAMES: Record<string, string> = {
  runes: 'Maître des Runes Numériques',
  glyphes: 'Gardien des Glyphes Anciens',
  chroniques: 'Chroniqueur des Civilisations',
  potions: 'Alchimiste des Potions Mayas',
  langages: 'Traducteur des Langages Perdus',
  creations: 'Artisan des Créations Sacrées',
};

export function getMentorForSubject(subject: Subject): { group: MentorGroup; name: string } | null {
  const group = MENTOR_GROUPS.find((g) => g.subjects.includes(subject));
  if (!group) return null;
  return { group, name: MENTOR_NAMES[group.id] ?? group.name };
}
