-- Migration: Authentification parent/élève
-- 1. Ajouter parent_email pour les inscriptions élèves en attente de validation

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- 2. Trigger pour créer/mettre à jour le profil à l'inscription Supabase Auth
-- Si vous avez déjà un trigger handle_new_user, adaptez-le pour inclure parent_email et is_approved

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, parent_id, parent_email, is_approved, daily_time_limit, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'enfant'),
    (NULLIF(NEW.raw_user_meta_data->>'parent_id', '')::uuid),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'parent_email'), ''),
    COALESCE((NEW.raw_user_meta_data->>'is_approved')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'daily_time_limit')::int, 120),
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), profiles.role),
    parent_id = COALESCE(EXCLUDED.parent_id, profiles.parent_id),
    parent_email = COALESCE(EXCLUDED.parent_email, profiles.parent_email),
    is_approved = COALESCE(EXCLUDED.is_approved, profiles.is_approved),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
