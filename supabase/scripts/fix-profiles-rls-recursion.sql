-- À exécuter dans Supabase SQL Editor si supabase db push n'est pas disponible
-- Fix: récursion infinie "infinite recursion detected in policy for relation profiles"

-- 1. Créer la fonction si elle n'existe pas
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Corriger les policies profiles
DROP POLICY IF EXISTS "Super admin reads all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin updates any profile" ON public.profiles;

CREATE POLICY "Super admin reads all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admin updates any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin());

-- 3. Corriger admin_sources et programme_college_global
DROP POLICY IF EXISTS "Super admin manages sources" ON public.admin_sources;
CREATE POLICY "Super admin manages sources"
  ON public.admin_sources FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin manages programme college global" ON public.programme_college_global;
CREATE POLICY "Super admin manages programme college global"
  ON public.programme_college_global FOR ALL
  USING (public.is_super_admin());
