-- Fix: Récursion infinie des policies profiles
-- Les policies queryaient profiles pour vérifier le rôle → RLS sur profiles → récursion infinie.
-- Solution: utiliser is_super_admin() (SECURITY DEFINER, bypass RLS)

DROP POLICY IF EXISTS "Super admin reads all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin updates any profile" ON public.profiles;

CREATE POLICY "Super admin reads all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admin updates any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin());

-- Aussi remplacer les checks inline dans admin_sources et programme_college_global
DROP POLICY IF EXISTS "Super admin manages sources" ON public.admin_sources;
CREATE POLICY "Super admin manages sources"
  ON public.admin_sources FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin manages programme college global" ON public.programme_college_global;
CREATE POLICY "Super admin manages programme college global"
  ON public.programme_college_global FOR ALL
  USING (public.is_super_admin());
