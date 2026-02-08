export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-800/80 border border-amber-500/20 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full text-xs">
            🧭
          </div>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
