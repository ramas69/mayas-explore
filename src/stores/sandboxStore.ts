import { create } from 'zustand';

export type ExcalidrawAPI = {
  updateScene: (opts: { elements?: unknown[]; appState?: Record<string, unknown>; captureUpdate?: string }) => void;
  getSceneElements: () => unknown[];
  addFiles?: (files: { id: string; mimeType: string; dataURL: string }[]) => void;
};

interface SandboxState {
  excalidrawAPI: ExcalidrawAPI | null;
  elements: unknown[];
  pendingElements: unknown[];
  imageToLoad: string | null;
  lastMissionVictory: { artifactName: string; xp: number } | null;
  setExcalidrawAPI: (api: ExcalidrawAPI | null) => void;
  loadImage: (url: string) => void;
  clearImageToLoad: () => void;
  appendToScene: (elementsToAdd: unknown[]) => void;
  addElements: (newElements: unknown[]) => void;
  setElements: (elements: unknown[]) => void;
  getElements: () => unknown[];
  setLastMissionVictory: (payload: { artifactName: string; xp: number } | null) => void;
  dismissVictory: () => void;
  /** Réinitialise le Grimoire (appelé au changement de session pour éviter les fuites de données) */
  resetSandbox: () => void;
}

/** Pour que les updates soient undoables (commitToHistory) */
const CAPTURE_IMMEDIATELY = 'IMMEDIATELY' as const;

export const useSandboxStore = create<SandboxState>((set, get) => ({
  excalidrawAPI: null,
  elements: [],
  pendingElements: [],
  imageToLoad: null,
  lastMissionVictory: null,

  loadImage: (url) => {
    console.log('[SandboxStore] loadImage', url?.slice(0, 80) + '...');
    set({ imageToLoad: url });
  },
  clearImageToLoad: () => set({ imageToLoad: null }),

  setExcalidrawAPI: (api) => {
    set({ excalidrawAPI: api });
    const { pendingElements } = get();
    console.log('[SandboxStore] setExcalidrawAPI', { hasApi: !!api, pendingCount: pendingElements.length });
    if (api && pendingElements.length > 0) {
      console.log('[SandboxStore] flush pending au mount');
      get().addElements(pendingElements);
      set({ pendingElements: [] });
    }
  },

  appendToScene: (elementsToAdd) => {
    const { excalidrawAPI } = get();
    if (!excalidrawAPI?.getSceneElements || !excalidrawAPI?.updateScene) return;
    const current = excalidrawAPI.getSceneElements() as unknown[];
    const merged = [...current, ...elementsToAdd];
    excalidrawAPI.updateScene({ elements: merged, captureUpdate: CAPTURE_IMMEDIATELY });
    set({ elements: merged });
  },

  /** Fusionne les nouveaux éléments IA avec le canvas existant (dessins élève + grille). */
  addElements: (newElements) => {
    const { excalidrawAPI } = get();
    console.log('[SandboxStore] addElements', { count: newElements?.length, hasAPI: !!excalidrawAPI });
    if (!newElements?.length) return;
    if (excalidrawAPI?.getSceneElements && excalidrawAPI?.updateScene) {
      const current = excalidrawAPI.getSceneElements() as unknown[];
      const merged = [...current, ...newElements];
      console.log('[SandboxStore] updateScene appelé', { currentCount: current.length, mergedCount: merged.length });
      excalidrawAPI.updateScene({ elements: merged, captureUpdate: CAPTURE_IMMEDIATELY });
      set({ elements: merged });
    } else {
      console.log('[SandboxStore] API non dispo, mise en pending');
      set((s) => ({ pendingElements: [...s.pendingElements, ...newElements] }));
    }
  },

  setElements: (elements) => set({ elements }),

  getElements: () => get().elements,

  setLastMissionVictory: (payload) => set({ lastMissionVictory: payload }),

  dismissVictory: () => set({ lastMissionVictory: null }),

  resetSandbox: () => {
    set({
      elements: [],
      pendingElements: [],
      imageToLoad: null,
      excalidrawAPI: null,
    });
  },
}));
