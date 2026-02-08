import { useState } from 'react';
import { Pencil, Eraser, Square, Circle, Type, Trash2, Save } from 'lucide-react';

type Tool = 'selection' | 'rectangle' | 'diamond' | 'ellipse' | 'arrow' | 'line' | 'draw' | 'text' | 'eraser';

interface DrawingCanvasProps {
  onDrawingChange?: (elements: any[]) => void;
  initialData?: any[];
  readOnly?: boolean;
}

export function DrawingCanvas({ onDrawingChange, initialData, readOnly }: DrawingCanvasProps) {
  const [activeTool, setActiveTool] = useState<Tool>('draw');
  const [elements, setElements] = useState<any[]>(initialData || []);
  const [color, setColor] = useState('#FFD700');
  const [strokeWidth, setStrokeWidth] = useState(2);

  const colors: string[] = [
    '#FFD700', // Gold
    '#00D4FF', // Cyan
    '#FF6B35', // Orange
    '#50C878', // Emerald
    '#DC143C', // Crimson
    '#FFFFFF', // White
  ];

  const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: 'draw', icon: Pencil, label: 'Dessiner' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'ellipse', icon: Circle, label: 'Cercle' },
    { id: 'text', icon: Type, label: 'Texte' },
    { id: 'eraser', icon: Eraser, label: 'Gomme' },
  ];

  const handleClear = () => {
    setElements([]);
    onDrawingChange?.([]);
  };

  const handleSave = () => {
    onDrawingChange?.(elements);
    // Show success toast
  };

  // Simplified canvas - in production, integrate with Excalidraw API
  return (
    <div className="flex flex-col min-h-[280px] h-full stone-card rounded-xl sm:rounded-2xl overflow-hidden">
      {/* Toolbar */}
      {!readOnly && (
        <div className="p-2 sm:p-3 border-b border-amber-500/20 bg-slate-900/50">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Tools */}
            <div className="flex gap-1">
              {tools.map((tool) => {
                const Icon = tool.icon as React.ComponentType<{ className?: string; size?: number }>;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`p-1.5 sm:p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg transition-all touch-manipulation ${
                      activeTool === tool.id
                        ? 'bg-amber-500/30 text-amber-400'
                        : 'text-amber-100/60 hover:bg-amber-500/10 hover:text-amber-300'
                    }`}
                    title={tool.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>

            <div className="w-px h-6 bg-amber-500/20 mx-2" />

            {/* Colors */}
            <div className="flex gap-1">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c as React.CSSProperties['backgroundColor'] }}
                />
              ))}
            </div>

            <div className="w-px h-6 bg-amber-500/20 mx-2" />

            {/* Stroke width */}
            <div className="flex gap-1">
              {[1, 2, 4].map((width) => (
                <button
                  key={width}
                  onClick={() => setStrokeWidth(width)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                    strokeWidth === width
                      ? 'bg-amber-500/30 text-amber-400'
                      : 'text-amber-100/60 hover:bg-amber-500/10'
                  }`}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{ width: width * 3, height: width * 3 }}
                  />
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <button
              onClick={handleClear}
              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Effacer tout"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
              title="Sauvegarder"
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative bg-slate-950">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, #FFD700 1px, transparent 1px),
              linear-gradient(to bottom, #FFD700 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Placeholder for Excalidraw integration */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-full">
              <span className="text-4xl">✏️</span>
            </div>
            <h4 className="font-['Cinzel_Decorative'] text-lg text-amber-100 mb-2">
              Zone de Dessin
            </h4>
            <p className="text-amber-100/60 text-sm max-w-xs">
              {readOnly 
                ? 'L\'Exploratrice a laissé un dessin ici. Étudie-le attentivement !'
                : 'Dessine ici pour montrer ta réponse à l\'Exploratrice'}
            </p>
            
            {!readOnly && (
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-3 py-1 text-xs bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300">
                  Outil: {activeTool}
                </span>
                <span className="px-3 py-1 text-xs bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300">
                  Couleur: <span className="inline-block w-3 h-3 rounded-full ml-1" style={{ backgroundColor: color }} />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Drawing Elements Preview */}
        {elements.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-slate-900/80 backdrop-blur-sm rounded-xl border border-amber-500/20">
            <p className="text-sm text-amber-100/80">
              {elements.length} élément(s) dessiné(s)
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-amber-500/20 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-amber-100/50">
          <span>Excalidraw Integration</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span>Sync avec l'IA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
