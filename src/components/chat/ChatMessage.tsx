
import type { ChatMessage as ChatMessageType } from '../../types';
import { MENTOR_AVATAR } from '../../lib/mentorGroups';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatMessageType;
  mentorName?: string;
}

export function ChatMessage({ message, mentorName }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[95%] sm:max-w-[85%] ${isUser
          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900'
          : 'bg-slate-800/80 border border-amber-500/20 text-amber-100'
          } rounded-2xl px-4 py-3 shadow-sm`}
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

        {/* Message Content rendered with Markdown */}
        <div className={`text-sm leading-relaxed ${isUser ? 'text-slate-900' : 'text-amber-100'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for markdown elements
              strong: ({ node, ...props }) => (
                <span className={`font-bold ${isUser ? 'text-slate-900' : 'text-amber-300'}`} {...props} />
              ),
              em: ({ node, ...props }) => (
                <span className="italic" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside my-1 space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside my-1 space-y-1" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="my-0.5" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-2 last:mb-0" {...props} />
              ),
              code: ({ node, ...props }) => (
                <code className={`px-1 py-0.5 rounded text-xs font-mono ${isUser ? 'bg-amber-600/20' : 'bg-slate-900/50 text-amber-200'}`} {...props} />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>



        {/* Timestamp */}
        <p className={`mt-1 text-xs ${isUser ? 'text-slate-800/60' : 'text-amber-100/40'} text-right`}>
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
