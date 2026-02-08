import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Compass, ChevronRight, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    const image = imageRef.current;
    if (!section || !text || !image) return;

    const ctx = gsap.context(() => {
      // Background zoom animation
      gsap.fromTo(image,
        { scale: 1.2, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.5, ease: 'power3.out' }
      );

      // Tag animation
      gsap.fromTo('.hero-tag',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.5 }
      );

      // Title lines animation with clip-path
      gsap.fromTo('.hero-title-line',
        { opacity: 0, y: 100, clipPath: 'inset(100% 0 0 0)' },
        { 
          opacity: 1, 
          y: 0, 
          clipPath: 'inset(0% 0 0 0)',
          duration: 1, 
          ease: 'power3.out', 
          stagger: 0.2, 
          delay: 0.8 
        }
      );

      // Subtitle animation
      gsap.fromTo('.hero-subtitle',
        { opacity: 0, filter: 'blur(10px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out', delay: 1.5 }
      );

      // CTA buttons animation
      gsap.fromTo('.hero-cta',
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', stagger: 0.15, delay: 1.8 }
      );

      // Scroll-triggered parallax
      const triggers: ScrollTrigger[] = [];
      
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          onUpdate: (self) => {
            gsap.set(image, { y: self.progress * -200 });
            gsap.set(text, { y: self.progress * -300, opacity: 1 - self.progress });
          }
        })
      );

      return () => {
        triggers.forEach(t => t.kill());
      };
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef}
      id="hero" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Parallax */}
      <div 
        ref={imageRef}
        className="absolute inset-0 z-0"
        style={{ willChange: 'transform' }}
      >
        <img 
          src="/hero-bg.jpg" 
          alt="Temple Maya dans la jungle" 
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-slate-900/80" />
      </div>

      {/* God Rays Effect */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent transform -rotate-12 blur-3xl" />
        <div className="absolute top-0 left-1/2 w-24 h-full bg-gradient-to-b from-amber-300/10 via-transparent to-transparent transform rotate-6 blur-3xl" />
        <div className="absolute top-0 right-1/3 w-40 h-full bg-gradient-to-b from-amber-500/10 via-transparent to-transparent transform -rotate-6 blur-3xl" />
      </div>

      {/* Content */}
      <div 
        ref={textRef}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24"
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Tag */}
        <div className="hero-tag inline-flex items-center gap-2 px-4 py-2 mb-8 bg-amber-500/10 border border-amber-500/30 rounded-full">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300 tracking-widest uppercase">
            L'Expédition Commence Ici
          </span>
        </div>

        {/* Main Title */}
        <h1 className="font-['Cinzel_Decorative'] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <span className="hero-title-line block text-amber-100/90">
            Transforme tes
          </span>
          <span className="hero-title-line block text-golden text-shadow-gold">
            Difficultés
          </span>
          <span className="hero-title-line block text-amber-100/90">
            en Expédition
          </span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle max-w-2xl mx-auto text-lg sm:text-xl text-amber-100/70 mb-10 leading-relaxed">
          Programme de 4ème, bulletin en baisse ? Deviens exploratrice. 
          <span className="block mt-2 text-amber-300/80 italic">
            Chaque chapitre est un temple à conquérir.
          </span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/auth')}
            className="hero-cta group relative px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold text-lg rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-1 flex items-center gap-3"
          >
            <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
            COMMENCER L'EXPÉDITION
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={() => navigate('/auth?mode=inscription')}
            className="hero-cta px-8 py-4 border-2 border-amber-500/50 text-amber-400 font-semibold text-lg rounded-xl hover:bg-amber-500/10 hover:border-amber-400 transition-all duration-300 hover:-translate-y-1"
          >
            S'INSCRIRE
          </button>
        </div>

        {/* Bottom Info */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-amber-100/50">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Mentor IA
          </span>
          <span>•</span>
          <span>Méthode Socratique</span>
          <span>•</span>
          <span>Univers Maya / Inca / Tomb Raider</span>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent z-[5]" />
    </section>
  );
}
