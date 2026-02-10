-- Autoriser les élèves à ajouter leurs propres bulletins (oubli dans la migration initiale)
CREATE POLICY "Students can insert own bulletins"
  ON public.bulletin_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);
