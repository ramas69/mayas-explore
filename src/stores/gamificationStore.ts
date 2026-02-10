import { create } from 'zustand';
import { addXP, addArtifact, evolveTemple, getGamification } from '../lib/supabase';
import type { Gamification, Artifact } from '../types';

interface GamificationState {
  gamification: Gamification | null;
  isLoading: boolean;
  currentXP: number;
  showReward: boolean;
  lastReward: { type: 'xp'; value: number } | { type: 'artifact'; value: Artifact } | { type: 'temple'; value: number } | null;

  // Actions
  loadGamification: (studentId: string) => Promise<void>;
  earnXP: (studentId: string, amount: number) => Promise<void>;
  collectArtifact: (studentId: string, artifact: Artifact) => Promise<void>;
  evolveTempleStage: (studentId: string, stage: number) => Promise<void>;
  dismissReward: () => void;
  /** Affiche le reward modal pour une mission complétée (DB déjà mis à jour par l'Edge Function) */
  showMissionReward: (studentId: string, artifact: Artifact, xp: number) => Promise<void>;
}

// XP thresholds for temple evolution
const TEMPLE_EVOLUTION_THRESHOLDS = [0, 500, 1000, 2500, 5000, 10000];

export const useGamificationStore = create<GamificationState>((set, get) => ({
  gamification: null,
  isLoading: false,
  currentXP: 0,
  showReward: false,
  lastReward: null,

  loadGamification: async (studentId: string) => {
    set({ isLoading: true });
    const { data } = await getGamification(studentId);
    if (data) {
      set({ gamification: data, currentXP: data.xp, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  earnXP: async (studentId: string, amount: number) => {
    const { gamification } = get();
    if (!gamification) return;

    const oldStage = gamification.temple_evolution_stage;
    const newXP = gamification.xp + amount;

    // Calculate new stage
    let newStage = oldStage;
    for (let i = TEMPLE_EVOLUTION_THRESHOLDS.length - 1; i >= 0; i--) {
      if (newXP >= TEMPLE_EVOLUTION_THRESHOLDS[i]) {
        newStage = i;
        break;
      }
    }

    await addXP(studentId, amount);

    set({
      gamification: { ...gamification, xp: newXP },
      currentXP: newXP,
      showReward: true,
      lastReward: { type: 'xp', value: amount },
    });

    // Auto-evolve temple if threshold reached
    if (newStage > oldStage) {
      await evolveTemple(studentId, newStage);
      set({
        gamification: { ...gamification, xp: newXP, temple_evolution_stage: newStage },
        showReward: true,
        lastReward: { type: 'temple', value: newStage },
      });
    }
  },

  collectArtifact: async (studentId: string, artifact: Artifact) => {
    const { gamification } = get();
    if (!gamification) return;

    await addArtifact(studentId, artifact);

    set({
      gamification: {
        ...gamification,
        artifacts_collected: [...gamification.artifacts_collected, artifact],
      },
      showReward: true,
      lastReward: { type: 'artifact', value: artifact },
    });
  },

  evolveTempleStage: async (studentId: string, stage: number) => {
    const { gamification } = get();
    if (!gamification) return;

    await evolveTemple(studentId, stage);

    set({
      gamification: { ...gamification, temple_evolution_stage: stage },
      showReward: true,
      lastReward: { type: 'temple', value: stage },
    });
  },

  dismissReward: () => {
    set({ showReward: false, lastReward: null });
  },

  showMissionReward: async (studentId: string, artifact: Artifact) => {
    set({ showReward: true, lastReward: { type: 'artifact' as const, value: artifact } });
    get().loadGamification(studentId);
  },
}));
