-- Super Admin : rôle au-dessus de tout, configuration globale, sources de scraping

-- 1. Ajouter le rôle super_admin aux profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('parent', 'enfant', 'super_admin'));

-- 2. Table des sources de scraping (configurées par le super admin)
CREATE TABLE IF NOT EXISTS public.admin_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('programme_api', 'programme_scrape', 'bulletin', 'planning')),
  url TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sources_type ON public.admin_sources(type);
ALTER TABLE public.admin_sources ENABLE ROW LEVEL SECURITY;

-- Seul le super_admin peut gérer les sources
CREATE POLICY "Super admin manages sources"
  ON public.admin_sources FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 3. Table programme_collège global (scrapé par admin, partagé par classe)
CREATE TABLE IF NOT EXISTS public.programme_college_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe TEXT NOT NULL CHECK (classe IN ('6ème', '5ème', '4ème', '3ème')),
  subject TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  description TEXT,
  source_id UUID REFERENCES public.admin_sources(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_programme_college_global_unique
  ON public.programme_college_global(classe, subject, chapter_name);
CREATE INDEX IF NOT EXISTS idx_programme_college_global_classe ON public.programme_college_global(classe);
CREATE INDEX IF NOT EXISTS idx_programme_college_global_subject ON public.programme_college_global(subject);
ALTER TABLE public.programme_college_global ENABLE ROW LEVEL SECURITY;

-- Super admin gère, tout le monde peut lire (pour alimenter les curriculums)
CREATE POLICY "Super admin manages programme college global"
  ON public.programme_college_global FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Anyone authenticated can read programme college global"
  ON public.programme_college_global FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. RLS : Super admin voit tout
-- Profiles
CREATE POLICY "Super admin reads all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

CREATE POLICY "Super admin updates any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );
