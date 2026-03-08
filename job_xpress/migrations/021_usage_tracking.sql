-- ===========================================
-- JobXpress - Migration 021: Usage Tracking & Cost Control
-- Date: 2026-03-08
-- Description: Creates a table to track LLM usage and general feature consumption for cost monitoring.
-- ===========================================

-- 1. Table usage_logs
-- ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    feature text NOT NULL, -- 'llm_generation', 'search_api', 'cv_parsing'
    provider text,         -- 'openai', 'anthropic', 'rapidapi'
    model text,            -- 'gpt-3.5-turbo', 'gpt-4', etc.
    input_tokens int,
    output_tokens int,
    metadata jsonb,        -- Pour stocker des détails additionnels (ex: latency, error_code)
    created_at timestamptz DEFAULT now()
);

-- RLS for usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres logs d'utilisation (Optionnel, mais utile pour la transparence)
DROP POLICY IF EXISTS "Users can view own usage logs" ON public.usage_logs;
CREATE POLICY "Users can view own usage logs" ON public.usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Seul le service_role peut insérer dans cette table (via le backend)
DROP POLICY IF EXISTS "Service role can insert usage logs" ON public.usage_logs;
CREATE POLICY "Service role can insert usage logs" ON public.usage_logs
    FOR INSERT WITH CHECK (true); -- On restreindra au backend par le code (admin_client)

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_feature ON public.usage_logs(feature);

-- 2. Fonction pour statistiques rapides (facultatif mais pratique)
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_monthly_usage(p_user_id uuid)
RETURNS TABLE (
    feature text,
    total_input_tokens bigint,
    total_output_tokens bigint,
    call_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.feature,
        SUM(u.input_tokens)::bigint,
        SUM(u.output_tokens)::bigint,
        COUNT(*)::bigint
    FROM public.usage_logs u
    WHERE u.user_id = p_user_id
      AND u.created_at >= date_trunc('month', now())
    GROUP BY u.feature;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================================
-- End of Migration 021
-- ===========================================
