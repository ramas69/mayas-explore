import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Compass, Instagram, Twitter, Youtube, Mail, Send } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const quickLinks = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Matières', href: '#subjects' },
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Tarifs', href: '#cta' },
];

const legalLinks = [
  { label: 'CGU', href: '#' },
  { label: 'Confidentialité', href: '#' },
  { label: 'Cookies', href: '#' },
];

const socialLinks = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const ctx = gsap.context(() => {
      // Border draw animation
      gsap.fromTo('.footer-border',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: footer,
            start: 'top 90%',
          }
        }
      );

      // Columns stagger animation
      gsap.fromTo('.footer-column',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: footer,
            start: 'top 85%',
          }
        }
      );

      // Social icons pop animation
      gsap.fromTo('.social-icon',
        { opacity: 0, scale: 0 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'back.out(1.7)',
          stagger: 0.05,
          scrollTrigger: {
            trigger: footer,
            start: 'top 80%',
          }
        }
      );
    }, footer);

    return () => ctx.revert();
  }, []);

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.getElementById(href.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer ref={footerRef} className="relative pt-20 pb-8 z-10">
      {/* Top Border */}
      <div className="footer-border absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent origin-center" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="footer-column lg:col-span-1">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg rotate-45 opacity-80" />
                <Compass className="relative w-6 h-6 text-slate-900" />
              </div>
              <span className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-400 tracking-wider">
                MAYA EXPLORER
              </span>
            </div>

            <p className="text-amber-100/60 text-sm leading-relaxed mb-6">
              Transforme tes révisions en expédition épique. 
              Découvre le savoir comme jamais auparavant.
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="social-icon w-10 h-10 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400/40 hover:text-amber-300 hover:scale-110 transition-all duration-300"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-column">
            <h4 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100 mb-6">
              Liens Rapides
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-amber-100/60 hover:text-amber-400 hover:translate-x-1 transition-all duration-300 text-sm inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-amber-400 transition-all duration-300" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="footer-column">
            <h4 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100 mb-6">
              Légal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-amber-100/60 hover:text-amber-400 hover:translate-x-1 transition-all duration-300 text-sm inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-amber-400 transition-all duration-300" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-column">
            <h4 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100 mb-6">
              Newsletter
            </h4>
            <p className="text-amber-100/60 text-sm mb-4">
              Reçois les dernières découvertes et astuces d'exploration.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/50" />
                <input
                  type="email"
                  placeholder="Ton email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 text-sm"
                />
              </div>
              <button className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/30">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-amber-500/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-amber-100/40 text-sm text-center sm:text-left">
              © 2026 Maya Explorer. Tous droits réservés.
            </p>
            <p className="text-amber-100/40 text-sm flex items-center gap-2">
              Fait avec <span className="text-rose-500">♥</span> pour les explorateurs
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
