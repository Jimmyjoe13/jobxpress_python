-- ===========================================
-- JobXpress - Migration 011: Stripe Events Idempotency
-- ===========================================
-- Protection contre le traitement multiple des webhooks Stripe.
-- Cette table enregistre chaque event_id pour éviter les doubles traitements.
-- ===========================================

-- 1. Table pour tracker les événements Stripe
-- ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    payload JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'skipped'))
);

-- Index pour cleanup périodique (garder 90 jours max)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at 
    ON public.stripe_events(processed_at);

-- Index pour recherche par user
CREATE INDEX IF NOT EXISTS idx_stripe_events_user_id 
    ON public.stripe_events(user_id);

-- 2. RLS - Seul le service admin peut accéder
-- ----------------------------------------------
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Pas de policy pour les utilisateurs normaux (table admin only)
-- L'accès se fait via admin_client dans le backend

-- 3. Fonction de cleanup automatique (optionnel)
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_stripe_events()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.stripe_events
    WHERE processed_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder l'exécution au service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_stripe_events TO service_role;

-- ===========================================
-- Fin de la migration
-- ===========================================
