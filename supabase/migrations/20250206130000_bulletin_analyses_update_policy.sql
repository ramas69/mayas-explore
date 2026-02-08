-- Politiques UPDATE pour permettre la modification des notes (correction manuelle)

-- L'enfant peut modifier ses propres bulletins (corriger les notes)
CREATE POLICY "Students can update own bulletins"
  ON public.bulletin_analyses FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Le parent peut modifier les bulletins de ses enfants
CREATE POLICY "Parents can update children bulletins"
  ON public.bulletin_analyses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = bulletin_analyses.student_id
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = student_id
      AND profiles.parent_id = auth.uid()
    )
  );
