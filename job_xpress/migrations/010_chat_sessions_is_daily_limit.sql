-- ===========================================
-- JobXpress - Migration 010: Add is_daily_limit to chat_sessions
-- ===========================================
-- Cette colonne permet de différencier les limites selon le plan utilisateur :
-- - FREE/STARTER : limite par session (is_daily_limit = false)
-- - PRO : limite journalière renouvelée chaque jour (is_daily_limit = true)
-- ===========================================

-- 1. Ajout de la colonne is_daily_limit
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS is_daily_limit BOOLEAN DEFAULT false;

-- 2. Commentaire explicatif pour la documentation du schéma
COMMENT ON COLUMN public.chat_sessions.is_daily_limit IS 
  'True pour utilisateurs Pro (limite journalière), False pour FREE/STARTER (limite par session)';

-- 3. Notifier PostgREST pour rafraîchir le cache du schéma
NOTIFY pgrst, 'reload schema';
