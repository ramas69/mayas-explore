-- Super Admin : politiques RLS pour lire toutes les données

-- Fonction helper pour vérifier si l'utilisateur est super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles : super_admin peut déjà lire via la policy ajoutée (super admin reads all profiles)

-- Gamification
CREATE POLICY "Super admin reads all gamification"
  ON public.gamification FOR SELECT
  USING (public.is_super_admin());

-- Curriculum
CREATE POLICY "Super admin reads all curriculum"
  ON public.curriculum FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admin manages all curriculum"
  ON public.curriculum FOR ALL
  USING (public.is_super_admin());

-- Sessions
CREATE POLICY "Super admin reads all sessions"
  ON public.sessions FOR SELECT
  USING (public.is_super_admin());

-- Bulletin analyses
CREATE POLICY "Super admin reads all bulletins"
  ON public.bulletin_analyses FOR SELECT
  USING (public.is_super_admin());

-- Planning
CREATE POLICY "Super admin reads all planning"
  ON public.planning FOR SELECT
  USING (public.is_super_admin());

-- Programme officiel importé
CREATE POLICY "Super admin reads all programme officiel"
  ON public.programme_officiel_importe FOR SELECT
  USING (public.is_super_admin());

-- Parent notes
CREATE POLICY "Super admin reads all parent notes"
  ON public.parent_notes FOR SELECT
  USING (public.is_super_admin());
