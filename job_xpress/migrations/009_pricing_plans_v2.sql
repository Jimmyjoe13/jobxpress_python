-- ===========================================
-- JobXpress - Migration 009: Pricing Plans V2
-- ===========================================
-- Ajoute le plan STARTER et prépare les fonctionnalités Pro JobyJoba
-- 
-- À exécuter dans Supabase SQL Editor
-- ===========================================

-- 1. Étendre la contrainte de plan pour inclure STARTER
-- ----------------------------------------------
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_plan_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_plan_check 
CHECK (plan IN ('FREE', 'STARTER', 'PRO'));

-- 2. Colonnes pour les fonctionnalités JobyJoba Pro
-- ----------------------------------------------
-- Limite journalière de messages pour le plan Pro
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS jobyjoba_daily_messages INTEGER DEFAULT 0;

-- Date du dernier message JobyJoba (pour reset journalier Pro)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS jobyjoba_last_message_date DATE;

-- Contexte personnalisé pour JobyJoba (Pro uniquement)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS jobyjoba_custom_context TEXT;

-- 3. Mise à jour de la fonction RPC check_and_reset_credits
-- ----------------------------------------------
-- Gère maintenant les 3 plans: FREE, STARTER, PRO
CREATE OR REPLACE FUNCTION public.check_and_reset_credits(
    p_user_id UUID,
    p_free_credits INTEGER DEFAULT 5,
    p_reset_days INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
DECLARE
    v_credits INTEGER;
    v_last_reset TIMESTAMPTZ;
    v_plan VARCHAR(20);
    v_plan_credits INTEGER;
    v_plan_reset_days INTEGER;
BEGIN
    -- Récupérer les infos actuelles
    SELECT credits, last_credit_reset, plan
    INTO v_credits, v_last_reset, v_plan
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    -- Si utilisateur non trouvé, créer le profil
    IF NOT FOUND THEN
        INSERT INTO public.user_profiles (id, credits, plan)
        VALUES (p_user_id, p_free_credits, 'FREE')
        RETURNING credits INTO v_credits;
        RETURN v_credits;
    END IF;
    
    -- Définir crédits et période de reset selon le plan
    CASE v_plan
        WHEN 'STARTER' THEN 
            v_plan_credits := 100;
            v_plan_reset_days := 30;
        WHEN 'PRO' THEN 
            v_plan_credits := 300;
            v_plan_reset_days := 30;
        ELSE 
            -- FREE par défaut
            v_plan_credits := p_free_credits;
            v_plan_reset_days := p_reset_days;
    END CASE;
    
    -- Vérifier si reset nécessaire
    IF v_last_reset IS NOT NULL AND 
       v_last_reset < NOW() - (v_plan_reset_days || ' days')::INTERVAL THEN
        
        UPDATE public.user_profiles
        SET credits = v_plan_credits,
            last_credit_reset = NOW(),
            updated_at = NOW()
        WHERE id = p_user_id
        RETURNING credits INTO v_credits;
    END IF;
    
    RETURN v_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonction RPC pour reset journalier JobyJoba (Pro)
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_reset_jobyjoba_daily(
    p_user_id UUID
)
RETURNS TABLE(can_send BOOLEAN, remaining_messages INTEGER) AS $$
DECLARE
    v_plan VARCHAR(20);
    v_daily_messages INTEGER;
    v_last_date DATE;
    v_today DATE := CURRENT_DATE;
    v_max_daily INTEGER := 20;  -- Limite Pro
BEGIN
    -- Récupérer les infos de l'utilisateur
    SELECT plan, jobyjoba_daily_messages, jobyjoba_last_message_date
    INTO v_plan, v_daily_messages, v_last_date
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    -- Si pas trouvé ou pas Pro, pas de limite journalière
    IF NOT FOUND OR v_plan != 'PRO' THEN
        RETURN QUERY SELECT TRUE, 999;
        RETURN;
    END IF;
    
    -- Reset si nouveau jour
    IF v_last_date IS NULL OR v_last_date < v_today THEN
        UPDATE public.user_profiles
        SET jobyjoba_daily_messages = 0,
            jobyjoba_last_message_date = v_today,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        v_daily_messages := 0;
    END IF;
    
    -- Retourner si peut envoyer et messages restants
    RETURN QUERY SELECT 
        (v_daily_messages < v_max_daily),
        (v_max_daily - v_daily_messages);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction RPC pour incrémenter compteur JobyJoba
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_jobyjoba_message(
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    UPDATE public.user_profiles
    SET jobyjoba_daily_messages = COALESCE(jobyjoba_daily_messages, 0) + 1,
        jobyjoba_last_message_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING jobyjoba_daily_messages INTO v_new_count;
    
    RETURN COALESCE(v_new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Accorder les permissions RPC
-- ----------------------------------------------
GRANT EXECUTE ON FUNCTION public.check_and_reset_jobyjoba_daily TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_jobyjoba_message TO authenticated;

-- 7. Index pour les requêtes par plan
-- ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan_starter 
ON public.user_profiles(plan) WHERE plan = 'STARTER';

-- ===========================================
-- Fin de la migration 009
-- ===========================================
-- 
-- RÉSUMÉ DES CHANGEMENTS:
-- - Contrainte plan étendue: FREE, STARTER, PRO
-- - Nouvelles colonnes: jobyjoba_daily_messages, jobyjoba_last_message_date, jobyjoba_custom_context
-- - Fonction check_and_reset_credits mise à jour pour 3 plans
-- - Nouvelles fonctions pour gestion limite journalière JobyJoba Pro
-- ===========================================
