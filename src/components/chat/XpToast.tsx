import { useEffect, useState } from 'react';
import { useGamificationStore } from '../../stores/gamificationStore';
import { Star, Flame } from 'lucide-react';

/**
 * Lightweight XP toast notification for the chat.
 * Shows a small animated banner when XP is earned from evaluations.
 * Auto-dismisses after 3 seconds.
 */
export function XpToast() {
    const { xpToast, dismissXpToast } = useGamificationStore();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (xpToast) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(dismissXpToast, 400); // wait for exit animation
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [xpToast, dismissXpToast]);

    if (!xpToast) return null;

    const isStreak = (xpToast.streakCount ?? 0) >= 3;
    const evalColor = xpToast.evaluation === 'correct'
        ? 'from-emerald-500 to-emerald-400'
        : xpToast.evaluation === 'partial'
            ? 'from-amber-500 to-amber-400'
            : 'from-rose-500 to-rose-400';

    const evalIcon = xpToast.evaluation === 'correct'
        ? '✅'
        : xpToast.evaluation === 'partial'
            ? '⚠️'
            : '❌';

    const evalLabel = xpToast.evaluation === 'correct'
        ? 'Bonne réponse !'
        : xpToast.evaluation === 'partial'
            ? 'Presque !'
            : 'Pas encore...';

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-400 ${visible
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-2 scale-95'
                } ${xpToast.evaluation === 'correct'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : xpToast.evaluation === 'partial'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-rose-500/10 border-rose-500/30'
                }`}
        >
            {/* Evaluation badge */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${evalColor} flex items-center justify-center shrink-0 shadow-lg`}>
                <span className="text-lg">{evalIcon}</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-100">{evalLabel}</p>
                {xpToast.xp > 0 && (
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400">+{xpToast.xp} XP</span>
                        </div>
                        {isStreak && (
                            <div className="flex items-center gap-1 text-orange-400">
                                <Flame className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">Série x{xpToast.streakCount} !</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* XP counter animation */}
            {xpToast.xp > 0 && (
                <div className={`text-xl font-['Cinzel_Decorative'] font-bold bg-gradient-to-r ${evalColor} bg-clip-text text-transparent animate-bounce`}>
                    +{xpToast.xp}
                </div>
            )}
        </div>
    );
}
