-- Table pour tracer les téléchargements du programme scolaire (visible parent et enfant)
CREATE TABLE IF NOT EXISTS public.programme_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloaded_by_role TEXT NOT NULL CHECK (downloaded_by_role IN ('parent', 'enfant')),
  downloaded_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programme_downloads_student_id ON public.programme_downloads(student_id);
ALTER TABLE public.programme_downloads ENABLE ROW LEVEL SECURITY;

-- L'élève peut lire les téléchargements de son propre programme
CREATE POLICY "Students can read own programme downloads"
  ON public.programme_downloads FOR SELECT
  USING (auth.uid() = student_id);

-- Le parent peut lire les téléchargements des programmes de ses enfants
CREATE POLICY "Parents can read children programme downloads"
  ON public.programme_downloads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid()));

-- L'élève peut insérer un téléchargement pour son propre programme
CREATE POLICY "Students can insert own programme download"
  ON public.programme_downloads FOR INSERT
  WITH CHECK (auth.uid() = student_id AND auth.uid() = downloaded_by_id);

-- Le parent peut insérer un téléchargement pour le programme de son enfant
CREATE POLICY "Parents can insert children programme download"
  ON public.programme_downloads FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid())
    AND auth.uid() = downloaded_by_id
  );
