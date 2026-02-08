import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Landmark, Users, Star, Trophy } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface StatItem {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { icon: Landmark, value: 500, suffix: '+', label: 'TEMPLES CONQUIS' },
  { icon: Users, value: 10, suffix: 'K+', label: 'EXPLORATEURS' },
  { icon: Star, value: 4.9, suffix: '★', label: 'NOTE MOYENNE' },
  { icon: Trophy, value: 98, suffix: '%', label: 'TAUX DE RÉUSSITE' },
];

function AnimatedCounter({ value, suffix, isVisible }: { value: number; suffix: string; isVisible: boolean }) {
  const [count, setCount] = useState(0);
  const countRef = useRef({ value: 0 });

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out expo
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = easeProgress * value;
      
      countRef.current.value = currentValue;
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, isVisible]);

  const displayValue = value % 1 !== 0 
    ? count.toFixed(1) 
    : Math.floor(count).toString();

  return (
    <span className="tabular-nums">
      {displayValue}{suffix}
    </span>
  );
}

export function Stats() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.fromTo('.stats-container',
        { opacity: 0, x: -100 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            onEnter: () => setIsVisible(true),
          }
        }
      );

      // Cards stagger animation
      gsap.fromTo('.stat-card',
        { opacity: 0, y: 50, rotateY: -15 },
        {
          opacity: 1,
          y: 0,
          rotateY: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.15,
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
          }
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 z-10">
      <div className="stats-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon as React.ComponentType<{ className?: string }>;
            return (
              <div
                key={index}
                className="stat-card group relative p-6 sm:p-8 stone-card rounded-2xl text-center cursor-default"
                style={{ perspective: '1000px' }}
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/10 group-hover:to-amber-500/5 transition-all duration-500" />
                
                {/* Icon */}
                <div className="relative mb-4 flex justify-center">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 group-hover:scale-110 group-hover:border-amber-400/50 transition-all duration-300">
                    <span className="inline-flex [&>svg]:w-7 [&>svg]:h-7 text-amber-400"><Icon /></span>
                  </div>
                </div>

                {/* Value */}
                <div className="relative mb-2">
                  <span className="text-4xl sm:text-5xl font-bold text-golden font-['Cinzel_Decorative']">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} isVisible={isVisible} />
                  </span>
                </div>

                {/* Label */}
                <p className="relative text-xs sm:text-sm font-medium text-amber-100/60 tracking-wider">
                  {stat.label}
                </p>

                {/* Decorative Corner */}
                <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
