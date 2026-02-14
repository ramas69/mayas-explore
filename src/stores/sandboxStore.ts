import { create } from 'zustand';

interface SandboxState {
  elements: any[]; // Simplified JSON elements for SVG
  imageToLoad: string | null;
  lastMissionVictory: { artifactName: string; xp: number } | null;

  loadImage: (url: string) => void;
  clearImageToLoad: () => void;
  addElements: (newElements: any[]) => void;
  setElements: (elements: any[]) => void;
  getElements: () => any[];
  setLastMissionVictory: (payload: { artifactName: string; xp: number } | null) => void;
  dismissVictory: () => void;
  resetSandbox: () => void;
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  elements: [],
  imageToLoad: null,
  lastMissionVictory: null,

  loadImage: (url) => {
    console.log('[SandboxStore] loadImage', url?.slice(0, 80) + '...');
    set({ imageToLoad: url });
  },

  clearImageToLoad: () => set({ imageToLoad: null }),

  addElements: (newElements) => {
    console.log('[SandboxStore] addElements', { count: newElements?.length });
    if (!newElements?.length) return;
    set((state) => ({ elements: [...state.elements, ...newElements] }));
  },

  setElements: (elements) => set({ elements }),

  getElements: () => get().elements,

  setLastMissionVictory: (payload) => set({ lastMissionVictory: payload }),

  dismissVictory: () => set({ lastMissionVictory: null }),

  resetSandbox: () => {
    set({
      elements: [],
      imageToLoad: null,
    });
  },
}));
