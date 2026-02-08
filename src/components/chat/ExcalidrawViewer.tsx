import { useMemo } from 'react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import '@excalidraw/excalidraw/index.css';

export interface ExcalidrawDrawingData {
  elements: unknown[];
  appState?: Record<string, unknown>;
}

interface ExcalidrawViewerProps {
  data: ExcalidrawDrawingData;
  height?: number;
  /** Mode consultation uniquement (pas d'édition) */
  readOnly?: boolean;
}

/** Vérifie si les éléments sont déjà au format Excalidraw complet (avec id, version, etc.) */
function isFullExcalidrawElement(el: unknown): el is ExcalidrawElement {
  return (
    typeof el === 'object' &&
    el !== null &&
    'id' in el &&
    typeof (el as { id: unknown }).id === 'string' &&
    'type' in el &&
    typeof (el as { type: unknown }).type === 'string'
  );
}

export function ExcalidrawViewer({
  data,
  height = 280,
  readOnly = true,
}: ExcalidrawViewerProps) {
  const initialData = useMemo(() => {
    const rawElements = Array.isArray(data.elements) ? data.elements : [];
    if (rawElements.length === 0) {
      return null;
    }

    let elements: ExcalidrawElement[];
    if (isFullExcalidrawElement(rawElements[0])) {
      elements = rawElements as ExcalidrawElement[];
    } else {
      try {
        // Données venant de l'IA : format variable (rectangles, ellipses, flèches, texte)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elements = convertToExcalidrawElements(rawElements as any);
      } catch {
        return null;
      }
    }

    return {
      elements,
      appState: {
        viewBackgroundColor: '#1e293b',
        ...data.appState,
        viewModeEnabled: readOnly,
      },
      scrollToContent: true,
    } as const;
  }, [data, readOnly]);

  if (!initialData) {
    return null;
  }

  return (
    <div
      className="rounded-lg overflow-hidden border border-amber-500/20 bg-slate-900/50"
      style={{ height: `${height}px` }}
    >
      <Excalidraw
        initialData={initialData}
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
  );
}
