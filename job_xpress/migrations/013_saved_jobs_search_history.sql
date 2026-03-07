-- ===========================================
-- JobXpress - Migration 013: Saved Jobs & Search History
-- ===========================================
-- Tables pour la recherche directe depuis l'UI :
-- - saved_jobs : offres sauvegardées en favoris
-- - search_history : historique des recherches
-- - quota de recherches gratuites sur user_profiles
-- ===========================================

-- 1. Table saved_jobs (offres favorites)
-- ----------------------------------------------
CREATE TABLE public.saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_data JSONB NOT NULL,
    notes TEXT,
    source VARCHAR(50) DEFAULT 'search',
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.saved_jobs IS 'Offres d''emploi sauvegardées en favoris par l''utilisateur';
COMMENT ON COLUMN public.saved_jobs.job_data IS 'Snapshot de l''offre (title, company, url, location, description, score...)';
COMMENT ON COLUMN public.saved_jobs.notes IS 'Notes personnelles optionnelles';
COMMENT ON COLUMN public.saved_jobs.source IS 'Origine de la sauvegarde: search, chatbot, manual';

CREATE INDEX idx_saved_jobs_user ON public.saved_jobs(user_id, created_at DESC);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved_jobs"
    ON public.saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved_jobs"
    ON public.saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved_jobs"
    ON public.saved_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved_jobs"
    ON public.saved_jobs FOR DELETE USING (auth.uid() = user_id);


-- 2. Table search_history (historique de recherche)
-- ----------------------------------------------
CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query_params JSONB NOT NULL,
    results_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.search_history IS 'Historique des recherches d''offres effectuées par l''utilisateur';
COMMENT ON COLUMN public.search_history.query_params IS 'Paramètres de recherche: {job_title, location, contract_type, experience_level, filters}';
COMMENT ON COLUMN public.search_history.results_count IS 'Nombre de résultats retournés';

CREATE INDEX idx_search_history_user ON public.search_history(user_id, created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search_history"
    ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search_history"
    ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own search_history"
    ON public.search_history FOR DELETE USING (auth.uid() = user_id);


-- 3. Quota de recherches gratuites sur user_profiles
-- ----------------------------------------------
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS free_searches_used INTEGER DEFAULT 0;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS free_searches_reset_at TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month');

COMMENT ON COLUMN public.user_profiles.free_searches_used IS 'Nombre de recherches gratuites utilisées ce mois (max 5 pour FREE)';
COMMENT ON COLUMN public.user_profiles.free_searches_reset_at IS 'Date de remise à zéro du compteur de recherches gratuites (1er du mois suivant)';


-- 4. Fonction RPC : vérifier et consommer un quota de recherche
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_use_search_quota(
    p_user_id UUID
)
RETURNS TABLE(allowed BOOLEAN, free_remaining INTEGER, used_credit BOOLEAN) AS $$
DECLARE
    v_plan VARCHAR(20);
    v_searches_used INTEGER;
    v_reset_at TIMESTAMPTZ;
    v_max_free_searches INTEGER := 5;
BEGIN
    -- Récupérer les infos de l'utilisateur
    SELECT plan, free_searches_used, free_searches_reset_at
    INTO v_plan, v_searches_used, v_reset_at
    FROM public.user_profiles
    WHERE id = p_user_id;

    -- Si utilisateur non trouvé
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, FALSE;
        RETURN;
    END IF;

    -- Reset mensuel si nécessaire
    IF v_reset_at IS NOT NULL AND v_reset_at <= NOW() THEN
        UPDATE public.user_profiles
        SET free_searches_used = 0,
            free_searches_reset_at = date_trunc('month', now()) + interval '1 month',
            updated_at = NOW()
        WHERE id = p_user_id;
        v_searches_used := 0;
    END IF;

    -- Plans payants : illimité, pas de consommation de crédit pour la recherche
    IF v_plan IN ('STARTER', 'PRO') THEN
        RETURN QUERY SELECT TRUE, 999, FALSE;
        RETURN;
    END IF;

    -- Plan FREE : vérifier le quota
    IF v_searches_used < v_max_free_searches THEN
        -- Encore des recherches gratuites disponibles
        UPDATE public.user_profiles
        SET free_searches_used = free_searches_used + 1,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT TRUE, (v_max_free_searches - v_searches_used - 1), FALSE;
        RETURN;
    END IF;

    -- Plus de recherches gratuites : vérifier s'il a des crédits
    IF (SELECT credits FROM public.user_profiles WHERE id = p_user_id) > 0 THEN
        UPDATE public.user_profiles
        SET credits = credits - 1,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT TRUE, 0, TRUE;
        RETURN;
    END IF;

    -- Aucun quota ni crédit disponible
    RETURN QUERY SELECT FALSE, 0, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_and_use_search_quota TO authenticated;


-- ===========================================
-- Fin de la migration 013
-- ===========================================
-- 
-- RÉSUMÉ DES CHANGEMENTS:
-- - Table saved_jobs : favoris utilisateur avec RLS
-- - Table search_history : historique recherches avec RLS
-- - Colonnes free_searches_used / free_searches_reset_at sur user_profiles
-- - Fonction RPC check_and_use_search_quota : 5 recherches gratuites/mois,
--   puis 1 crédit par recherche, illimité pour STARTER/PRO
-- ===========================================
