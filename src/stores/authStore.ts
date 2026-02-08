import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
  approveChild: (childId: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
              set({ user: null, session: null, isAuthenticated: false });
              return;
            }
            if (session?.user) {
              const { data: profile } = await getProfile(session.user.id);
              set({ user: profile, session, isAuthenticated: !!profile });
            }
          });

          if (session?.user) {
            let { data: profile } = await getProfile(session.user.id);

            // Si pas de profil (trigger pas encore passé), on attend un peu et réessaie
            if (!profile) {
              await new Promise((r) => setTimeout(r, 500));
              const res = await getProfile(session.user.id);
              profile = res.data;
            }

            // Parent : lier les enfants en attente (parent_email = mon email)
            if (profile?.role === 'parent' && profile?.email) {
              await linkPendingChildrenToParent(profile.id, profile.email);
            }

            set({
              user: profile,
              session,
              isAuthenticated: !!profile,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
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
                isLoading: false 
              });
              return { error: new Error('Account not approved') };
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

          set({ isLoading: false });
          return {};
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
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
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        });
      },

      approveChild: async (childId: string) => {
        const { error } = await approveChildAccount(childId);
        if (error) set({ error: error.message });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session, isAuthenticated: state.isAuthenticated }),
    }
  )
);
