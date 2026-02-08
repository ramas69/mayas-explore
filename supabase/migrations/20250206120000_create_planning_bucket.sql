-- Migration: Bucket "planning" pour emploi du temps scolaire (séparé des bulletins)
-- Bulletins = notes. Planning = emploi du temps. 2 choses différentes.

INSERT INTO storage.buckets (id, name, public)
VALUES ('planning', 'planning', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Authenticated users can upload to planning"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'planning');

CREATE POLICY "Public read for planning"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'planning');
