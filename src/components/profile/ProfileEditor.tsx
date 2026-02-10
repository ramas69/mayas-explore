/**
 * Éditeur de profil pour l'élève (collégien).
 * Permet de configurer la classe, le prénom, le mot de passe, etc.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { User, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { StoneSelect } from '../ui/StoneSelect';
import { toast } from 'sonner';
import type { Classe } from '../../types';

const CLASSES: Classe[] = ['6ème', '5ème', '4ème', '3ème'];

export function ProfileEditor() {
  const { user, initialize } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [classe, setClasse] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [pendingPassword, setPendingPassword] = useState({ new: '', confirm: '' });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setClasse((user.classe as string) || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSaving(true);
    setSaved(false);
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          classe: CLASSES.includes(classe as Classe) ? classe : null,
        })
        .eq('id', user.id);
      await initialize();
      setSaved(true);
    } catch (_) { }
    setIsSaving(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPendingPassword({ new: newPassword, confirm: confirmPassword });

    // Temporarily bypass ConfimDialog to avoid UI freeze
    if (window.confirm("Voulez-vous vraiment changer le mot de passe ? \n(Cette action est irréversible et nécessitera le nouveau mot de passe à la prochaine connexion.)")) {
      handleConfirmPasswordChange(newPassword);
    }
    // setShowPasswordConfirm(true);
  };

  const handleConfirmPasswordChange = async (targetPassword?: string) => {
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsChangingPassword(true);

    // Use argument if provided (sync), otherwise pending (async state from previous render?)
    const passwordToUse = targetPassword || pendingPassword.new;

    try {
      console.log('[DEBUG] ConfirmDialog triggered. Starting handleConfirmPasswordChange...');

      // 1. Verify session exists before request
      console.log('[DEBUG] Checking session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[DEBUG] Session error:', sessionError);
        throw sessionError;
      }
      if (!sessionData.session) {
        console.error('[DEBUG] No active session');
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      console.log('[DEBUG] Session active for user:', sessionData.session.user.id);

      /*
      // 2. Connectivity Test (Metadata update)
      console.log('[DEBUG] Testing connectivity (metadata update)...');
      try {
        const { error: testError } = await supabase.auth.updateUser({
          data: { last_check: new Date().toISOString() }
        });
        if (testError) {
          console.error('[DEBUG] Connectivity test FAILED:', testError);
        } else {
          console.log('[DEBUG] Connectivity test PASSED.');
        }
      } catch (e) {
        console.error('[DEBUG] Connectivity test EXCEPTION:', e);
      }
      */

      // 3. Direct API Call (Bypass supabase-js client)
      console.log('[DEBUG] Trying direct fetch to bypass client hang...');

      const session = sessionData.session;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configuration Supabase manquante (URL/KEY)");
      }

      console.log('[DEBUG] Sending direct PUT to /auth/v1/user ...');

      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ password: passwordToUse })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('[DEBUG] Direct fetch error:', responseData);
        throw new Error(responseData.msg || responseData.error_description || responseData.message || "Erreur lors de la mise à jour");
      }

      console.log('[DEBUG] Direct fetch SUCCESS:', responseData);

      /*
      // Update local session if needed? usually session refreshes automatically.
      // SKIP refresh because client might hang!
      // const { data: refreshedSession } = await supabase.auth.refreshSession();
      // console.log('[DEBUG] Session refreshed:', refreshedSession);
      */

      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      toast.success("Mot de passe modifié avec succès ! (Via Direct API)");
    } catch (err) {
      console.error('[DEBUG] Password change failed (catch block):', err);
      const msg = (err as Error).message;
      setPasswordError(msg);
      toast.error(`Erreur: ${msg}`);
      // RETHROW so ConfirmDialog knows it failed and stays open
      throw err;
    } finally {
      console.log('[DEBUG] handleConfirmPasswordChange finally block executing.');
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 stone-card rounded-2xl max-w-md">
      <h2 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-amber-400" />
        Mon profil
      </h2>
      <p className="text-amber-100/60 text-sm mb-6">
        Configure ton profil d'exploratrice. C'est pour les collégiens uniquement.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-amber-100/80 text-sm mb-2">Prénom</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Mon prénom"
            className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
          />
        </div>

        <div>
          <label className="block text-amber-100/80 text-sm mb-2">Ma classe</label>
          <StoneSelect
            value={classe}
            onValueChange={setClasse}
            options={CLASSES.map((c) => ({ value: c, label: c }))}
            placeholder="Choisir ma classe"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <LoadingSpinner size="sm" />
          ) : saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Enregistré
            </>
          ) : (
            'Enregistrer'
          )}
        </button>
      </form>

      {/* Changer le mot de passe */}
      <div className="mt-8 pt-8 border-t border-amber-500/20">
        <h3 className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-100 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-400" />
          Changer le mot de passe
        </h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-amber-100/80 text-sm mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-100/50 hover:text-amber-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-amber-100/80 text-sm mb-2">Confirmer le mot de passe</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/20 rounded-xl text-amber-100"
            />
          </div>
          {passwordError && (
            <div className="stone-alert-error">
              <p className="text-sm">{passwordError}</p>
            </div>
          )}
          {passwordSuccess && (
            <div className="stone-alert-success">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">Mot de passe mis à jour.</p>
            </div>
          )}
          <button
            type="submit"
            disabled={isChangingPassword || !newPassword || !confirmPassword}
            className="w-full py-3 border border-amber-500/30 text-amber-400 rounded-xl font-medium hover:bg-amber-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isChangingPassword ? <LoadingSpinner size="sm" /> : <Lock className="w-4 h-4" />}
            Changer le mot de passe
          </button>
        </form>
        <ConfirmDialog
          open={showPasswordConfirm}
          onOpenChange={setShowPasswordConfirm}
          title="Changer le mot de passe ?"
          description="Tu vas modifier ton mot de passe. Tu devras utiliser le nouveau mot de passe pour te connecter la prochaine fois."
          confirmLabel="Confirmer"
          cancelLabel="Annuler"
          variant="default"
          onConfirm={handleConfirmPasswordChange}
        />
      </div>
    </div>
  );
}
