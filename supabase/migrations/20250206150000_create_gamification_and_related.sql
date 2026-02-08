-- Tables gamification, curriculum, sessions, chat_messages, parent_notes

-- Gamification
CREATE TABLE IF NOT EXISTS public.gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'Explorateur',
  artifacts_collected JSONB NOT NULL DEFAULT '[]',
  temple_evolution_stage INTEGER NOT NULL DEFAULT 0,
  avatar_equipment JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gamification_student_id ON public.gamification(student_id);
ALTER TABLE public.gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gamification"
  ON public.gamification FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Parents can read children gamification"
  ON public.gamification FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid()));
CREATE POLICY "Users can insert own gamification"
  ON public.gamification FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can update own gamification"
  ON public.gamification FOR UPDATE USING (auth.uid() = student_id);

-- Curriculum
CREATE TABLE IF NOT EXISTS public.curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('official', 'manual')),
  status TEXT NOT NULL DEFAULT 'pas_vu' CHECK (status IN ('pas_vu', 'vu_en_classe', 'maitrise')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_student_id ON public.curriculum(student_id);
ALTER TABLE public.curriculum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own curriculum"
  ON public.curriculum FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Parents manage children curriculum"
  ON public.curriculum FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid()));

-- Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  subject TEXT,
  chapter TEXT,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  artifacts_found TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
  ON public.sessions FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Parents read children sessions"
  ON public.sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.parent_id = auth.uid()));

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_drawing BOOLEAN NOT NULL DEFAULT false,
  drawing_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage chat via sessions"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.student_id = auth.uid()
    )
  );

-- Parent notes
CREATE TABLE IF NOT EXISTS public.parent_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  objective TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_notes_student_id ON public.parent_notes(student_id);
ALTER TABLE public.parent_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage own notes"
  ON public.parent_notes FOR ALL USING (auth.uid() = parent_id);

-- Trigger: créer gamification à la création d'un profil enfant
CREATE OR REPLACE FUNCTION public.create_gamification_for_child()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'enfant' AND NEW.is_approved THEN
    INSERT INTO public.gamification (student_id, xp, rank)
    VALUES (NEW.id, 0, 'Explorateur')
    ON CONFLICT (student_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_gamification ON public.profiles;
CREATE TRIGGER trigger_create_gamification
  AFTER INSERT OR UPDATE OF is_approved ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_gamification_for_child();

-- Backfill: créer gamification pour les enfants déjà approuvés
INSERT INTO public.gamification (student_id, xp, rank)
SELECT id, 0, 'Explorateur' FROM public.profiles
WHERE role = 'enfant' AND is_approved = true
ON CONFLICT (student_id) DO NOTHING;
