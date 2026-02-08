import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, MessageCircle, Award } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'CHOISIS TA MISSION',
    description: 'Sélectionne ton chapitre à conquérir. Chaque matière est un territoire mystérieux à explorer.',
    image: '/step1-map.png',
    icon: MapPin,
    color: 'from-amber-500 to-orange-500',
  },
  {
    number: '02',
    title: "L'IA TE GUIDE",
    description: 'Ton mentor socratique personnalisé t\'accompagne pas à pas dans ta découverte.',
    image: '/step2-mentor.png',
    icon: MessageCircle,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    number: '03',
    title: 'DÉCOUVRE LE TRÉSOR',
    description: 'Valide tes connaissances et collectionne tes badges de conquérant.',
    image: '/step3-badge.png',
    icon: Award,
    color: 'from-emerald-500 to-green-500',
  },
];

export function Method() {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const path = pathRef.current;
    if (!section || !path) return;

    const ctx = gsap.context(() => {
      // Path drawing animation
      const pathLength = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
      });

      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 2,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: section,
          start: 'top 60%',
          end: 'center center',
          scrub: 1,
        },
      });

      // Title animation
      gsap.fromTo('.method-title',
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
          }
        }
      );

      // Steps animation
      gsap.fromTo('.method-step',
        { opacity: 0, scale: 0, rotateY: -30 },
        {
          opacity: 1,
          scale: 1,
          rotateY: 0,
          duration: 0.8,
          ease: 'back.out(1.7)',
          stagger: 0.3,
          scrollTrigger: {
            trigger: section,
            start: 'top 50%',
          }
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="method" className="relative py-24 z-10">
      {/* Section Title */}
      <div className="method-title text-center mb-20 px-4">
        <span className="inline-block px-4 py-2 mb-4 text-sm font-medium text-amber-400/80 tracking-widest uppercase border border-amber-500/30 rounded-full">
          La Méthode
        </span>
        <h2 className="font-['Cinzel_Decorative'] text-3xl sm:text-4xl md:text-5xl font-bold text-amber-100 mb-4">
          Trois Étapes vers la <span className="text-golden">Conquête</span>
        </h2>
        <p className="max-w-2xl mx-auto text-amber-100/60 text-lg">
          Comme une véritable expédition archéologique, chaque étape te rapproche du trésor de la connaissance.
        </p>
      </div>

      {/* Steps Container */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Connection Path - Desktop */}
        <svg 
          className="absolute top-1/2 left-0 w-full h-32 -translate-y-1/2 hidden lg:block pointer-events-none"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
        >
          <path
            ref={pathRef}
            d="M 100 50 Q 300 20, 400 50 T 700 50 T 1100 50"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFA500" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
          </defs>
        </svg>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="method-step group relative"
                style={{ perspective: '1000px' }}
              >
                <div className="relative p-8 stone-card rounded-3xl text-center hover:scale-105 transition-all duration-500">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold text-sm rounded-full">
                    ÉTAPE {step.number}
                  </div>

                  {/* Image */}
                  <div className="relative mb-6 flex justify-center">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                      {/* Glow Ring */}
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`} />
                      
                      {/* Image Container */}
                      <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-amber-500/30 group-hover:border-amber-400/60 transition-colors duration-300 bg-slate-900/50">
                        <img 
                          src={step.image} 
                          alt={step.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                      
                      {/* Floating Icon */}
                      <div className={`absolute -bottom-2 -right-2 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br ${step.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-3 group-hover:text-golden transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-amber-100/60 text-sm leading-relaxed">
                    {step.description}
                  </p>

                  {/* Decorative Elements */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-500/20 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-500/20 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
