import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ParticleEffects } from '../components/ParticleEffects';
import { Compass, MapPin } from 'lucide-react';

export function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const title = titleRef.current;
    const cta = ctaRef.current;
    if (!container || !title || !cta) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(title,
        { opacity: 0, y: 30, clipPath: 'inset(100% 0 0 0)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0 0 0)',
          duration: 1,
          ease: 'power3.out',
          delay: 0.3,
        }
      );
      gsap.fromTo('.notfound-subtitle',
        { opacity: 0, filter: 'blur(8px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out', delay: 0.6 }
      );
      gsap.fromTo(cta,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 1 }
      );
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <ParticleEffects />
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.jpg"
          alt="Jungle"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-900" />
      </div>
      {/* God Rays */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-40 h-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent transform -rotate-12 blur-3xl" />
      </div>

      <div
        ref={containerRef}
        className="relative z-10 max-w-lg w-full text-center"
      >
        {/* 404 Number */}
        <div className="mb-6">
          <span className="font-['Cinzel_Decorative'] text-8xl sm:text-9xl font-bold text-golden text-shadow-gold opacity-90">
            404
          </span>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="font-['Cinzel_Decorative'] text-2xl sm:text-4xl font-bold text-amber-100 mb-4"
        >
          Territoire <span className="text-golden">Inconnu</span>
        </h1>

        <p className="notfound-subtitle text-amber-100/70 text-lg mb-10 max-w-md mx-auto">
          Cette page n'existe pas dans la jungle. Reviens sur le chemin de l'expédition.
        </p>

        {/* CTA */}
        <Link
          ref={ctaRef}
          to="/"
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 font-bold rounded-xl tracking-wider uppercase text-sm hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300 group"
        >
          <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
          Retour à l'accueil
        </Link>

        {/* Decorative */}
        <div className="mt-16 flex items-center justify-center gap-2 text-amber-100/40 text-sm">
          <MapPin className="w-4 h-4" />
          <span>Maya Explorer</span>
        </div>
      </div>
    </div>
  );
}
