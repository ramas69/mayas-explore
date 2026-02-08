import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    id: 1,
    name: 'Sophie M.',
    role: 'Parent',
    avatar: '👩',
    content: "Ma fille a adoré réviser avec Maya Explorer ! Elle qui détestait les maths, elle me demande maintenant quand est-ce qu'elle peut retourner 'conquérir un temple'.",
    rating: 5,
  },
  {
    id: 2,
    name: 'Léo K.',
    role: 'Élève de 4ème',
    avatar: '🧑‍🎓',
    content: "J'ai progressé de 3 points en deux trimestres ! Le système de badges motive trop, je veux tous les débloquer. C'est comme un jeu vidéo mais on apprend en même temps.",
    rating: 5,
  },
  {
    id: 3,
    name: 'Mme Dubois',
    role: 'Professeure de Français',
    avatar: '👩‍🏫',
    content: "Enfin une méthode qui parle le langage des ados ! Mes élèves sont plus motivés et participent activement. L'approche par l'aventure fonctionne à merveille.",
    rating: 5,
  },
  {
    id: 4,
    name: 'Emma R.',
    role: 'Élève de 3ème',
    avatar: '👧',
    content: "Les badges motivent trop ! Je me compare avec mes amis et on se challenge pour voir qui aura le plus de temples conquis. C'est devenu une compétition amicale !",
    rating: 5,
  },
  {
    id: 5,
    name: 'Pierre L.',
    role: 'Parent',
    avatar: '👨',
    content: "Je recommande à 100% ! Mon fils a retrouvé le goût d'apprendre. L'interface est magnifique et l'IA sait vraiment comment l'aider quand il bloque.",
    rating: 5,
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo('.testimonials-title',
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

      gsap.fromTo('.testimonial-carousel',
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 60%',
          }
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  // Auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        goToNext();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex, isAnimating]);

  const goToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const normalizedDiff = ((diff + testimonials.length) % testimonials.length);
    
    if (normalizedDiff === 0) {
      return {
        transform: 'translateX(0) scale(1) rotateY(0deg)',
        opacity: 1,
        zIndex: 10,
      };
    } else if (normalizedDiff === 1 || normalizedDiff === -testimonials.length + 1) {
      return {
        transform: 'translateX(120%) scale(0.8) rotateY(-15deg)',
        opacity: 0.5,
        zIndex: 5,
      };
    } else if (normalizedDiff === testimonials.length - 1 || normalizedDiff === -1) {
      return {
        transform: 'translateX(-120%) scale(0.8) rotateY(15deg)',
        opacity: 0.5,
        zIndex: 5,
      };
    } else {
      return {
        transform: 'translateX(0) scale(0.6)',
        opacity: 0,
        zIndex: 0,
      };
    }
  };

  return (
    <section ref={sectionRef} className="relative py-24 z-10 overflow-hidden">
      {/* Section Title */}
      <div className="testimonials-title text-center mb-16 px-4">
        <span className="inline-block px-4 py-2 mb-4 text-sm font-medium text-amber-400/80 tracking-widest uppercase border border-amber-500/30 rounded-full">
          Témoignages
        </span>
        <h2 className="font-['Cinzel_Decorative'] text-3xl sm:text-4xl md:text-5xl font-bold text-amber-100 mb-4">
          Chroniques d'<span className="text-golden">Explorateurs</span>
        </h2>
        <p className="max-w-2xl mx-auto text-amber-100/60 text-lg">
          Découvre ce que nos aventuriers disent de leur expédition.
        </p>
      </div>

      {/* Carousel */}
      <div className="testimonial-carousel relative max-w-4xl mx-auto px-4" style={{ perspective: '1000px' }}>
        {/* Cards Container */}
        <div className="relative h-[400px] sm:h-[350px]">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out"
              style={getCardStyle(index)}
            >
              <div className="w-full max-w-2xl p-8 stone-card rounded-3xl">
                {/* Quote Icon */}
                <Quote className="w-10 h-10 text-amber-500/30 mb-4" />

                {/* Content */}
                <p className="text-amber-100/80 text-lg leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 flex items-center justify-center text-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-full">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-100">{testimonial.name}</h4>
                    <p className="text-sm text-amber-100/50">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={goToPrev}
            className="w-12 h-12 flex items-center justify-center rounded-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 transition-all duration-300"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setActiveIndex(index);
                    setTimeout(() => setIsAnimating(false), 500);
                  }
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'bg-amber-400 w-8'
                    : 'bg-amber-500/30 hover:bg-amber-500/50'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            className="w-12 h-12 flex items-center justify-center rounded-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 transition-all duration-300"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
