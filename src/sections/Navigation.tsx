import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Menu, X } from 'lucide-react';
import { gsap } from 'gsap';

export function Navigation() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Entrance animation
    gsap.fromTo('.nav-logo', 
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 }
    );
    
    gsap.fromTo('.nav-link',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1, delay: 0.4 }
    );
    
    gsap.fromTo('.nav-cta',
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.8 }
    );
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'nav-glass py-3' : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="nav-logo flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg rotate-45 opacity-80" />
              <Compass className="relative w-6 h-6 text-slate-900" />
            </div>
            <span className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-400 tracking-wider">
              MAYA EXPLORER
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'ACCUEIL', id: 'hero' },
              { label: 'EXPÉDITIONS', id: 'method' },
              { label: 'MATIÈRES', id: 'subjects' },
              { label: 'FONCTIONNALITÉS', id: 'features' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="nav-link relative text-sm font-medium text-amber-100/80 hover:text-amber-400 transition-colors duration-300 tracking-wider group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <button 
            onClick={() => navigate('/auth')}
            className="nav-cta hidden md:flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold text-sm rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5"
          >
            <Compass className="w-4 h-4" />
            COMMENCER
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-amber-400 hover:text-amber-300 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-500 ${
            isMobileMenuOpen ? 'max-h-80 opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-lg rounded-xl border border-amber-500/20 p-4 space-y-2">
            {[
              { label: 'ACCUEIL', id: 'hero' },
              { label: 'EXPÉDITIONS', id: 'method' },
              { label: 'MATIÈRES', id: 'subjects' },
              { label: 'FONCTIONNALITÉS', id: 'features' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="block w-full text-left px-4 py-3 text-amber-100/80 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all duration-300"
              >
                {item.label}
              </button>
            ))}
            <button 
              onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}
              className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-lg"
            >
              COMMENCER L'EXPÉDITION
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
