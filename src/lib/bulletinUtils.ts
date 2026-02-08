/**
 * Utilitaires bulletin - alignés avec analyze-bulletin (STATUS_TO_GRADE).
 * La note est toujours déduite du statut pour garantir la cohérence.
 */
import type { BulletinSubjectStatus } from '../types';

/** Note sur 20 déduite du statut (même logique que supabase/functions/analyze-bulletin) */
export const STATUS_TO_GRADE: Record<string, number> = {
  ok: 18,
  reviser: 14,
  surveiller: 10,
  danger: 6,
};

/**
 * Calcule la note /20 à partir du statut bulletin.
 * Utilisé partout (cart es, modal) pour garantir la cohérence avec le mode calcul.
 */
export function getGradeFromStatus(status?: BulletinSubjectStatus | string | null): number {
  if (!status) return 10;
  return STATUS_TO_GRADE[String(status)] ?? 10;
}
