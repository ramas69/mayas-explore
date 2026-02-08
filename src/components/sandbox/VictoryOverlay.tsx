import { useEffect } from 'react';
import { useSandboxStore } from '../../stores/sandboxStore';

export function VictoryOverlay() {
  const { lastMissionVictory, dismissVictory } = useSandboxStore();

  useEffect(() => {
    if (!lastMissionVictory) return;
    const t = setTimeout(() => dismissVictory(), 4000);
    return () => clearTimeout(t);
  }, [lastMissionVictory, dismissVictory]);

  if (!lastMissionVictory) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[2px]" />
      <div className="relative w-48 h-48 flex flex-col items-center justify-center gap-2">
        <span className="text-7xl animate-bounce" style={{ animationDuration: '0.6s' }}>🏆</span>
        <span className="font-['Cinzel_Decorative'] text-amber-400 text-xl font-bold">
          +{lastMissionVictory.xp} XP
        </span>
        <span className="text-amber-200/90 text-sm font-medium">{lastMissionVictory.artifactName}</span>
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full opacity-80"
            style={{
              left: `${20 + (i % 8) * 10}%`,
              top: `${10 + Math.floor(i / 8) * 30}%`,
              backgroundColor: ['#f59e0b', '#fbbf24', '#fcd34d', '#10b981', '#34d399'][i % 5],
              animation: `victoryFloat 1.5s ease-out ${i * 0.05}s forwards`,
              transform: 'translateY(0) scale(1)',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes victoryFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-100px) scale(0.5); }
        }
      `}</style>
    </div>
  );
}
