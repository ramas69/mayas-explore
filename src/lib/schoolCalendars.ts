/**
 * Calendrier scolaire français par zone (A, B, C) — Lyon = Zone A
 * Dates officielles (Ministère de l'Éducation nationale)
 * Utilise la date ACTUELLE pour afficher l'année scolaire en cours
 */

import type { SchoolZone } from '../types';

export interface VacationPeriod {
  name: string;
  start: Date;
  end: Date;
}

// Zone A : Besançon, Bordeaux, Clermont, Dijon, Grenoble, Limoges, Lyon, Poitiers
// Zone B : Aix-Marseille, Amiens, Caen, Lille, Nancy-Metz, Nantes, Nice, Orléans-Tours, Reims, Rennes, Rouen, Strasbourg
// Zone C : Créteil, Montpellier, Paris, Toulouse, Versailles

// Année scolaire 2025-2026 (dates officielles)
const ZONE_A_2025_2026: VacationPeriod[] = [
  { name: 'Toussaint', start: new Date('2025-10-18'), end: new Date('2025-11-03') },
  { name: 'Noël', start: new Date('2025-12-20'), end: new Date('2026-01-05') },
  { name: 'Hiver', start: new Date('2026-02-07'), end: new Date('2026-02-23') },
  { name: 'Printemps', start: new Date('2026-04-04'), end: new Date('2026-04-20') },
  { name: 'Pont Ascension', start: new Date('2026-05-13'), end: new Date('2026-05-18') },
  { name: 'Été', start: new Date('2026-07-04'), end: new Date('2026-09-01') },
];

const ZONE_B_2025_2026: VacationPeriod[] = [
  { name: 'Toussaint', start: new Date('2025-10-18'), end: new Date('2025-11-03') },
  { name: 'Noël', start: new Date('2025-12-20'), end: new Date('2026-01-05') },
  { name: 'Hiver', start: new Date('2026-02-21'), end: new Date('2026-03-09') },
  { name: 'Printemps', start: new Date('2026-04-11'), end: new Date('2026-04-27') },
  { name: 'Pont Ascension', start: new Date('2026-05-13'), end: new Date('2026-05-18') },
  { name: 'Été', start: new Date('2026-07-04'), end: new Date('2026-09-01') },
];

const ZONE_C_2025_2026: VacationPeriod[] = [
  { name: 'Toussaint', start: new Date('2025-10-18'), end: new Date('2025-11-03') },
  { name: 'Noël', start: new Date('2025-12-20'), end: new Date('2026-01-05') },
  { name: 'Hiver', start: new Date('2026-02-28'), end: new Date('2026-03-16') },
  { name: 'Printemps', start: new Date('2026-04-18'), end: new Date('2026-05-04') },
  { name: 'Pont Ascension', start: new Date('2026-05-13'), end: new Date('2026-05-18') },
  { name: 'Été', start: new Date('2026-07-04'), end: new Date('2026-09-01') },
];

// Année scolaire 2026-2027 (dates officielles)
const ZONE_A_2026_2027: VacationPeriod[] = [
  { name: 'Toussaint', start: new Date('2026-10-17'), end: new Date('2026-11-02') },
  { name: 'Noël', start: new Date('2026-12-19'), end: new Date('2027-01-04') },
  { name: 'Hiver', start: new Date('2027-02-13'), end: new Date('2027-03-01') },
  { name: 'Printemps', start: new Date('2027-04-10'), end: new Date('2027-04-26') },
  { name: 'Pont Ascension', start: new Date('2027-05-05'), end: new Date('2027-05-10') },
  { name: 'Été', start: new Date('2027-07-03'), end: new Date('2027-09-01') },
];

const ZONE_B_2026_2027: VacationPeriod[] = [
  { name: 'Toussaint', start: new Date('2026-10-17'), end: new Date('2026-11-02') },
  { name: 'Noël', start: new Date('2026-12-19'), end: new Date('2027-01-04') },
  { name: 'Hiver', start: new Date('2027-02-20'), end: new Date('2027-03-08') },
  { name: 'Printemps', start: new Date('2027-04-17'), end: new Date('2027-05-03') },
  { name: 'Pont Ascension', start: new Date('2027-05-05'), end: new Date('2027-05-10') },
  { name: 'Été', start: new Date('2027-07-03'), end: new Date('2027-09-01') },
];

const ZONE_C_2026_2027: VacationPeriod[] = [
  { name: 'Toussaint', start: new Date('2026-10-17'), end: new Date('2026-11-02') },
  { name: 'Noël', start: new Date('2026-12-19'), end: new Date('2027-01-04') },
  { name: 'Hiver', start: new Date('2027-02-27'), end: new Date('2027-03-15') },
  { name: 'Printemps', start: new Date('2027-04-24'), end: new Date('2027-05-10') },
  { name: 'Pont Ascension', start: new Date('2027-05-05'), end: new Date('2027-05-10') },
  { name: 'Été', start: new Date('2027-07-03'), end: new Date('2027-09-01') },
];

// Index 0 = 2025-2026, 1 = 2026-2027 (années futures)
const ZONE_VACATIONS: Record<SchoolZone, VacationPeriod[][]> = {
  A: [ZONE_A_2025_2026, ZONE_A_2026_2027],
  B: [ZONE_B_2025_2026, ZONE_B_2026_2027],
  C: [ZONE_C_2025_2026, ZONE_C_2026_2027],
};

/** Détermine l'index de l'année scolaire selon la date actuelle (sept = rentrée) */
function getSchoolYearIndex(): 0 | 1 {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  // Si on est entre sept (8) et août (7) inclus : année scolaire en cours
  // sept 2025 -> août 2026 = index 0 (2025-2026)
  // sept 2026 -> août 2027 = index 1 (2026-2027)
  if (month >= 8) {
    // sept à déc : début année scolaire
    return year === 2025 ? 0 : 1;
  }
  // jan à août : fin année scolaire
  return year === 2026 ? 0 : year === 2027 ? 1 : 0;
}

/** Retourne les vacances pour UNE zone donnée (A, B ou C) — jamais les 3 zones */
export function getVacations(zone: SchoolZone, schoolYearIndex?: 0 | 1): VacationPeriod[] {
  if (!zone || !ZONE_VACATIONS[zone]) return [];
  const idx = schoolYearIndex ?? getSchoolYearIndex();
  return ZONE_VACATIONS[zone][idx] ?? ZONE_VACATIONS[zone][0];
}

/** Vérifie si une date est en période de vacances — utilise UNIQUEMENT la zone passée (celle du planning) */
export function isVacation(date: Date, zone: SchoolZone): boolean {
  if (!zone || !ZONE_VACATIONS[zone]) return false;
  const vacations = [...getVacations(zone, 0), ...getVacations(zone, 1)];
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return vacations.some((v) => d >= new Date(v.start.getFullYear(), v.start.getMonth(), v.start.getDate()) && d <= new Date(v.end.getFullYear(), v.end.getMonth(), v.end.getDate()));
}

/** Prochaine période de vacances (selon la date actuelle) — pour la zone uniquement */
export function getNextVacation(zone: SchoolZone): VacationPeriod | null {
  if (!zone || !ZONE_VACATIONS[zone]) return null;
  const now = new Date();
  const vacations = [...getVacations(zone, 0), ...getVacations(zone, 1)];
  const next = vacations.find((v) => new Date(v.end) > now);
  return next ?? null;
}
