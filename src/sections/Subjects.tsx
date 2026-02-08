import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calculator, BookOpen, Globe, FlaskConical, Languages, Palette } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const subjects = [
  {
    id: 'math',
    title: 'RUNES NUMÉRIQUES',
    subtitle: 'Mathématiques',
    description: 'Algèbre, géométrie, probabilités - Déchiffre les codes anciens',
    icon: Calculator,
    color: 'from-emerald-500 to-teal-500',
    glyphs: ['∑', 'π', '√', '∞'],
  },
  {
    id: 'french',
    title: 'GLYPHES ANCIENS',
    subtitle: 'Français',
    description: 'Grammaire, littérature, expression - Maîtrise les langues sacrées',
    icon: BookOpen,
    color: 'from-amber-500 to-orange-500',
    glyphs: ['À', 'É', 'È', 'Ç'],
  },
  {
    id: 'history',
    title: 'CHRONIQUES OUBLIÉES',
    subtitle: 'Histoire-Géo',
    description: "Histoire, géographie, EMC - Explore les civilisations perdues",
    icon: Globe,
    color: 'from-rose-500 to-pink-500',
    glyphs: ['⚔', '🌍', '📜', '🏛'],
  },
  {
    id: 'science',
    title: 'POTIONS MAYAS',
    subtitle: 'Sciences',
    description: 'SVT, physique, chimie - Découvre les secrets de la nature',
    icon: FlaskConical,
    color: 'from-cyan-500 to-blue-500',
    glyphs: ['⚗', '🔬', '🧬', '⚛'],
  },
  {
    id: 'languages',
    title: 'LANGAGES PERDUS',
    subtitle: 'Langues',
    description: 'Anglais, espagnol, LV2 - Apprends les dialectes du monde',
    icon: Languages,
    color: 'from-violet-500 to-purple-500',
    glyphs: ['🇬🇧', '🇪🇸', '🇩🇪', '🇮🇹'],
  },
  {
    id: 'arts',
    title: 'CRÉATIONS SACRÉES',
    subtitle: 'Arts & Sport',
    description: 'Arts, musique, EPS - Exprime ton âme de conquérant',
    icon: Palette,
    color: 'from-fuchsia-500 to-rose-500',
    glyphs: ['🎨', '🎵', '⚽', '🎭'],
  },
];

export function Subjects() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo('.subjects-title',
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

      // Cards stagger animation
      gsap.fromTo('.subject-card',
        { opacity: 0, y: 80, rotateX: 15 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: section,
            start: 'top 60%',
          }
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
    setHoveredCard(cardId);
  };

  return (
    <section ref={sectionRef} id="subjects" className="relative py-24 z-10">
      {/* Section Title */}
      <div className="subjects-title text-center mb-16 px-4">
        <span className="inline-block px-4 py-2 mb-4 text-sm font-medium text-amber-400/80 tracking-widest uppercase border border-amber-500/30 rounded-full">
          Les Territoires
        </span>
        <h2 className="font-['Cinzel_Decorative'] text-3xl sm:text-4xl md:text-5xl font-bold text-amber-100 mb-4">
          Reliques de <span className="text-golden">Connaissance</span>
        </h2>
        <p className="max-w-2xl mx-auto text-amber-100/60 text-lg">
          Chaque matière est un territoire mystérieux à explorer. Choisis ta prochaine destination.
        </p>
      </div>

      {/* Subjects Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => {
            const Icon = subject.icon;
            const isHovered = hoveredCard === subject.id;
            
            return (
              <div
                key={subject.id}
                className="subject-card group relative"
                style={{ perspective: '1000px' }}
                onMouseMove={(e) => handleMouseMove(e, subject.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div 
                  className="relative h-full p-6 stone-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-500"
                  style={{
                    transform: isHovered 
                      ? `rotateX(${(mousePos.y - 50) * -0.1}deg) rotateY(${(mousePos.x - 50) * 0.1}deg)`
                      : 'rotateX(0) rotateY(0)',
                  }}
                >
                  {/* Dynamic Glow */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: isHovered 
                        ? `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 215, 0, 0.15) 0%, transparent 50%)`
                        : 'none',
                    }}
                  />

                  {/* Top Gradient Line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${subject.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

                  {/* Icon & Title */}
                  <div className="relative flex items-start gap-4 mb-4">
                    <div className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br ${subject.color} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100 group-hover:text-golden transition-colors">
                        {subject.title}
                      </h3>
                      <p className={`text-sm font-medium bg-gradient-to-r ${subject.color} bg-clip-text text-transparent`}>
                        {subject.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="relative text-amber-100/60 text-sm leading-relaxed mb-4">
                    {subject.description}
                  </p>

                  {/* Glyphs */}
                  <div className="relative flex items-center gap-2 pt-4 border-t border-amber-500/10">
                    {subject.glyphs.map((glyph, i) => (
                      <span 
                        key={i}
                        className="w-8 h-8 flex items-center justify-center text-lg bg-amber-500/10 rounded-lg text-amber-400/60 group-hover:text-amber-400 group-hover:bg-amber-500/20 transition-all duration-300"
                        style={{ 
                          transitionDelay: `${i * 50}ms`,
                          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        }}
                      >
                        {glyph}
                      </span>
                    ))}
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r ${subject.color}`}>
                      <span className="text-white text-lg">→</span>
                    </div>
                  </div>

                  {/* Corner Decorations */}
                  <div className="absolute top-4 right-4 w-3 h-3 border-t border-r border-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 w-3 h-3 border-b border-l border-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
