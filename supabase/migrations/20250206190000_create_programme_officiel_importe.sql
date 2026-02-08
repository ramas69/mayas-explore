-- Table pour stocker les programmes officiels importés depuis l'API Éducation nationale
CREATE TABLE IF NOT EXISTS public.programme_officiel_importe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle TEXT NOT NULL CHECK (cycle IN ('Cycle 3', 'Cycle 4')),
  discipline TEXT NOT NULL,
  descriptif TEXT NOT NULL,
  contenu_url TEXT,
  texte_officiel TEXT,
  entre_en_vigueur TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programme_officiel_importe_student_id ON public.programme_officiel_importe(student_id);
ALTER TABLE public.programme_officiel_importe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own programme imports"
  ON public.programme_officiel_importe FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Parents manage children programme imports"
  ON public.programme_officiel_importe FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid()));
