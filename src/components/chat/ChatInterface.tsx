import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useCurriculumStore } from '../../stores/curriculumStore';
import { Send, Sparkles, MapPin, BookOpen, ChevronDown, ImagePlus, Map } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import type { Curriculum, Subject } from '../../types';
import { getMentorForSubject, MENTOR_AVATAR, MENTOR_GROUPS, MENTOR_NAMES } from '../../lib/mentorGroups';

const VALID_SUBJECTS: Subject[] = ['Maths', 'Français', 'Histoire-Géo', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Théologie', 'Arts', 'EPS', 'Musique', 'Technologie'];

function GuardianPicker({ onSelectGuardian }: { onSelectGuardian: (subject: Subject) => void }) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  return (
    <div className="py-6">
      <h4 className="font-['Cinzel_Decorative'] text-lg text-amber-100 mb-4 text-center">
        Choisis ton Gardien
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MENTOR_GROUPS.map((group) => {
          const mentorName = MENTOR_NAMES[group.id] ?? group.name;
          const hasMultipleSubjects = group.subjects.length > 1;
          const isExpanded = expandedGroupId === group.id;

          return (
            <div key={group.id} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (hasMultipleSubjects) {
                    setExpandedGroupId(isExpanded ? null : group.id);
                  } else if (group.subjects[0]) {
                    onSelectGuardian(group.subjects[0]);
                  }
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-left group ${isExpanded
                  ? 'bg-amber-500/20 border-amber-500/50'
                  : 'bg-slate-800/60 border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/40'
                  }`}
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/30 relative">
                  <img src={MENTOR_AVATAR} alt="" className="w-10 h-10 rounded-full object-cover" />
                  {hasMultipleSubjects && (
                    <ChevronDown
                      className={`w-4 h-4 absolute -bottom-1 -right-1 text-amber-400 bg-slate-800 rounded-full p-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </div>
                <span className="font-medium text-amber-100 text-sm text-center line-clamp-2">
                  {mentorName}
                </span>
                <span className="text-xs text-amber-100/50 text-center">
                  {group.subjects.join(', ')}
                </span>
              </button>
              {/* Choix de matière si plusieurs */}
              {hasMultipleSubjects && isExpanded && (
                <div className="flex flex-wrap gap-1.5 mt-1 px-2" onClick={(e) => e.stopPropagation()}>
                  {group.subjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectGuardian(subject);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 hover:border-amber-400/60 transition-colors"
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ChatInterfaceProps {
  sessionId: string;
  studentId: string;
  classe?: string | null;
  selectedChapter?: Curriculum | null;
  onSelectGuardian?: (subject: Subject) => void;
}

export function ChatInterface({ sessionId, studentId, classe, selectedChapter, onSelectGuardian }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null); // New ref for container
  const { messages, isLoading, isTyping, sendMessage, loadMessages, clearChat, redirectModalToShow, clearRedirectModal } = useChatStore();
  const { getChaptersBySubject } = useCurriculumStore();

  const hasValidSession = sessionId && sessionId !== 'demo-session';
  const showGuardianPicker = !selectedChapter && onSelectGuardian;

  console.log('[ChatInterface] Render:', { sessionId, hasValidSession, selectedChapter, showGuardianPicker });

  useEffect(() => {
    console.log('[ChatInterface] useEffect sessionId changed:', sessionId);
    if (hasValidSession) loadMessages(sessionId);
    else clearChat();
  }, [sessionId, hasValidSession, loadMessages, clearChat]);

  useEffect(() => {
    // Autoscroll vers le bas du chat uniquement
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'auto',  // Pas de smooth pour éviter les bugs
          block: 'nearest',   // Scroll minimal
          inline: 'nearest'   // Pas de scroll horizontal
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  const chatContext = selectedChapter
    ? {
      subject: selectedChapter.subject,
      chapterName: selectedChapter.chapter_name,
      chapterId: selectedChapter.id,
      chapterStatus: selectedChapter.status,
      curriculumChapters: getChaptersBySubject(selectedChapter.subject).map((c) => ({
        chapter_name: c.chapter_name,
        status: c.status,
      })),
    }
    : undefined;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = (reader.result as string).split(',')[1];
      if (data) {
        setImageBase64(data);
        setImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageBase64) || isTyping || !hasValidSession) return;

    const message = input.trim() || (imageBase64 ? "J'ai uploadé une photo de mon grimoire/cahier. Peux-tu l'analyser ?" : '');
    setInput('');
    const img = imageBase64;
    setImageBase64(null);
    setImagePreview(null);
    // Fire-and-forget : sendMessage gère tout en interne (store + UI). Ne pas bloquer le thread.
    sendMessage(message, sessionId, studentId, classe, chatContext, img ?? undefined).catch((err) => {
      console.error('[ChatInterface] sendMessage promise rejection:', err);
    });
  };

  const mentor = selectedChapter ? getMentorForSubject(selectedChapter.subject) : null;
  console.log('[ChatInterface] Derived mentor:', mentor, 'for subject:', selectedChapter?.subject);

  const handleRedirectConfirm = () => {
    if (!redirectModalToShow) return;
    if (onSelectGuardian) {
      const subject = VALID_SUBJECTS.includes(redirectModalToShow.subject as Subject)
        ? (redirectModalToShow.subject as Subject)
        : undefined;
      if (subject) onSelectGuardian(subject);
    }
    clearRedirectModal();
  };

  const quickActions = selectedChapter
    ? [
      { label: `Aide-moi avec ${selectedChapter.chapter_name}`, icon: Sparkles },
      { label: 'Explique-moi ce chapitre', icon: BookOpen },
      { label: 'Je suis fatigué...', icon: MapPin },
    ]
    : [
      { label: 'Aide-moi avec ce problème', icon: Sparkles },
      { label: 'Charge mon programme officiel', icon: BookOpen },
      { label: 'Je suis fatigué...', icon: MapPin },
      { label: 'Explique-moi encore', icon: Sparkles },
    ];

  return (
    <div className="flex flex-col h-full min-h-0 stone-card rounded-xl sm:rounded-2xl overflow-hidden">
      {/* Modal de redirection vers le bon Gardien */}
      {redirectModalToShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-800/95 border border-amber-500/30 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Map className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-['Cinzel_Decorative'] text-lg text-amber-100">Question hors-sujet</h3>
                <p className="text-sm text-amber-100/70">
                  Cette question concerne les <strong>{redirectModalToShow.subject}</strong>.
                </p>
              </div>
            </div>
            <p className="text-amber-100/80 mb-6">
              Veux-tu aller voir le <strong className="text-amber-200">{redirectModalToShow.guardianName}</strong> pour ce sujet ? 🗺️
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRedirectConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-medium hover:from-amber-400 hover:to-amber-500 transition-colors"
              >
                Rediriger
              </button>
              <button
                type="button"
                onClick={clearRedirectModal}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 text-amber-100 hover:bg-slate-600 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header - Avatar unique pour tous les mentors, nom selon le groupe de matières */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-amber-500/30">
            <img
              src={MENTOR_AVATAR}
              alt="Mentor"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-amber-100 truncate">
              {mentor ? mentor.name : "L'Exploratrice Chevronnée"}
            </h3>
            <p className="text-xs text-amber-100/60 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
              {selectedChapter ? `${selectedChapter.subject} · ${selectedChapter.chapter_name}` : 'En ligne'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages - scroll interne uniquement dans cette zone */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4"
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        {showGuardianPicker && (
          <GuardianPicker onSelectGuardian={onSelectGuardian} />
        )}
        {!showGuardianPicker && !hasValidSession && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-full">
              <span className="text-4xl">🗺️</span>
            </div>
            <h4 className="font-['Cinzel_Decorative'] text-lg text-amber-100 mb-2">
              Choisis ton Gardien
            </h4>
            <p className="text-amber-100/60 text-sm max-w-xs mx-auto">
              Va dans l&apos;onglet Carte ou choisis un gardien ci-dessus pour commencer !
            </p>
          </div>
        )}
        {hasValidSession && messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-full">
              <span className="text-4xl">🏛️</span>
            </div>
            <h4 className="font-['Cinzel_Decorative'] text-lg text-amber-100 mb-2">
              Bienvenue dans le Temple du Savoir
            </h4>
            <p className="text-amber-100/60 text-sm max-w-xs mx-auto">
              Je suis ton mentor. Ensemble, nous allons découvrir les secrets de ce chapitre !
            </p>

            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(action.label);
                  }}
                  className="px-3 py-2 text-xs bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasValidSession && messages.map((message) => (
          <ChatMessage key={message.id} message={message} mentorName={mentor?.name} />
        ))}

        {hasValidSession && isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-3 sm:p-4 border-t border-amber-500/20">
        {imagePreview && (
          <div className="mb-2 flex items-center gap-2">
            <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-amber-500/30" />
            <span className="text-xs text-amber-100/60">Photo prête à envoyer</span>
            <button type="button" onClick={() => { setImageBase64(null); setImagePreview(null); }} className="text-rose-400 hover:text-rose-300 text-xs">
              Retirer
            </button>
          </div>
        )}
        <div className="flex gap-2 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-amber-100/60 hover:bg-amber-500/10 hover:text-amber-300 transition-colors"
            title="Envoyer une photo (cahier, livre...)"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question ou envoie une photo..."
            className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all text-base"
            disabled={isTyping || !hasValidSession}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !imageBase64) || isTyping || !hasValidSession}
            className="px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] min-w-[44px] flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-xl hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-amber-100/40 text-center">
          L'Exploratrice utilise la méthode socratique - elle te guidera vers la réponse
        </p>
      </form>
    </div>
  );
}
