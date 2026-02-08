-- Migration: Créer la table profiles (prérequis pour l'auth parent/élève)

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'enfant' CHECK (role IN ('parent', 'enfant')),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_email TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  daily_time_limit INTEGER NOT NULL DEFAULT 120,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes parent/enfant
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_email ON public.profiles(parent_email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut lire son propre profil
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Un parent peut lire les profils de ses enfants
CREATE POLICY "Parents can read children profiles"
  ON public.profiles FOR SELECT
  USING (parent_id = auth.uid());

-- Un parent peut mettre à jour (valider) ses enfants
CREATE POLICY "Parents can update children profiles"
  ON public.profiles FOR UPDATE
  USING (parent_id = auth.uid());

-- Les inserts sont gérés par le trigger handle_new_user (SECURITY DEFINER, bypass RLS)
