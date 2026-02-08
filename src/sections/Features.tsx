import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Bot, Map, Trophy, Users } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    id: 'mentor',
    title: 'MENTOR IA PERSONNALISÉ',
    subtitle: 'Socrate version 2.0',
    description: 'Notre intelligence artificielle adapte son enseignement à ton rythme et ton style d\'apprentissage. Elle te pose les bonnes questions pour t\'aider à découvrir les réponses par toi-même.',
    image: '/feature-mentor.jpg',
    icon: Bot,
    stats: [
      { value: '24/7', label: 'Disponible' },
      { value: '100%', label: 'Personnalisé' },
    ],
    reverse: false,
  },
  {
    id: 'map',
    title: 'CARTE AU TRÉSOR',
    subtitle: 'Progression visuelle',
    description: 'Suive ton parcours d\'apprentissage comme une véritable expédition. Chaque chapitre conquis devient un territoire découvert sur ta carte personnelle.',
    image: '/feature-map.jpg',
    icon: Map,
    stats: [
      { value: '50+', label: 'Zones' },
      { value: '100%', label: 'Visuel' },
    ],
    reverse: true,
  },
  {
    id: 'badges',
    title: 'BADGES & RÉCOMPENSES',
    subtitle: 'Système de collection',
    description: 'Collectionne des badges uniques en or maya pour chaque accomplissement. Débloque des récompenses exclusives et montre tes succès à tes amis.',
    image: '/feature-badges.jpg',
    icon: Trophy,
    stats: [
      { value: '100+', label: 'Badges' },
      { value: 'Rare', label: 'Éditions' },
    ],
    reverse: false,
  },
  {
    id: 'social',
    title: 'EXPÉDITIONS GROUPE',
    subtitle: 'Défis entre amis',
    description: 'Forme une équipe d\'explorateurs avec tes amis. Affrontez des défis ensemble, partagez vos découvertes et grimpez dans le classement.',
    image: '/step3-badge.png',
    icon: Users,
    stats: [
      { value: '∞', label: 'Équipes' },
      { value: 'Top', label: 'Classement' },
    ],
    reverse: true,
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo('.features-title',
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

      // Feature items animation
      features.forEach((_, index) => {
        const isReverse = index % 2 === 1;
        
        gsap.fromTo(`.feature-content-${index}`,
          { opacity: 0, x: isReverse ? 100 : -100 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: `.feature-item-${index}`,
              start: 'top 70%',
            }
          }
        );

        gsap.fromTo(`.feature-image-${index}`,
          { opacity: 0, x: isReverse ? -100 : 100, rotateY: isReverse ? -30 : 30 },
          {
            opacity: 1,
            x: 0,
            rotateY: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: `.feature-item-${index}`,
              start: 'top 70%',
            }
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="features" className="relative py-24 z-10">
      {/* Section Title */}
      <div className="features-title text-center mb-20 px-4">
        <span className="inline-block px-4 py-2 mb-4 text-sm font-medium text-amber-400/80 tracking-widest uppercase border border-amber-500/30 rounded-full">
          Équipement d'Exploration
        </span>
        <h2 className="font-['Cinzel_Decorative'] text-3xl sm:text-4xl md:text-5xl font-bold text-amber-100 mb-4">
          Artefacts du <span className="text-golden">Pouvoir</span>
        </h2>
        <p className="max-w-2xl mx-auto text-amber-100/60 text-lg">
          Des outils puissants pour mener à bien ta quête du savoir.
        </p>
      </div>

      {/* Features List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isReverse = feature.reverse;
          
          return (
            <div 
              key={feature.id}
              className={`feature-item-${index} grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center`}
            >
              {/* Content */}
              <div className={`feature-content-${index} ${isReverse ? 'lg:order-2' : ''}`}>
                {/* Icon & Title */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                    <Icon className="w-6 h-6 text-slate-900" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-amber-400/80 tracking-wider uppercase">
                      {feature.subtitle}
                    </span>
                    <h3 className="font-['Cinzel_Decorative'] text-2xl sm:text-3xl font-bold text-amber-100">
                      {feature.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-amber-100/70 text-lg leading-relaxed mb-8">
                  {feature.description}
                </p>

                {/* Stats */}
                <div className="flex gap-8">
                  {feature.stats.map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-3xl font-bold text-golden font-['Cinzel_Decorative']">
                        {stat.value}
                      </div>
                      <div className="text-sm text-amber-100/50 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image */}
              <div 
                className={`feature-image-${index} ${isReverse ? 'lg:order-1' : ''}`}
                style={{ perspective: '1000px' }}
              >
                <div className="relative group">
                  {/* Glow Effect */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Image Container */}
                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 group-hover:border-amber-500/40 transition-colors duration-300">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    
                    {/* Corner Decorations */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-400/40 rounded-tl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-400/40 rounded-br-lg" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
