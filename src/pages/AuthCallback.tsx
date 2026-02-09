import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getProfile } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/**
 * Page de callback après réinitialisation du mot de passe (lien email Supabase).
 * Supabase traite le hash automatiquement et met à jour la session.
 */
export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      await new Promise((r) => setTimeout(r, 800));
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await getProfile(session.user.id);
        const role = (profile as { role?: string } | null)?.role ?? 'enfant';
        useAuthStore.setState({ user: profile, session, isAuthenticated: !!profile });
        if (role === 'parent') navigate('/parent/dashboard', { replace: true });
        else navigate('/app/map', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    };
    run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
        <p className="text-amber-100/60">Connexion en cours...</p>
      </div>
    </div>
  );
}
