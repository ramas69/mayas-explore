import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useGamificationStore } from '../../stores/gamificationStore';
import { useCurriculumStore } from '../../stores/curriculumStore';
import { calculateDailyUsage } from '../../lib/supabase';
import { Trophy, Clock, Map } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function StudentStats() {
    const { user } = useAuthStore();
    const { gamification, loadGamification } = useGamificationStore();
    const { curriculum, loadCurriculum } = useCurriculumStore();

    const [dailyUsage, setDailyUsage] = useState<number>(0);
    const [loadingUsage, setLoadingUsage] = useState(true);

    useEffect(() => {
        if (user?.id) {
            if (!gamification) loadGamification(user.id);
            if (curriculum.length === 0) loadCurriculum(user.id);

            calculateDailyUsage(user.id).then((minutes) => {
                setDailyUsage(minutes);
                setLoadingUsage(false);
            });
        }
    }, [user?.id, loadGamification, gamification, loadCurriculum, curriculum.length]);

    if (!user) return null;

    const dailyLimit = user.daily_time_limit || 120;
    const usagePercentage = Math.min(100, (dailyUsage / dailyLimit) * 100);

    const masteredChapters = curriculum.filter(c => c.status === 'maitrise').length;
    const totalChapters = curriculum.length;
    const progressPercentage = totalChapters > 0 ? Math.round((masteredChapters / totalChapters) * 100) : 0;

    // Calculate level progress (approximate based on 1000 XP per level)
    const currentLevelXP = (gamification?.xp || 0) % 1000;
    const levelProgress = (currentLevelXP / 1000) * 100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {/* Carte XP & Rang */}
            <div className="stone-card p-6 rounded-2xl bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/20">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl">
                        <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-amber-100 font-bold">Mon Niveau</h3>
                        <p className="text-amber-400/80 text-sm font-['Cinzel_Decorative']">
                            {gamification?.rank || 'Explorateur Novice'}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-amber-100/60">
                        <span>XP Total : <span className="text-amber-400 font-bold">{gamification?.xp || 0} XP</span></span>
                        <span>Niveau suivant : {1000 - currentLevelXP} XP</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-amber-500/10">
                        <div
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
                            style={{ width: `${levelProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Carte Temps d'utilisation */}
            <div className="stone-card p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/20">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-amber-100 font-bold">Temps d'exploration</h3>
                        <p className="text-blue-300/80 text-sm">
                            Aujourd'hui
                        </p>
                    </div>
                </div>

                {loadingUsage ? (
                    <div className="h-10 flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-amber-100/60">
                            <span className="font-bold text-blue-200">{dailyUsage} min</span>
                            <span className={dailyUsage >= dailyLimit ? "text-red-400" : "text-amber-100/60"}>
                                Max {dailyLimit} min
                            </span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                            <div
                                className={`h-full transition-all duration-500 ${dailyUsage >= dailyLimit ? 'bg-red-500' : 'bg-blue-500'
                                    }`}
                                style={{ width: `${usagePercentage}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Carte Progression Globale */}
            <div className="stone-card p-6 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-slate-900 border border-emerald-500/20 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Map className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-amber-100 font-bold">Progression du Programme</h3>
                            <p className="text-emerald-400/80 text-sm">
                                {masteredChapters} chapitres maîtrisés sur {totalChapters}
                            </p>
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 font-['Cinzel_Decorative']">
                        {progressPercentage}%
                    </div>
                </div>

                <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/10">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
