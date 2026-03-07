-- ===========================================
-- JobXpress - Migration 015: Chat Global Refactor
-- ===========================================

-- 1. Rendre application_id nullable pour le chat global
ALTER TABLE public.chat_sessions
    ALTER COLUMN application_id DROP NOT NULL;

-- 2. Ajouter un type de session
ALTER TABLE public.chat_sessions
    ADD COLUMN session_type VARCHAR DEFAULT 'application'
    CHECK (session_type IN ('application', 'global', 'search'));

-- 3. Ajouter un contexte libre (pour les sessions non liées à une app)
ALTER TABLE public.chat_sessions
    ADD COLUMN context JSONB DEFAULT '{}'::jsonb;

-- 4. Index pour récupérer la session globale active
CREATE INDEX idx_chat_sessions_global
    ON public.chat_sessions(user_id, session_type)
    WHERE status = 'active';
