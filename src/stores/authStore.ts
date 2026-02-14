import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';
import {
  supabase,
  getProfile,
  signUpParent,
  createChildByParent,
  inviteChildByEmail,
  resendInviteChildByEmail,
  signUpChildSelfRegister,
  approveChildAccount,
  linkPendingChildrenToParent,
} from '../lib/supabase';
import type { Profile, UserRole } from '../types';

export type SignUpOptions = {
  parentId?: string; // parent crée l'enfant (compte approuvé)
  parentEmail?: string; // enfant s'inscrit seul (en attente)
  classe?: string; // 6ème, 5ème, 4ème, 3ème (collégiens)
};

interface AuthState {
  user: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  registrationSuccess: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    options?: SignUpOptions
  ) => Promise<{ error?: Error }>;
  createChildAccount: (email: string, password: string, fullName: string) => Promise<{ error?: Error }>;
  inviteChildAccount: (email: string, fullName: string, classe?: string) => Promise<{ error?: Error }>;
  resendInviteChildAccount: (email: string) => Promise<{ email_sent?: boolean; action_link?: string; error?: Error }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: Error }>;
  approveChild: (childId: string) => Promise<void>;
  clearError: () => void;
  resetRegistrationSuccess: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      registrationSuccess: false,
      error: null,

      initialize: async () => {
        try {
          // 1. Initial Load via Listener (Avoids race condition with getSession)
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AUTH] Change:', event);

            const currentUser = get().user;
            const currentSession = get().session;

            if (event === 'SIGNED_OUT') {
              set({ user: null, session: null, isAuthenticated: false, isLoading: false });
              return;
            }

            if (session?.user) {
              // Optimisation : Si c'est juste un refresh et qu'on a déjà le user, on ne recharge pas le profil
              if ((event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') &&
                currentUser?.id === session.user.id &&
                currentSession?.access_token !== session.access_token) {
                // Just update session token if changed
                set({ session, isLoading: false });
                return;
              }

              // Si on a déjà le profil chargé pour cet user (INITIAL_SESSION avec data persistée), on évite le fetch
              if (event === 'INITIAL_SESSION' && currentUser?.id === session.user.id) {
                set({ session, isLoading: false });
                return;
              }

              // Sinon (SIGNED_IN, ou changement user), on charge le profil
              if (!currentUser || currentUser.id !== session.user.id) {
                set({ isLoading: true }); // Show loading only if we really switch users
              }

              const { data: profile } = await getProfile(session.user.id);

              if (profile?.role === 'parent' && profile?.email) {
                await linkPendingChildrenToParent(profile.id, profile.email);
              }
              set({ user: profile, session, isAuthenticated: !!profile, isLoading: false });
            } else if (!session) {
              // No session (maybe waiting for auth)
              set({ user: null, session: null, isAuthenticated: false, isLoading: false });
            }
          });

        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            const { data: profile } = await getProfile(data.user.id);

            if (profile?.role === 'enfant' && !profile.is_approved) {
              set({
                error: 'Votre compte est en attente d\'approbation parentale.',
                isLoading: false,
              });
              return { error: new Error('Account not approved') };
            }

            // Parent : lier les enfants en attente (parent_email = mon email)
            if (profile?.role === 'parent' && profile?.email) {
              await linkPendingChildrenToParent(profile.id, profile.email);
            }

            set({
              user: profile,
              session: data.session,
              isAuthenticated: true,
              isLoading: false,
            });
          }

          return {};
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return { error: error as Error };
        }
      },

      signUp: async (email, password, fullName, role, options) => {
        const formatAuthError = (msg: string) => {
          if (/already.*registered|already exists/i.test(msg)) return 'Un compte existe déjà avec cet email.';
          if (/invalid.*password|password.*weak/i.test(msg)) return 'Le mot de passe doit contenir au moins 8 caractères.';
          if (/invalid.*email|email.*invalid/i.test(msg)) return 'Adresse email invalide.';
          if (/rate limit|too many/i.test(msg)) return 'Trop de tentatives. Réessaie dans quelques minutes.';
          return msg;
        };
        set({ isLoading: true, error: null });
        try {
          if (role === 'parent') {
            const { error } = await signUpParent(email, password, fullName);
            if (error) throw error;
          } else if (role === 'enfant') {
            if (options?.parentId) {
              // Parent crée l'enfant (géré par createChildAccount)
              const { error } = await createChildByParent(
                email,
                password,
                fullName,
                options.parentId,
                options.classe
              );
              if (error) throw error;
            } else if (options?.parentEmail) {
              // Enfant s'inscrit seul avec email du parent
              const { error } = await signUpChildSelfRegister(
                email,
                password,
                fullName,
                options.parentEmail,
                options.classe
              );
              if (error) throw error;
            } else {
              throw new Error('Email du parent requis pour les inscriptions élève.');
            }
          }

          set({ isLoading: false, registrationSuccess: true });
          return {};
        } catch (error) {
          const msg = (error as Error).message;
          set({ error: formatAuthError(msg), isLoading: false });
          return { error: error as Error };
        }
      },

      createChildAccount: async (email, password, fullName) => {
        const { user } = get();
        if (!user || user.role !== 'parent') {
          return { error: new Error('Réservé aux parents') };
        }
        set({ isLoading: true, error: null });
        try {
          const { error } = await createChildByParent(email, password, fullName, user.id);
          if (error) throw error;
          set({ isLoading: false });
          return {};
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return { error: error as Error };
        }
      },

      inviteChildAccount: async (email, fullName, classe) => {
        const { user } = get();
        if (!user || user.role !== 'parent') {
          return { error: new Error('Réservé aux parents') };
        }
        set({ isLoading: true, error: null });
        try {
          const { error } = await inviteChildByEmail(email, fullName || 'Explorateur', user.id, classe);
          if (error) throw error;
          set({ isLoading: false });
          return {};
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return { error: error as Error };
        }
      },

      resendInviteChildAccount: async (email) => {
        const { user } = get();
        if (!user || user.role !== 'parent') {
          return { error: new Error('Réservé aux parents') };
        }
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await resendInviteChildByEmail(email, user.id);
          if (error) throw new Error(error.message);
          set({ isLoading: false });
          return { email_sent: data?.email_sent ?? false };
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return { error: error as Error };
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (error) {
          console.error('[Auth] Error signing out:', error);
        } finally {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          });
          // Force clear local storage if persist is used
          localStorage.removeItem('auth-storage');
        }
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
          });
          if (error) throw error;
          set({ isLoading: false });
          return {};
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return { error: error as Error };
        }
      },

      approveChild: async (childId: string) => {
        const { error } = await approveChildAccount(childId);
        if (error) set({ error: error.message });
      },

      clearError: () => set({ error: null }),
      resetRegistrationSuccess: () => set({ registrationSuccess: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session, isAuthenticated: state.isAuthenticated }),
    }
  )
);
