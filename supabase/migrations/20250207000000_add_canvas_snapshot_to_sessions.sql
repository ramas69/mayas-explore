-- Champ pour persister le Grimoire (canvas Excalidraw) par session
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS canvas_snapshot JSONB DEFAULT '{"elements":[],"appState":{}}';
