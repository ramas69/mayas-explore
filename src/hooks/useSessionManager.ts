import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getProfile, calculateDailyUsage, startSession } from '../lib/supabase';
import type { Subject, Curriculum } from '../types';

export function useSessionManager() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<Curriculum | null>(null);

    const checkDailyLimit = async (): Promise<boolean> => {
        if (!user?.id) return false;

        console.log('[SessionManager] Checking profile limits...');
        const { data: profile } = await getProfile(user.id);
        const limit = (profile as { daily_time_limit?: number } | null)?.daily_time_limit ?? 120;

        console.log('[SessionManager] Calculating daily usage...');
        const dailyUsed = await calculateDailyUsage(user.id);
        console.log('[SessionManager] Daily usage:', { dailyUsed, limit });

        if (dailyUsed >= limit) {
            alert('Limite journalière atteinte. Reviens demain, explorateur ! 🌅');
            return false;
        }
        return true;
    };

    const startNewSession = async (subject: Subject, chapterName: string, chapterObj?: Curriculum) => {
        if (!user?.id) return;

        // Optimistic UI: switch to chat immediately
        navigate('/app/chat');

        const canProceed = await checkDailyLimit();
        if (!canProceed) return;

        console.log('[SessionManager] Starting session for:', { subject, chapterName });
        const { data: session, error } = await startSession(user.id, subject, chapterName);

        if (error) {
            console.error('[SessionManager] startSession error:', error);
            alert('Impossible de démarrer la session. Réessaie.');
            return;
        }

        if (session) {
            console.log('[SessionManager] Session started:', session.id);
            setCurrentSessionId(session.id);

            // If we provided a full chapter object, use it. Otherwise create a temporary one.
            if (chapterObj) {
                setSelectedChapter(chapterObj);
            } else {
                // Fallback for manual selection (Guardian Picker)
                setSelectedChapter({
                    id: `guardian-${subject}`,
                    student_id: user.id,
                    subject,
                    chapter_name: subject, // Or specific chapter if we knew it
                    source: 'manual',
                    status: 'pas_vu',
                    order_index: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            }
        }
    };

    return {
        currentSessionId,
        setCurrentSessionId,
        selectedChapter,
        setSelectedChapter,
        startNewSession
    };
}
