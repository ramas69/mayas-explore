import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Compass, Sparkles, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  '14 jours d\'essai gratuit',
  'Sans engagement',
  'Annulation à tout moment',
];

export function CTA() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const light = lightRef.current;
    if (!section || !light) return;

    const ctx = gsap.context(() => {
      // Background zoom
      gsap.fromTo('.cta-bg',
        { scale: 1.1 },
        {
          scale: 1,
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
          }
        }
      );

      // Light intensify on scroll
      gsap.fromTo(light,
        { opacity: 0.3 },
        {
          opacity: 1,
          scrollTrigger: {
            trigger: section,
            start: 'top 50%',
            end: 'center center',
            scrub: 1,
          }
        }
      );

      // Title animation
      gsap.fromTo('.cta-title',
        { opacity: 0, y: 50, clipPath: 'inset(100% 0 0 0)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0 0 0)',
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 60%',
          }
        }
      );

      // Subtitle animation
      gsap.fromTo('.cta-subtitle',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 50%',
          }
        }
      );

      // CTA button animation
      gsap.fromTo('.cta-button',
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: section,
            start: 'top 40%',
          }
        }
      );

      // Benefits animation
      gsap.fromTo('.cta-benefit',
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: section,
            start: 'top 35%',
          }
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="cta" className="relative py-32 z-10 overflow-hidden">
      {/* Background Image */}
      <div className="cta-bg absolute inset-0 z-0">
        <img 
          src="/cta-door.jpg" 
          alt="Porte du temple" 
          className="w-full h-full object-cover"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-slate-900/70" />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/50 to-slate-900" />
      </div>

      {/* Divine Light */}
      <div 
        ref={lightRef}
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ opacity: 0.3 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-300/30 rounded-full blur-[60px] animate-pulse" />
      </div>

      {/* God Rays */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Sparkle Icon */}
        <div className="cta-title inline-flex items-center justify-center w-16 h-16 mb-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-2xl shadow-amber-500/40">
          <Sparkles className="w-8 h-8 text-slate-900" />
        </div>

        {/* Title */}
        <h2 className="cta-title font-['Cinzel_Decorative'] text-4xl sm:text-5xl md:text-6xl font-bold text-amber-100 mb-6">
          Prêt pour l'<span className="text-golden text-shadow-gold">Expédition</span> ?
        </h2>

        {/* Subtitle */}
        <p className="cta-subtitle text-xl sm:text-2xl text-amber-100/70 mb-10 max-w-2xl mx-auto">
          Rejoins les explorateurs qui transforment leurs révisions en aventure épique.
        </p>

        {/* CTA Button */}
        <button 
          onClick={() => navigate('/auth?mode=inscription')}
          className="cta-button group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 font-bold text-xl rounded-2xl hover:shadow-2xl hover:shadow-amber-500/50 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
        >
          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <Compass className="relative w-6 h-6 group-hover:rotate-45 transition-transform duration-500" />
          <span className="relative">COMMENCER GRATUITEMENT</span>
        </button>

        {/* Benefits */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="cta-benefit flex items-center gap-2 text-amber-100/60">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="mt-12 inline-flex items-center gap-3 px-6 py-3 bg-slate-900/50 backdrop-blur-sm border border-amber-500/20 rounded-full">
          <div className="flex -space-x-2">
            {['👧', '🧑', '👩', '👨'].map((emoji, i) => (
              <span 
                key={i} 
                className="w-8 h-8 flex items-center justify-center text-sm bg-slate-800 border-2 border-slate-900 rounded-full"
              >
                {emoji}
              </span>
            ))}
          </div>
          <span className="text-sm text-amber-100/70">
            Rejoins <span className="text-amber-400 font-semibold">10,000+</span> explorateurs
          </span>
        </div>
      </div>
    </section>
  );
}
