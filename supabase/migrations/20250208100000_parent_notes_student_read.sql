-- L'élève peut lire les notes que son parent a écrites pour lui (student_id = lui)
-- Nécessaire pour faire fonctionner l'injecteur de priorité : le mentor IA reçoit ces priorités
CREATE POLICY "Students can read parent notes about them"
  ON public.parent_notes FOR SELECT
  USING (student_id = auth.uid());
