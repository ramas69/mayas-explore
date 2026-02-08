-- Ajout du semestre pour un bulletin par semestre (S1, S2)
-- Garde les anciennes données : les lignes existantes reçoivent un semestre déduit de created_at

ALTER TABLE public.bulletin_analyses
  ADD COLUMN IF NOT EXISTS semester TEXT;

-- Remplir les lignes existantes : année scolaire + S1 ou S2 selon le mois
-- S1 = sept-déc, S2 = janv-juin
UPDATE public.bulletin_analyses
SET semester = CONCAT(
  CASE WHEN EXTRACT(MONTH FROM created_at) >= 9 THEN EXTRACT(YEAR FROM created_at)::TEXT
       ELSE (EXTRACT(YEAR FROM created_at) - 1)::TEXT END,
  '-S',
  CASE WHEN EXTRACT(MONTH FROM created_at) >= 9 OR EXTRACT(MONTH FROM created_at) <= 1 THEN '1' ELSE '2' END
)
WHERE semester IS NULL;

-- Pour les doublons (même student_id + semester), différencier avec un suffixe pour garder toutes les données
WITH dups AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY student_id, semester ORDER BY created_at) AS rn
  FROM public.bulletin_analyses
  WHERE semester IS NOT NULL
)
UPDATE public.bulletin_analyses b
SET semester = b.semester || CASE WHEN d.rn > 1 THEN '-' || d.rn::TEXT ELSE '' END
FROM dups d WHERE b.id = d.id AND d.rn > 1;

-- Valeur par défaut pour les futures insertions
ALTER TABLE public.bulletin_analyses
  ALTER COLUMN semester SET DEFAULT '2024-S1';

-- Rendre NOT NULL (les NULL restants reçoivent le défaut)
UPDATE public.bulletin_analyses SET semester = '2024-S1' WHERE semester IS NULL;
ALTER TABLE public.bulletin_analyses ALTER COLUMN semester SET NOT NULL;

-- Index pour les requêtes par semestre
CREATE INDEX IF NOT EXISTS idx_bulletin_analyses_semester ON public.bulletin_analyses(student_id, semester);
