import { create } from 'zustand';
import { startSession, endSession, getSessions, getProfile, calculateDailyUsage as calcDailyUsage } from '../lib/supabase';
import type { Session, Subject } from '../types';

interface SessionState {
  currentSession: Session | null;
  sessions: Session[];
  isActive: boolean;
  startTime: Date | null;
  elapsedMinutes: number;
  dailyMinutesUsed: number;
  
  // Actions
  startNewSession: (studentId: string, subject?: Subject, chapter?: string) => Promise<void>;
  endCurrentSession: (studentId: string, xpEarned: number, artifacts: string[]) => Promise<void>;
  loadSessions: (studentId: string) => Promise<void>;
  updateElapsedTime: () => void;
  calculateDailyUsage: (studentId: string) => Promise<number>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  sessions: [],
  isActive: false,
  startTime: null,
  elapsedMinutes: 0,
  dailyMinutesUsed: 0,

  startNewSession: async (studentId: string, subject?: Subject, chapter?: string) => {
    const { data: profile } = await getProfile(studentId);
    const limit = (profile as { daily_time_limit?: number } | null)?.daily_time_limit ?? 120;
    const dailyUsed = await calcDailyUsage(studentId);
    if (dailyUsed >= limit) {
      throw new Error('Limite journalière atteinte. Reviens demain, explorateur ! 🌅');
    }

    const { data, error } = await startSession(studentId, subject, chapter);
    
    if (error) throw error;
    
    if (data) {
      set({
        currentSession: data,
        isActive: true,
        startTime: new Date(),
        elapsedMinutes: 0,
        dailyMinutesUsed: dailyUsed,
      });

      // Start timer
      const timer = setInterval(() => {
        get().updateElapsedTime();
      }, 60000); // Update every minute

      // Store timer reference
      (window as any).sessionTimer = timer;
    }
  },

  endCurrentSession: async (studentId: string, xpEarned: number, artifacts: string[]) => {
    const { currentSession } = get();
    if (!currentSession) return;

    // Clear timer
    if ((window as any).sessionTimer) {
      clearInterval((window as any).sessionTimer);
    }

    await endSession(currentSession.id, xpEarned, artifacts);

    set({
      currentSession: null,
      isActive: false,
      startTime: null,
      elapsedMinutes: 0,
    });

    // Reload sessions
    await get().loadSessions(studentId);
  },

  loadSessions: async (studentId: string) => {
    const { data } = await getSessions(studentId);
    if (data) {
      set({ sessions: data });
    }
  },

  updateElapsedTime: () => {
    const { startTime, dailyMinutesUsed } = get();
    if (startTime) {
      const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 60000);
      set({
        elapsedMinutes: elapsed,
        dailyMinutesUsed: dailyMinutesUsed + elapsed,
      });
    }
  },

  calculateDailyUsage: async (studentId: string) => {
    return calcDailyUsage(studentId);
  },
}));
