/**
 * API pour le Super Admin - accès à toutes les données
 */
import { supabase } from './supabase';

export interface AdminSource {
  id: string;
  name: string;
  type: 'programme_api' | 'programme_scrape' | 'bulletin' | 'planning';
  url: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeCollegeGlobal {
  id: string;
  classe: string;
  subject: string;
  chapter_name: string;
  description: string | null;
  source_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/** Récupère toutes les statistiques globales */
export async function getAdminStats() {
  const [profilesRes, curriculumRes, bulletinsRes, sessionsRes] = await Promise.all([
    supabase.from('profiles').select('id, role, email, full_name, created_at', { count: 'exact' }),
    supabase.from('curriculum').select('id', { count: 'exact', head: true }),
    supabase.from('bulletin_analyses').select('id', { count: 'exact', head: true }),
    supabase.from('sessions').select('id', { count: 'exact', head: true }),
  ]);

  const profiles = profilesRes.data || [];
  const parents = profiles.filter((p: { role: string }) => p.role === 'parent').length;
  const enfants = profiles.filter((p: { role: string }) => p.role === 'enfant').length;

  return {
    totalUsers: (profilesRes as any).count ?? profiles.length,
    parents,
    enfants,
    superAdmins: profiles.filter((p: { role: string }) => p.role === 'super_admin').length,
    totalCurriculum: (curriculumRes as any).count ?? 0,
    totalBulletins: (bulletinsRes as any).count ?? 0,
    totalSessions: (sessionsRes as any).count ?? 0,
    recentProfiles: profiles.slice(0, 20),
  };
}

/** Liste tous les profils (super admin) */
export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

/** Liste les parents avec leurs enfants */
export async function getParentsWithChildren() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, parent_id, parent_email, is_approved, classe, created_at')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  const parents = (profiles || []).filter((p: any) => p.role === 'parent');
  const enfants = (profiles || []).filter((p: any) => p.role === 'enfant');

  const parentsWithChildren = parents.map((p: any) => ({
    ...p,
    children: enfants.filter((e: any) => e.parent_id === p.id || e.parent_email === p.email),
  }));

  return { data: parentsWithChildren, error: null };
}

/** Statut d'un enfant pour affichage */
export function getChildStatus(child: { parent_id?: string | null; parent_email?: string | null; is_approved?: boolean }): string {
  if (!child.parent_id && child.parent_email) return 'En attente (parent à lier)';
  if (child.parent_id && child.is_approved) return 'Inscrit';
  if (child.parent_id && !child.is_approved) return 'En attente d\'approbation';
  return 'Inscription';
}

/** Récupère les stats d'un enfant (XP, sessions, matières préférées) */
export async function getChildStats(studentId: string) {
  const [sessionsRes, gamificationRes] = await Promise.all([
    supabase.from('sessions').select('*').eq('student_id', studentId).order('start_at', { ascending: true }),
    supabase.from('gamification').select('*').eq('student_id', studentId).single(),
  ]);

  const sessions = (sessionsRes.data || []) as { start_at: string; xp_earned: number; subject?: string }[];
  const gamification = gamificationRes.data as { xp: number; rank: string } | null;

  const xpByDate: { date: string; xp: number }[] = [];
  const dateMap = new Map<string, number>();
  for (const s of sessions) {
    const d = s.start_at.slice(0, 10);
    dateMap.set(d, (dateMap.get(d) || 0) + (s.xp_earned || 0));
  }
  const sortedDates = [...dateMap.keys()].sort();
  let cumul = 0;
  for (const d of sortedDates) {
    cumul += dateMap.get(d) || 0;
    xpByDate.push({ date: d, xp: cumul });
  }

  const bySubject: Record<string, { count: number; xp: number }> = {};
  for (const s of sessions) {
    const subj = s.subject || 'Autre';
    if (!bySubject[subj]) bySubject[subj] = { count: 0, xp: 0 };
    bySubject[subj].count++;
    bySubject[subj].xp += s.xp_earned || 0;
  }
  const favoriteSubjects = Object.entries(bySubject)
    .sort((a, b) => b[1].xp - a[1].xp)
    .slice(0, 5);

  return {
    totalXP: gamification?.xp ?? 0,
    rank: gamification?.rank ?? '—',
    sessionsCount: sessions.length,
    xpEvolution: xpByDate,
    favoriteSubjects,
  };
}

/** Récupère les sources admin */
export async function getAdminSources() {
  const { data, error } = await supabase
    .from('admin_sources')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as AdminSource[] | null, error };
}

/** Crée ou met à jour une source */
export async function upsertAdminSource(source: Partial<AdminSource> & { name: string; type: AdminSource['type'] }) {
  const payload = {
    name: source.name,
    type: source.type,
    url: source.url ?? null,
    config: source.config ?? {},
    is_active: source.is_active ?? true,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = source.id
    ? await supabase.from('admin_sources').update(payload).eq('id', source.id).select().single()
    : await supabase.from('admin_sources').insert(payload).select().single();
  return { data: data as AdminSource | null, error };
}

/** Supprime une source */
export async function deleteAdminSource(id: string) {
  return supabase.from('admin_sources').delete().eq('id', id);
}

/** Récupère le programme collège global */
export async function getProgrammeCollegeGlobal(classe?: string) {
  let query = supabase.from('programme_college_global').select('*').order('subject').order('order_index');
  if (classe) query = query.eq('classe', classe);
  const { data, error } = await query;
  return { data: data as ProgrammeCollegeGlobal[] | null, error };
}

/** Insère ou met à jour le programme collège global (depuis le scraping) */
export async function upsertProgrammeCollegeGlobal(chapters: Omit<ProgrammeCollegeGlobal, 'id' | 'created_at' | 'updated_at'>[]) {
  const rows = chapters.map((c) => ({
    ...c,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase.from('programme_college_global').upsert(rows, { onConflict: 'id' }).select();
  return { data, error };
}
