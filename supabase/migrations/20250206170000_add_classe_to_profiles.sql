-- Ajout de la classe (6ème, 5ème, 4ème, 3ème) pour les collégiens

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS classe TEXT CHECK (classe IN ('6ème', '5ème', '4ème', '3ème'));

-- Mise à jour du trigger pour inclure classe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, parent_id, parent_email, is_approved, daily_time_limit, full_name, classe, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'enfant'),
    (NULLIF(NEW.raw_user_meta_data->>'parent_id', '')::uuid),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'parent_email'), ''),
    COALESCE((NEW.raw_user_meta_data->>'is_approved')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'daily_time_limit')::int, 120),
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(TRIM(NEW.raw_user_meta_data->>'classe'), ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), profiles.role),
    parent_id = COALESCE(EXCLUDED.parent_id, profiles.parent_id),
    parent_email = COALESCE(EXCLUDED.parent_email, profiles.parent_email),
    is_approved = COALESCE(EXCLUDED.is_approved, profiles.is_approved),
    classe = COALESCE(NULLIF(EXCLUDED.classe, ''), profiles.classe),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- L'élève peut mettre à jour son propre profil (classe, nom)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
