import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Eye, EyeOff, User, Users } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { StoneSelect } from '../ui/StoneSelect';
import type { UserRole } from '../../types';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole>('enfant');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [classe, setClasse] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { signUp, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (role === 'enfant') {
      const trimmedParent = parentEmail.trim().toLowerCase();
      if (!trimmedParent) {
        useAuthStore.setState({ error: 'L\'email du parent est requis.' });
        return;
      }
      if (!classe || !['6ème', '5ème', '4ème', '3ème'].includes(classe)) {
        useAuthStore.setState({ error: 'Veuillez sélectionner votre classe.' });
        return;
      }
      if (email.trim().toLowerCase() === trimmedParent) {
        useAuthStore.setState({ error: 'L\'email de l\'élève doit être différent de celui du parent.' });
        return;
      }
    }

    const options =
      role === 'enfant'
        ? { parentEmail: parentEmail.trim().toLowerCase(), classe: classe || undefined }
        : undefined;

    const { error } = await signUp(email, password, fullName, role, options);

    if (!error) {
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md p-8 stone-card rounded-2xl text-center">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-emerald-500/20 rounded-full">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="font-['Cinzel_Decorative'] text-2xl font-bold text-amber-100 mb-4">
          {role === 'enfant' ? 'Demande envoyée !' : 'Compte créé !'}
        </h2>
        <p className="text-amber-100/60 mb-6">
          {role === 'enfant'
            ? (
              <div className="space-y-4">
                <p><strong>🦜 Vérifie ta boîte mail !</strong> Un email de confirmation t'a été envoyé. Tu dois cliquer sur le lien "Confirmer mon email".</p>
                <p>Ensuite, demande à ton parent de valider ton compte depuis son email ou son tableau de bord.</p>
              </div>
            )
            : 'Ton compte parent est créé. Vérifie tes emails pour confirmer ton adresse, puis tu pourras ajouter tes enfants.'}
        </p>
        <button
          onClick={onToggleMode}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl"
        >
          Se Connecter
        </button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="w-full max-w-md p-8 stone-card rounded-2xl">
        <div className="text-center mb-8">
          <h2 className="font-['Cinzel_Decorative'] text-2xl font-bold text-amber-100">
            Choisis ton Rôle
          </h2>
          <p className="text-amber-100/60 mt-2">
            Es-tu un explorateur ou un superviseur ?
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => { setRole('enfant'); setStep(2); }}
            className="w-full p-6 stone-card rounded-xl hover:border-amber-400/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-amber-100 group-hover:text-golden transition-colors">
                  Je suis un Explorateur
                </h3>
                <p className="text-sm text-amber-100/60">
                  Élève qui veut apprendre en s'amusant
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setRole('parent'); setStep(2); }}
            className="w-full p-6 stone-card rounded-xl hover:border-amber-400/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-amber-100 group-hover:text-golden transition-colors">
                  Je suis un Superviseur
                </h3>
                <p className="text-sm text-amber-100/60">
                  Parent qui veut suivre la progression
                </p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onToggleMode}
          className="mt-6 w-full text-center text-amber-100/60 hover:text-amber-400 text-sm"
        >
          Déjà un compte ? Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 stone-card rounded-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setStep(1)}
          className="text-amber-100/60 hover:text-amber-400"
        >
          ← Retour
        </button>
        <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100">
          Inscription {role === 'enfant' ? 'Explorateur' : 'Superviseur'}
        </h2>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 stone-alert-error">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-100/80 mb-2">
            Nom complet
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all"
            placeholder={role === 'enfant' ? 'Prénom' : 'Nom du parent'}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-100/80 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all"
            placeholder="ton@email.com"
            required
          />
        </div>

        {role === 'enfant' && (
          <>
            <div>
              <label className="block text-sm font-medium text-amber-100/80 mb-2">
                Ma classe
              </label>
              <StoneSelect
                value={classe}
                onValueChange={setClasse}
                options={[{ value: '6ème', label: '6ème' }, { value: '5ème', label: '5ème' }, { value: '4ème', label: '4ème' }, { value: '3ème', label: '3ème' }]}
                placeholder="Choisir ma classe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-100/80 mb-2">
                Email d'un parent
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all"
                placeholder="parent@email.com"
                required
              />
              <p className="mt-1 text-xs text-amber-100/50">
                Un email sera envoyé pour validation
              </p>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-amber-100/80 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all"
              placeholder="••••••••"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-100/50 hover:text-amber-400 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              Création...
            </>
          ) : (
            'Créer mon Compte'
          )}
        </button>
      </form>
    </div>
  );
}
