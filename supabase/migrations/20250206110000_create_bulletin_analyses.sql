-- Migration: Table bulletin_analyses (fichier + analyse IA, partagé parent/enfant)
-- Enregistre chaque bulletin uploadé et son analyse, rattaché à l'enfant

CREATE TABLE IF NOT EXISTS public.bulletin_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image')),
  extracted_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulletin_analyses_student_id ON public.bulletin_analyses(student_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_analyses_created_at ON public.bulletin_analyses(created_at DESC);

-- RLS
ALTER TABLE public.bulletin_analyses ENABLE ROW LEVEL SECURITY;

-- L'enfant peut lire ses propres bulletins
CREATE POLICY "Students can read own bulletins"
  ON public.bulletin_analyses FOR SELECT
  USING (auth.uid() = student_id);

-- Le parent peut lire les bulletins de ses enfants
CREATE POLICY "Parents can read children bulletins"
  ON public.bulletin_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = bulletin_analyses.student_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Le parent peut insérer pour ses enfants
CREATE POLICY "Parents can insert bulletins for children"
  ON public.bulletin_analyses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = student_id
      AND profiles.parent_id = auth.uid()
    )
  );
