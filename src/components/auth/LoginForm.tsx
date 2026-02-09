import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { gsap } from 'gsap';
import { Compass, Eye, EyeOff, Sparkles, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(card,
        { opacity: 0, y: 40, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
      );
      gsap.fromTo('.login-tag',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.3 }
      );
      gsap.fromTo('.login-logo',
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.2 }
      );
      gsap.fromTo('.login-title',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.4 }
      );
      gsap.fromTo('.login-field',
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08, delay: 0.5 }
      );
      gsap.fromTo('.login-cta',
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.8 }
      );
    }, card);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const { error } = await signIn(email, password);
    if (!error) {
      const { user } = useAuthStore.getState();
      if (user?.role === 'parent') navigate('/parent');
      else if (user?.role === 'enfant') navigate('/app');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetSent(false);
    const { error } = await resetPassword(email);
    if (!error) setResetSent(true);
  };

  return (
    <div
      ref={cardRef}
      className="w-full max-w-md p-8 stone-card rounded-2xl relative glyph-reveal"
    >
      {/* Glyph corners */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-400/40 rounded-tl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-400/40 rounded-br-lg" />

      {/* Back to home */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 flex items-center gap-2 text-amber-100/50 hover:text-amber-400 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Accueil</span>
      </button>

      {/* Tag */}
      <div className="login-tag inline-flex items-center gap-2 px-4 py-2 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-full">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-amber-300 tracking-widest uppercase">
          Reprends l'Expédition
        </span>
      </div>

      {/* Logo */}
      <div className="login-logo text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl rotate-45 shadow-xl shadow-amber-500/30 group">
          <Compass className="w-10 h-10 text-slate-900 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
        </div>
        <h2 className="login-title font-['Cinzel_Decorative'] text-2xl sm:text-3xl font-bold text-amber-100">
          Bienvenue, <span className="text-golden">Explorateur</span>
        </h2>
        <p className="text-amber-100/60 mt-2 text-sm sm:text-base">
          Connecte-toi pour continuer ton expédition
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 stone-alert-error">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Mot de passe oublié */}
      {forgotPasswordMode ? (
        <div className="space-y-5">
          {resetSent ? (
            <>
              <div className="stone-alert-success p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                <p className="text-sm text-amber-200">
                  Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifie ta boîte mail (et les spams).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForgotPasswordMode(false)}
                className="w-full py-3 text-amber-400 hover:text-golden font-medium text-sm transition-colors"
              >
                ← Retour à la connexion
              </button>
            </>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <p className="text-amber-100/70 text-sm">
                Saisis ton email pour recevoir un lien de réinitialisation.
              </p>
              <div className="login-field">
                <label className="block text-sm font-medium text-amber-100/80 mb-2 tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all ease-temple"
                  placeholder="ton@email.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="login-cta w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 font-bold rounded-xl tracking-wider uppercase text-sm hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Envoi...
                  </>
                ) : (
                  'Envoyer le lien'
                )}
              </button>
              <button
                type="button"
                onClick={() => setForgotPasswordMode(false)}
                className="w-full py-3 text-amber-100/60 hover:text-amber-400 text-sm transition-colors"
              >
                ← Retour à la connexion
              </button>
            </form>
          )}
        </div>
      ) : (
      /* Form de connexion */
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="login-field">
          <label className="block text-sm font-medium text-amber-100/80 mb-2 tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all ease-temple"
            placeholder="ton@email.com"
            required
          />
        </div>

        <div className="login-field">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-amber-100/80 tracking-wider">
              Mot de passe
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotPasswordMode(true);
                setResetSent(false);
                clearError();
              }}
              className="text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all ease-temple pr-12"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-100/50 hover:text-amber-400 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="login-cta w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 font-bold rounded-xl tracking-wider uppercase text-sm hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="relative z-10" />
              <span className="relative z-10">Connexion...</span>
            </>
          ) : (
            <>
              <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500 relative z-10" />
              <span className="relative z-10">Se Connecter</span>
            </>
          )}
        </button>
      </form>
      )}

      {/* Divider */}
      <div className="section-divider my-6" />

      {/* Toggle */}
      <p className="text-center text-amber-100/60 text-sm">
        Pas encore de compte ?{' '}
        <button
          onClick={onToggleMode}
          className="text-amber-400 hover:text-golden font-semibold transition-colors"
        >
          S'inscrire
        </button>
      </p>
    </div>
  );
}
