import { useEffect, useState } from 'react';
import { useGamificationStore } from '../../stores/gamificationStore';
import { X, Sparkles, Trophy, Gem, Star } from 'lucide-react';
import type { Artifact } from '../../types';

export function RewardModal() {
  const { showReward, lastReward, dismissReward } = useGamificationStore();
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    if (showReward) {
      setIsVisible(true);
      setAnimationPhase('enter');
      
      // Play sound effect (in production)
      // const audio = new Audio('/sounds/reward.mp3');
      // audio.play();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setAnimationPhase('exit');
        setTimeout(() => {
          dismissReward();
          setIsVisible(false);
        }, 500);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showReward, dismissReward]);

  if (!isVisible || !lastReward) return null;

  const getRewardContent = () => {
    switch (lastReward.type) {
      case 'xp':
        return {
          icon: Star,
          title: `+${lastReward.value} XP Gagnés !`,
          subtitle: 'Continue ton exploration !',
          color: 'from-amber-400 to-orange-500',
          bgEffect: 'bg-amber-400/20',
        };
      case 'artifact':
        const artifact = lastReward.value as Artifact;
        return {
          icon: Gem,
          title: `Artefact Découvert !`,
          subtitle: artifact.name,
          description: artifact.description,
          color: artifact.rarity === 'legendary' ? 'from-purple-400 to-pink-500' : 
                  artifact.rarity === 'epic' ? 'from-cyan-400 to-blue-500' :
                  artifact.rarity === 'rare' ? 'from-emerald-400 to-green-500' :
                  'from-amber-400 to-orange-500',
          bgEffect: artifact.rarity === 'legendary' ? 'bg-purple-400/20' : 
                    artifact.rarity === 'epic' ? 'bg-cyan-400/20' :
                    artifact.rarity === 'rare' ? 'bg-emerald-400/20' :
                    'bg-amber-400/20',
        };
      case 'temple':
        return {
          icon: Trophy,
          title: 'Temple Évolué !',
          subtitle: `Niveau ${lastReward.value} Atteint`,
          description: 'Ton temple devient plus majestueux !',
          color: 'from-amber-400 to-yellow-500',
          bgEffect: 'bg-amber-400/30',
        };
      default:
        return {
          icon: Sparkles,
          title: 'Récompense !',
          subtitle: 'Continue ton exploration !',
          color: 'from-amber-400 to-orange-500',
          bgEffect: 'bg-amber-400/20',
        };
    }
  };

  const content = getRewardContent();
  const Icon = content.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-500 ${
          animationPhase === 'enter' ? 'opacity-0' : animationPhase === 'exit' ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={() => {
          setAnimationPhase('exit');
          setTimeout(() => {
            dismissReward();
            setIsVisible(false);
          }, 500);
        }}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md transition-all duration-500 ${
          animationPhase === 'enter' 
            ? 'scale-0 opacity-0 rotate-[-10deg]' 
            : animationPhase === 'exit' 
            ? 'scale-0 opacity-0 rotate-[10deg]' 
            : 'scale-100 opacity-100 rotate-0'
        }`}
      >
        {/* Glow Effect */}
        <div className={`absolute -inset-4 bg-gradient-to-r ${content.color} opacity-30 blur-3xl rounded-full animate-pulse`} />

        {/* Card */}
        <div className="relative p-8 stone-card rounded-3xl overflow-hidden">
          {/* Particle Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${content.color} animate-ping`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              setAnimationPhase('exit');
              setTimeout(() => {
                dismissReward();
                setIsVisible(false);
              }, 500);
            }}
            className="absolute top-4 right-4 p-2 text-amber-100/50 hover:text-amber-100 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative text-center">
            {/* Icon */}
            <div className={`w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-gradient-to-r ${content.color} shadow-2xl animate-bounce`}>
              <Icon className="w-12 h-12 text-white" />
            </div>

            {/* Title */}
            <h2 className={`font-['Cinzel_Decorative'] text-3xl font-bold bg-gradient-to-r ${content.color} bg-clip-text text-transparent mb-2`}>
              {content.title}
            </h2>

            {/* Subtitle */}
            <p className="text-xl text-amber-100 font-medium mb-2">
              {content.subtitle}
            </p>

            {/* Description */}
            {content.description && (
              <p className="text-amber-100/60 text-sm">
                {content.description}
              </p>
            )}

            {/* Celebration Animation */}
            <div className="mt-6 flex justify-center gap-2">
              {['🎉', '✨', '🏆', '💎', '🌟'].map((emoji, i) => (
                <span
                  key={i}
                  className="text-2xl animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {emoji}
                </span>
              ))}
            </div>

            {/* Action Button */}
            <button
              onClick={() => {
                setAnimationPhase('exit');
                setTimeout(() => {
                  dismissReward();
                  setIsVisible(false);
                }, 500);
              }}
              className={`mt-6 px-8 py-3 bg-gradient-to-r ${content.color} text-slate-900 font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all`}
            >
              Continuer l'expédition !
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
