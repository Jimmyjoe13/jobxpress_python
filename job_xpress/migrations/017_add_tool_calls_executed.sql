-- Migration 017: Ajout de tool_calls_executed à chat_sessions
-- À exécuter dans Supabase SQL Editor

ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS tool_calls_executed JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.chat_sessions.tool_calls_executed IS 'Historique des appels d''outils effectués par l''agent lors de la dernière interaction';

-- Rafraîchir le cache PostgREST (Optionnel si auto-refresh activé)
NOTIFY pgrst, 'reload schema';
