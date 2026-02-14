import { useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { calculateDailyUsage, startSession } from '../lib/supabase';
import type { Subject, Curriculum } from '../types';

export function useSessionManager() {
    const { user } = useAuthStore();
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<Curriculum | null>(null);

    const checkDailyLimit = useCallback(async (): Promise<boolean> => {
        if (!user?.id) return false;

        console.log('[SessionManager] Checking profile limits from store...');
        // Profile is already in authStore, no need to fetch
        const limit = user.daily_time_limit ?? 120;

        console.log('[SessionManager] Calculating daily usage...');
        try {
            const dailyUsed = await calculateDailyUsage(user.id);
            console.log('[SessionManager] Daily usage:', { dailyUsed, limit });

            if (dailyUsed >= limit) {
                alert('Limite journalière atteinte. Reviens demain, explorateur ! 🌅');
                return false;
            }
            return true;
        } catch (error) {
            console.error('[SessionManager] calculateDailyUsage error:', error);
            // In case of error (e.g. network), we might want to allow or block. 
            // Let's allow for now to avoid blocking user if stats fail.
            return true;
        }
    }, [user?.id, user?.daily_time_limit]);

    const startNewSession = useCallback(async (subject: Subject, chapterName: string, chapterObj?: Curriculum) => {
        if (!user?.id) return;

        // Optimistic UI: switch to chat immediately -> Managed by router now
        // navigate('/app/chat');

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
    }, [user?.id, checkDailyLimit]);

    return {
        currentSessionId,
        setCurrentSessionId,
        selectedChapter,
        setSelectedChapter,
        startNewSession
    };
}
