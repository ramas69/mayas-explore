import { supabase } from './supabase';

// ============================================
// Types
// ============================================

export interface StudentAnswer {
    id: string;
    student_id: string;
    session_id: string;
    message_id?: string;
    question: string;
    question_topic?: string;
    question_difficulty?: 'easy' | 'medium' | 'hard';
    student_answer: string;
    evaluation: 'correct' | 'partial' | 'incorrect';
    evaluation_details?: {
        reasoning?: string;
        mistakes?: string[];
        strengths?: string[];
    };
    xp_awarded: number;
    retry_count: number;
    mastered: boolean;
    created_at: string;
}

export interface RetryQueueItem {
    id: string;
    student_id: string;
    question_topic: string;
    original_question?: string;
    original_answer_id?: string;
    retry_at: string;
    priority: number;
    status: 'pending' | 'completed' | 'skipped';
    completed_at?: string;
    created_at: string;
}

export interface StudentStreak {
    id: string;
    student_id: string;
    current_streak: number;
    best_streak: number;
    last_answer_date?: string;
    last_answer_correct?: boolean;
    total_questions_answered: number;
    total_correct_answers: number;
    created_at: string;
    updated_at: string;
}

export interface TopicMastery {
    id: string;
    student_id: string;
    topic: string;
    subject?: string;
    total_attempts: number;
    correct_attempts: number;
    success_rate: number;
    mastered: boolean;
    mastered_at?: string;
    last_attempt_at?: string;
    last_attempt_correct?: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================
// Barème XP
// ============================================

export const XP_REWARDS = {
    // Réponse correcte du premier coup
    correct_first_try: {
        easy: 10,
        medium: 20,
        hard: 30,
    },

    // Réponse correcte après 1 erreur
    correct_second_try: {
        easy: 5,
        medium: 10,
        hard: 15,
    },

    // Réponse correcte après 2+ erreurs
    correct_after_retries: {
        easy: 3,
        medium: 5,
        hard: 8,
    },

    // Réponse partiellement correcte
    partial: {
        easy: 3,
        medium: 5,
        hard: 10,
    },

    // Bonus pour série de bonnes réponses
    streak_bonus: {
        3: 10, // 3 bonnes réponses d'affilée
        5: 25, // 5 bonnes réponses d'affilée
        10: 50, // 10 bonnes réponses d'affilée
        20: 100, // 20 bonnes réponses d'affilée
    },
};

// ============================================
// Calcul des XP selon l'évaluation
// ============================================

export function calculateXP(
    evaluation: 'correct' | 'partial' | 'incorrect',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    retryCount: number = 0
): number {
    if (evaluation === 'incorrect') return 0;

    if (evaluation === 'partial') {
        return XP_REWARDS.partial[difficulty];
    }

    // Réponse correcte
    if (retryCount === 0) {
        return XP_REWARDS.correct_first_try[difficulty];
    } else if (retryCount === 1) {
        return XP_REWARDS.correct_second_try[difficulty];
    } else {
        return XP_REWARDS.correct_after_retries[difficulty];
    }
}

// ============================================
// Sauvegarder une réponse évaluée
// ============================================

export async function saveStudentAnswer(answer: Omit<StudentAnswer, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('student_answers')
        .insert(answer)
        .select()
        .single();

    if (error) {
        console.error('[evaluationUtils] saveStudentAnswer error:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ============================================
// Récupérer les erreurs récentes d'un élève
// ============================================

export async function getRecentErrors(studentId: string, limit: number = 10) {
    const { data, error } = await supabase
        .from('student_answers')
        .select('*')
        .eq('student_id', studentId)
        .eq('evaluation', 'incorrect')
        .eq('mastered', false)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[evaluationUtils] getRecentErrors error:', error);
        return { data: [], error };
    }

    return { data: data as StudentAnswer[], error: null };
}

// ============================================
// Récupérer les points forts d'un élève
// ============================================

export async function getStrengths(studentId: string, minSuccessRate: number = 80) {
    const { data, error } = await supabase
        .from('topic_mastery')
        .select('*')
        .eq('student_id', studentId)
        .gte('success_rate', minSuccessRate)
        .gte('total_attempts', 3)
        .order('success_rate', { ascending: false });

    if (error) {
        console.error('[evaluationUtils] getStrengths error:', error);
        return { data: [], error };
    }

    return { data: data as TopicMastery[], error: null };
}

// ============================================
// Récupérer les points faibles d'un élève
// ============================================

export async function getWeakPoints(studentId: string) {
    const { data, error } = await supabase
        .from('student_weak_points')
        .select('*')
        .eq('student_id', studentId)
        .order('success_rate', { ascending: true })
        .limit(10);

    if (error) {
        console.error('[evaluationUtils] getWeakPoints error:', error);
        return { data: [], error };
    }

    return { data, error: null };
}

// ============================================
// Programmer une révision
// ============================================

const RETRY_SCHEDULE_MINUTES = {
    0: 5, // 1ère erreur : 5 minutes
    1: 30, // 2ème erreur : 30 minutes
    2: 1440, // 3ème erreur : 24 heures
    3: 10080, // 4ème erreur : 7 jours
};

export async function scheduleRetry(
    studentId: string,
    topic: string,
    originalQuestion: string,
    originalAnswerId: string,
    errorCount: number
) {
    const delayMinutes = RETRY_SCHEDULE_MINUTES[Math.min(errorCount, 3) as 0 | 1 | 2 | 3] || 10080;
    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    const { data, error } = await supabase
        .from('retry_queue')
        .insert({
            student_id: studentId,
            question_topic: topic,
            original_question: originalQuestion,
            original_answer_id: originalAnswerId,
            retry_at: retryAt.toISOString(),
            priority: errorCount + 1,
            status: 'pending',
        })
        .select()
        .single();

    if (error) {
        console.error('[evaluationUtils] scheduleRetry error:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ============================================
// Récupérer les questions à reposer maintenant
// ============================================

export async function getPendingRetries(studentId: string) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('retry_queue')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .lte('retry_at', now)
        .order('priority', { ascending: false })
        .order('retry_at', { ascending: true })
        .limit(5);

    if (error) {
        console.error('[evaluationUtils] getPendingRetries error:', error);
        return { data: [], error };
    }

    return { data: data as RetryQueueItem[], error: null };
}

// ============================================
// Marquer une révision comme complétée
// ============================================

export async function markRetryCompleted(retryId: string) {
    const { data, error } = await supabase
        .from('retry_queue')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
        .eq('id', retryId)
        .select()
        .single();

    if (error) {
        console.error('[evaluationUtils] markRetryCompleted error:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ============================================
// Récupérer la série actuelle d'un élève
// ============================================

export async function getStreak(studentId: string) {
    const { data, error } = await supabase
        .from('student_streaks')
        .select('*')
        .eq('student_id', studentId)
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (normal si première fois)
        console.error('[evaluationUtils] getStreak error:', error);
        return { data: null, error };
    }

    return {
        data: data as StudentStreak | null,
        error: null,
    };
}

// ============================================
// Calculer le bonus de série
// ============================================

export function getStreakBonus(currentStreak: number): number {
    const bonuses = Object.entries(XP_REWARDS.streak_bonus)
        .map(([streak, xp]) => ({ streak: parseInt(streak), xp }))
        .sort((a, b) => b.streak - a.streak);

    for (const { streak, xp } of bonuses) {
        if (currentStreak === streak) {
            return xp;
        }
    }

    return 0;
}

// ============================================
// Récupérer le nombre d'erreurs sur un topic
// ============================================

export async function getErrorCount(studentId: string, topic: string) {
    const { data, error } = await supabase
        .from('student_answers')
        .select('id')
        .eq('student_id', studentId)
        .eq('question_topic', topic)
        .eq('evaluation', 'incorrect');

    if (error) {
        console.error('[evaluationUtils] getErrorCount error:', error);
        return 0;
    }

    return data?.length || 0;
}

// ============================================
// Marquer un topic comme maîtrisé
// ============================================

export async function markTopicAsMastered(studentId: string, topic: string) {
    const { data, error } = await supabase
        .from('topic_mastery')
        .update({
            mastered: true,
            mastered_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .eq('topic', topic)
        .select()
        .single();

    if (error) {
        console.error('[evaluationUtils] markTopicAsMastered error:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ============================================
// Récupérer les statistiques par matière
// ============================================

export async function getSubjectStats(studentId: string) {
    const { data, error } = await supabase
        .from('student_subject_stats')
        .select('*')
        .eq('student_id', studentId);

    if (error) {
        console.error('[evaluationUtils] getSubjectStats error:', error);
        return { data: [], error };
    }

    return { data, error: null };
}

// ============================================
// Récupérer le taux de réussite global
// ============================================

export async function getGlobalSuccessRate(studentId: string) {
    const { data: streak } = await getStreak(studentId);

    if (!streak || streak.total_questions_answered === 0) {
        return 0;
    }

    return Math.round((streak.total_correct_answers / streak.total_questions_answered) * 100);
}
