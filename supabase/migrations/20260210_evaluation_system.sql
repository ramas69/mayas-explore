-- Migration: Système d'évaluation intelligent et XP adaptatifs
-- Date: 2026-02-10

-- Activer l'extension UUID si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: student_answers
-- Stocke toutes les réponses des élèves avec évaluation IA
-- ============================================
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  
  -- Question posée par l'IA
  question TEXT NOT NULL,
  question_topic TEXT, -- Ex: "Théorème de Pythagore", "Accord du participe passé"
  question_difficulty TEXT CHECK (question_difficulty IN ('easy', 'medium', 'hard')),
  
  -- Réponse de l'élève
  student_answer TEXT NOT NULL,
  
  -- Évaluation par l'IA
  evaluation TEXT NOT NULL CHECK (evaluation IN ('correct', 'partial', 'incorrect')),
  evaluation_details JSONB DEFAULT '{}', -- { reasoning: "...", mistakes: [...], strengths: [...] }
  
  -- Récompense
  xp_awarded INTEGER DEFAULT 0,
  
  -- Suivi
  retry_count INTEGER DEFAULT 0, -- Nombre de fois que la question a été reposée
  mastered BOOLEAN DEFAULT FALSE, -- TRUE si l'élève a finalement réussi
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_student_answers_student ON student_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_session ON student_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_topic ON student_answers(question_topic);
CREATE INDEX IF NOT EXISTS idx_student_answers_evaluation ON student_answers(evaluation);
CREATE INDEX IF NOT EXISTS idx_student_answers_mastered ON student_answers(mastered);
CREATE INDEX IF NOT EXISTS idx_student_answers_created ON student_answers(created_at DESC);

-- ============================================
-- Table: retry_queue
-- File d'attente pour reposer les questions où l'élève a fait des erreurs
-- ============================================
CREATE TABLE IF NOT EXISTS retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Question à reposer
  question_topic TEXT NOT NULL,
  original_question TEXT,
  original_answer_id UUID REFERENCES student_answers(id) ON DELETE CASCADE,
  
  -- Planification
  retry_at TIMESTAMP NOT NULL,
  priority INTEGER DEFAULT 1, -- Plus d'erreurs = priorité plus haute
  
  -- Statut
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_queue_student ON retry_queue(student_id);
CREATE INDEX IF NOT EXISTS idx_retry_queue_retry_at ON retry_queue(retry_at);
CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON retry_queue(status);
CREATE INDEX IF NOT EXISTS idx_retry_queue_priority ON retry_queue(priority DESC);

-- ============================================
-- Table: student_streaks
-- Suivi des séries de bonnes réponses
-- ============================================
CREATE TABLE IF NOT EXISTS student_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Série actuelle
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  
  -- Dernière activité
  last_answer_date TIMESTAMP,
  last_answer_correct BOOLEAN,
  
  -- Statistiques globales
  total_questions_answered INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_streaks_student ON student_streaks(student_id);

-- ============================================
-- Table: topic_mastery
-- Suivi de la maîtrise par sujet/notion
-- ============================================
CREATE TABLE IF NOT EXISTS topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Sujet
  topic TEXT NOT NULL,
  subject TEXT, -- Matière (Maths, Français, etc.)
  
  -- Statistiques
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00, -- Pourcentage de réussite
  
  -- Statut
  mastered BOOLEAN DEFAULT FALSE,
  mastered_at TIMESTAMP,
  
  -- Dernière activité
  last_attempt_at TIMESTAMP,
  last_attempt_correct BOOLEAN,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(student_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_student ON topic_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_subject ON topic_mastery(subject);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_mastered ON topic_mastery(mastered);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_success_rate ON topic_mastery(success_rate DESC);

-- ============================================
-- Fonction: Mettre à jour le taux de réussite
-- ============================================
CREATE OR REPLACE FUNCTION update_topic_mastery()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer ou mettre à jour topic_mastery
  INSERT INTO topic_mastery (
    student_id,
    topic,
    total_attempts,
    correct_attempts,
    success_rate,
    mastered,
    last_attempt_at,
    last_attempt_correct,
    updated_at
  )
  VALUES (
    NEW.student_id,
    NEW.question_topic,
    1,
    CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END,
    CASE WHEN NEW.evaluation = 'correct' THEN 100.00 ELSE 0.00 END,
    NEW.evaluation = 'correct',
    NEW.created_at,
    NEW.evaluation = 'correct',
    NOW()
  )
  ON CONFLICT (student_id, topic)
  DO UPDATE SET
    total_attempts = topic_mastery.total_attempts + 1,
    correct_attempts = topic_mastery.correct_attempts + CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END,
    success_rate = ROUND(
      ((topic_mastery.correct_attempts + CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END)::DECIMAL / 
       (topic_mastery.total_attempts + 1)::DECIMAL) * 100, 
      2
    ),
    mastered = (
      ((topic_mastery.correct_attempts + CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END)::DECIMAL / 
       (topic_mastery.total_attempts + 1)::DECIMAL) >= 0.8 AND
      (topic_mastery.total_attempts + 1) >= 3
    ),
    mastered_at = CASE 
      WHEN (
        ((topic_mastery.correct_attempts + CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END)::DECIMAL / 
         (topic_mastery.total_attempts + 1)::DECIMAL) >= 0.8 AND
        (topic_mastery.total_attempts + 1) >= 3 AND
        topic_mastery.mastered = FALSE
      ) THEN NOW()
      ELSE topic_mastery.mastered_at
    END,
    last_attempt_at = NEW.created_at,
    last_attempt_correct = NEW.evaluation = 'correct',
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement topic_mastery
DROP TRIGGER IF EXISTS trigger_update_topic_mastery ON student_answers;
CREATE TRIGGER trigger_update_topic_mastery
  AFTER INSERT ON student_answers
  FOR EACH ROW
  WHEN (NEW.question_topic IS NOT NULL)
  EXECUTE FUNCTION update_topic_mastery();

-- ============================================
-- Fonction: Mettre à jour les séries (streaks)
-- ============================================
CREATE OR REPLACE FUNCTION update_student_streak()
RETURNS TRIGGER AS $$
DECLARE
  current_streak_val INTEGER;
BEGIN
  -- Insérer ou mettre à jour student_streaks
  INSERT INTO student_streaks (
    student_id,
    current_streak,
    best_streak,
    last_answer_date,
    last_answer_correct,
    total_questions_answered,
    total_correct_answers,
    updated_at
  )
  VALUES (
    NEW.student_id,
    CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END,
    CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END,
    NEW.created_at,
    NEW.evaluation = 'correct',
    1,
    CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (student_id)
  DO UPDATE SET
    current_streak = CASE 
      WHEN NEW.evaluation = 'correct' THEN student_streaks.current_streak + 1
      ELSE 0
    END,
    best_streak = CASE
      WHEN NEW.evaluation = 'correct' AND (student_streaks.current_streak + 1) > student_streaks.best_streak 
        THEN student_streaks.current_streak + 1
      ELSE student_streaks.best_streak
    END,
    last_answer_date = NEW.created_at,
    last_answer_correct = NEW.evaluation = 'correct',
    total_questions_answered = student_streaks.total_questions_answered + 1,
    total_correct_answers = student_streaks.total_correct_answers + CASE WHEN NEW.evaluation = 'correct' THEN 1 ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement student_streaks
DROP TRIGGER IF EXISTS trigger_update_student_streak ON student_answers;
CREATE TRIGGER trigger_update_student_streak
  AFTER INSERT ON student_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_student_streak();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- student_answers
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own answers"
  ON student_answers FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own answers"
  ON student_answers FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- retry_queue
ALTER TABLE retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own retry queue"
  ON retry_queue FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can manage retry queue"
  ON retry_queue FOR ALL
  USING (true);

-- student_streaks
ALTER TABLE student_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own streaks"
  ON student_streaks FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can manage streaks"
  ON student_streaks FOR ALL
  USING (true);

-- topic_mastery
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own topic mastery"
  ON topic_mastery FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can manage topic mastery"
  ON topic_mastery FOR ALL
  USING (true);

-- ============================================
-- Vues utiles
-- ============================================

-- Vue: Statistiques de réussite par matière
CREATE OR REPLACE VIEW student_subject_stats AS
SELECT 
  student_id,
  subject,
  COUNT(*) as total_topics,
  SUM(CASE WHEN mastered THEN 1 ELSE 0 END) as mastered_topics,
  ROUND(AVG(success_rate), 2) as avg_success_rate,
  ROUND((SUM(CASE WHEN mastered THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2) as mastery_percentage
FROM topic_mastery
WHERE subject IS NOT NULL
GROUP BY student_id, subject;

-- Vue: Points faibles à revoir
CREATE OR REPLACE VIEW student_weak_points AS
SELECT 
  tm.student_id,
  tm.topic,
  tm.subject,
  tm.success_rate,
  tm.total_attempts,
  tm.last_attempt_at,
  COUNT(rq.id) as pending_retries
FROM topic_mastery tm
LEFT JOIN retry_queue rq ON rq.student_id = tm.student_id 
  AND rq.question_topic = tm.topic 
  AND rq.status = 'pending'
WHERE tm.success_rate < 80 
  AND tm.total_attempts >= 2
GROUP BY tm.student_id, tm.topic, tm.subject, tm.success_rate, tm.total_attempts, tm.last_attempt_at
ORDER BY tm.success_rate ASC, tm.total_attempts DESC;

-- ============================================
-- Commentaires
-- ============================================
COMMENT ON TABLE student_answers IS 'Stocke toutes les réponses des élèves avec évaluation IA';
COMMENT ON TABLE retry_queue IS 'File d''attente pour reposer les questions où l''élève a fait des erreurs';
COMMENT ON TABLE student_streaks IS 'Suivi des séries de bonnes réponses';
COMMENT ON TABLE topic_mastery IS 'Suivi de la maîtrise par sujet/notion';
COMMENT ON VIEW student_subject_stats IS 'Statistiques de réussite par matière';
COMMENT ON VIEW student_weak_points IS 'Points faibles à revoir (taux de réussite < 80%)';
