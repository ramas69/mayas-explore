import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types';
import { MENTOR_AVATAR } from '../../lib/mentorGroups';
import { ExcalidrawViewer } from './ExcalidrawViewer';

interface ChatMessageProps {
  message: ChatMessageType;
  mentorName?: string;
}

function isValidExcalidrawData(data: unknown): data is { elements: unknown[]; appState?: Record<string, unknown> } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'elements' in data &&
    Array.isArray((data as { elements: unknown }).elements)
  );
}

export function ChatMessage({ message, mentorName }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showDrawing, setShowDrawing] = useState(true); // Affiché par défaut pour les schémas IA

  const drawingData = message.has_drawing && message.drawing_data ? message.drawing_data : null;
  const hasExcalidraw = drawingData && isValidExcalidrawData(drawingData);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[95%] sm:max-w-[85%] ${
          isUser
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900'
            : 'bg-slate-800/80 border border-amber-500/20 text-amber-100'
        } rounded-2xl px-4 py-3`}
      >
        {/* Avatar mentor (toujours le même) */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <img
              src={MENTOR_AVATAR}
              alt="Mentor"
              className="w-6 h-6 rounded-full object-cover border border-amber-500/30"
            />
            <span className="text-xs font-medium text-amber-400">{mentorName ?? 'Mentor'}</span>
          </div>
        )}

        {/* Message Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {/* Schéma Excalidraw (style "dessiné au tableau") */}
        {hasExcalidraw && (
          <div className="mt-3">
            {drawingData.elements.length > 0 && (
              <>
                <button
                  onClick={() => setShowDrawing(!showDrawing)}
                  className="text-xs text-amber-400 hover:text-amber-300 underline mb-2"
                >
                  {showDrawing ? 'Masquer le schéma' : 'Voir le schéma'}
                </button>
                {showDrawing && (
                  <div className="mt-2 w-full min-w-[240px] max-w-[400px]">
                    <ExcalidrawViewer
                      data={drawingData}
                      height={260}
                      readOnly
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Fallback : données de dessin non-Excalidraw (legacy) */}
        {message.has_drawing && drawingData && !hasExcalidraw && (
          <div className="mt-3">
            <button
              onClick={() => setShowDrawing(!showDrawing)}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              {showDrawing ? 'Masquer le dessin' : 'Voir le dessin'}
            </button>
            {showDrawing && (
              <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-amber-500/20">
                <pre className="text-xs text-amber-100/60 overflow-auto max-h-40">
                  {JSON.stringify(drawingData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className={`mt-1 text-xs ${isUser ? 'text-slate-800/60' : 'text-amber-100/40'}`}>
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
