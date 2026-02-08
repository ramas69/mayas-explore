-- Table planning (emploi du temps + zone scolaire + créneaux hebdomadaires)
CREATE TABLE IF NOT EXISTS public.planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city_zone TEXT NOT NULL CHECK (city_zone IN ('A', 'B', 'C')),
  weekly_slots JSONB NOT NULL DEFAULT '{"file_url":null,"file_type":null,"slots":[]}',
  missed_sessions_count INTEGER NOT NULL DEFAULT 0,
  intensified_vacation_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_student_id ON public.planning(student_id);

ALTER TABLE public.planning ENABLE ROW LEVEL SECURITY;

-- Lecture: soi-même ou parent
CREATE POLICY "Users can read own planning"
  ON public.planning FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can read children planning"
  ON public.planning FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid())
  );

-- Écriture: soi-même ou parent
CREATE POLICY "Users can insert own planning"
  ON public.planning FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Parents can insert children planning"
  ON public.planning FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid())
  );

CREATE POLICY "Users can update own planning"
  ON public.planning FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can update children planning"
  ON public.planning FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid())
  );
