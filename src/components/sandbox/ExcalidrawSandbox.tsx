import { useRef, useEffect, useCallback } from 'react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useSandboxStore } from '../../stores/sandboxStore';
import { VictoryOverlay } from './VictoryOverlay';

interface ExcalidrawSandboxProps {
  sessionId: string | null;
  initialData?: { elements: unknown[]; appState?: Record<string, unknown> } | null;
  onSaveSnapshot?: (snapshot: { elements: unknown[]; appState?: Record<string, unknown> }) => void;
  readOnly?: boolean;
}

export function ExcalidrawSandbox({
  sessionId: _sessionId,
  initialData,
  onSaveSnapshot,
  readOnly = false,
}: ExcalidrawSandboxProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setExcalidrawAPI, setElements, excalidrawAPI, pendingElements, addElements, imageToLoad, clearImageToLoad } =
    useSandboxStore();

  useEffect(() => {
    if (excalidrawAPI && pendingElements.length > 0) {
      addElements(pendingElements);
      useSandboxStore.setState({ pendingElements: [] });
    }
  }, [excalidrawAPI, pendingElements, addElements]);

  useEffect(() => {
    if (!excalidrawAPI) return;
    // Force dark mode again to be sure (fixes sticky white background issue)
    const timer = setTimeout(() => {
      excalidrawAPI.updateScene({
        appState: { viewBackgroundColor: '#0f172a', theme: 'dark' },
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [excalidrawAPI, initialData]);

  const cleanUrl = (url: string) => {
    return url.replace(/\[\d+\]/g, '').replace(/%5B\d+%5D/g, '').trim();
  };

  useEffect(() => {
    if (!imageToLoad || !excalidrawAPI) {
      return;
    }

    // 1. Nettoyage de l'URL (suppression des [1], [2], %5B1%5D...)
    const initialUrl = imageToLoad;
    const url = cleanUrl(initialUrl);
    console.log('[ExcalidrawSandbox] Loading image:', { initial: initialUrl, cleaned: url });

    // 2. Validation Extension (simple check)
    if (!url.match(/\.(jpeg|jpg|png|gif|webp|svg)(\?.*)?$/i)) {
      console.warn('[ExcalidrawSandbox] Extension image suspecte:', url);
      // On continue quand même au cas où c'est une image sans extension explicite
    }

    clearImageToLoad();
    (async () => {
      try {
        // Use OUR OWN proxy in Edge Function to bypass CORS safely
        const bucketUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

        // STRICT: Toujours utiliser la clé ANON pour l'Edge Function, comme dans chatStore.ts
        // Le token utilisateur cause des 401 (problème Gateway ou RLS).
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log('[ExcalidrawSandbox] Auth force Anon Key:', {
          exists: !!anonKey,
          prefix: anonKey ? anonKey.substring(0, 10) + '...' : 'MISSING',
          keyLength: anonKey?.length
        });

        if (!anonKey) {
          console.error('[ExcalidrawSandbox] CRITICAL: VITE_SUPABASE_ANON_KEY is missing!');
        }

        const proxyUrl = `${bucketUrl}/functions/v1/chat?image_url=${encodeURIComponent(url)}`;

        const res = await fetch(proxyUrl, {
          headers: {
            Authorization: `Bearer ${anonKey}`,
          },
        });


        if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
        const blob = await res.blob();
        const mimeType = blob.type || 'image/png';
        const reader = new FileReader();
        const dataURL = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const fileId = `img-${Date.now()}` as const;
        console.log('[ExcalidrawSandbox] File prepared:', { fileId, mimeType, dataUrlLen: dataURL.length });

        // Calculate aspect ratio to avoid distortion
        const imgObj = new Image();
        imgObj.src = dataURL;
        await new Promise((resolve) => {
          imgObj.onload = resolve;
          imgObj.onerror = resolve; // proceed anyway
        });

        const naturalWidth = imgObj.naturalWidth || 400;
        const naturalHeight = imgObj.naturalHeight || 300;
        const aspect = naturalWidth / naturalHeight;

        // Fit within 400x400 box while maintaining aspect ratio
        let width = 400;
        let height = 400;
        if (aspect > 1) {
          height = width / aspect;
        } else {
          width = height * aspect;
        }

        if (excalidrawAPI.addFiles) {
          console.log('[ExcalidrawSandbox] Calling addFiles...');
          excalidrawAPI.addFiles([{ id: fileId, mimeType, dataURL }]);
        } else {
          console.warn('[ExcalidrawSandbox] addFiles is missing from API!');
        }

        const current = (excalidrawAPI.getSceneElements?.() ?? []) as unknown[];

        // Nettoyage : retirer les anciennes images pour éviter la superposition (demande utilisateur)
        // On garde les annotations (textes, flèches...)
        const currentWithoutImages = current.filter((el: any) => el.type !== 'image');

        const imgEl = {
          type: 'image',
          id: `img-el-${Date.now()}`,
          fileId,
          x: 80,
          y: 60,
          width: width,
          height: height,
          naturalWidth: naturalWidth,
          naturalHeight: naturalHeight,
          angle: 0,
          locked: true,
          status: 'saved' as const,
          scale: [1, 1] as [number, number],
          crop: null,
          groupIds: [] as readonly string[],
          frameId: null,
          boundElements: null,
          strokeColor: '#1e293b',
          backgroundColor: 'transparent',
          fillStyle: 'solid' as const,
          strokeWidth: 2,
          strokeStyle: 'solid' as const,
          roundness: null,
          roughness: 1,
          opacity: 100,
          seed: Math.floor(Math.random() * 2 ** 31),
          version: 1,
          versionNonce: Math.floor(Math.random() * 2 ** 31),
          index: null,
          isDeleted: false,
          updated: Date.now(),
          link: null,
        };
        const merged = [imgEl, ...currentWithoutImages];
        excalidrawAPI.updateScene?.({ elements: merged, captureUpdate: 'IMMEDIATELY' as const });
        setElements(merged);
        console.log('[ExcalidrawSandbox] Image element added to scene');
      } catch (e) {
        console.error('[ExcalidrawSandbox] autoLoadImage error', e);
      }
    })();
  }, [imageToLoad, excalidrawAPI, clearImageToLoad, setElements]);

  const handleExcalidrawAPI = useCallback(
    (api: any) => {
      if (!api) {
        console.log('[ExcalidrawSandbox] API is null');
        setExcalidrawAPI(null);
        return;
      }
      console.log('[ExcalidrawSandbox] API received, methods:', Object.keys(api));

      // FORCE DARK MODE IMMEDIATELY (Fix for background reset on refresh)
      api.updateScene({
        appState: { viewBackgroundColor: '#0f172a', theme: 'dark' },
      });

      // Bind methods to ensure they keep their context
      setExcalidrawAPI({
        updateScene: api.updateScene.bind(api),
        getSceneElements: api.getSceneElements.bind(api),
        addFiles: api.addFiles ? api.addFiles.bind(api) : undefined,
      });
    },
    [setExcalidrawAPI]
  );

  const handleChange = useCallback(
    (elements: readonly unknown[], appState?: unknown, _files?: unknown) => {
      const arr = [...elements];
      setElements(arr);
      if (onSaveSnapshot) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          onSaveSnapshot({
            elements: arr,
            appState: appState && typeof appState === 'object' ? (appState as Record<string, unknown>) : undefined,
          });
          saveTimeoutRef.current = null;
        }, 500);
      }
    },
    [setElements, onSaveSnapshot]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const initialElements = (() => {
    if (!initialData?.elements?.length) return [];
    const raw = initialData.elements;
    try {
      return convertToExcalidrawElements(raw as Parameters<typeof convertToExcalidrawElements>[0]) as unknown[];
    } catch {
      return raw;
    }
  })();

  return (
    <div className="flex flex-col h-full min-h-0 stone-card rounded-xl sm:rounded-2xl overflow-hidden relative">
      <VictoryOverlay />
      {/* Grille néon (style Maya) */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(251,191,36,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(251,191,36,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="flex-1 min-h-0 relative z-[2] w-full">
        <Excalidraw
          excalidrawAPI={handleExcalidrawAPI as (api: unknown) => void}
          initialData={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- elements viennent de convertToExcalidrawElements ou snapshot DB
            elements: initialElements as any,
            appState: {
              ...initialData?.appState,
              viewBackgroundColor: '#0f172a',
              theme: 'dark' as const,
            },
          }}
          onChange={handleChange}
          theme="dark"
          viewModeEnabled={readOnly}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
      <div className="p-2 border-t border-amber-500/20 bg-slate-900/50">
        <div className="flex justify-between text-xs text-amber-100/50">
          <span>Grimoire — Zone de dessin</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Sync avec le Mentor
          </span>
        </div>
      </div>
    </div>
  );
}
