// Types pour Maya Explorer EdTech

export type UserRole = 'parent' | 'enfant' | 'super_admin';
export type Subject = 'Maths' | 'Français' | 'Histoire-Géo' | 'SVT' | 'Physique-Chimie' | 'Anglais' | 'Espagnol' | 'Théologie' | 'Arts' | 'EPS' | 'Musique' | 'Technologie';
export type ChapterStatus = 'pas_vu' | 'vu_en_classe' | 'maitrise';
export type SchoolZone = 'A' | 'B' | 'C';

export type Classe = '6ème' | '5ème' | '4ème' | '3ème';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  parent_id?: string | null;
  parent_email?: string | null; // email du parent quand élève s'inscrit seul (en attente)
  is_approved: boolean;
  daily_time_limit: number; // en minutes, défaut 120
  full_name?: string;
  avatar_url?: string;
  classe?: Classe | string | null; // collège uniquement
  created_at: string;
  updated_at: string;
}

export interface Curriculum {
  id: string;
  student_id: string;
  subject: Subject;
  chapter_name: string;
  source: 'official' | 'manual';
  status: ChapterStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Gamification {
  id: string;
  student_id: string;
  xp: number;
  rank: string;
  artifacts_collected: Artifact[];
  temple_evolution_stage: number;
  avatar_equipment: AvatarEquipment;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked_at: string;
}

export interface AvatarEquipment {
  compass: boolean;
  backpack: boolean;
  hat: boolean;
  boots: boolean;
  torch: boolean;
  map: boolean;
}

export interface Planning {
  id: string;
  student_id: string;
  city_zone: SchoolZone;
  weekly_slots: WeeklySlot[];
  missed_sessions_count: number;
  intensified_vacation_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklySlot {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = dimanche
  startTime: string; // HH:mm
  duration: number; // minutes
  subject?: Subject;
  isVacation: boolean;
}

export interface Session {
  id: string;
  student_id: string;
  start_at: string;
  end_at?: string;
  duration_minutes?: number;
  subject?: Subject;
  chapter?: string;
  xp_earned: number;
  artifacts_found: string[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  has_drawing?: boolean;
  drawing_data?: any;
}

export type BulletinSubjectStatus = 'ok' | 'reviser' | 'surveiller' | 'danger';

export interface BulletinAnalysis {
  id: string;
  student_id: string;
  semester?: string; // ex: "2024-S1", "2024-S2"
  file_url: string;
  file_name?: string | null;
  file_type: 'pdf' | 'image';
  extracted_data: {
    subjects: {
      name: Subject;
      grade: number;
      trend: 'up' | 'down' | 'stable';
      priority: 'high' | 'medium' | 'low';
      status?: BulletinSubjectStatus;
      gauge_niveau?: number | null;
    }[];
    overall_average: number;
    weak_points: string[];
    recommendations: string[];
  };
  created_at: string;
}

export interface TempleNode {
  id: string;
  subject: Subject;
  chapter: string;
  status: ChapterStatus;
  position: { x: number; y: number; z: number };
  connections: string[];
  is_unlocked: boolean;
  xp_reward: number;
}

export interface ParentNote {
  id: string;
  parent_id: string;
  student_id: string;
  content: string;
  objective?: string;
  created_at: string;
}
