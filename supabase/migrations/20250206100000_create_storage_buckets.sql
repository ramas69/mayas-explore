-- Migration: Bucket "bulletins" pour bulletins de notes uniquement

INSERT INTO storage.buckets (id, name, public)
VALUES ('bulletins', 'bulletins', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politique: utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload to bulletins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bulletins');

-- Politique: lecture publique (bucket public)
CREATE POLICY "Public read for bulletins"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bulletins');
