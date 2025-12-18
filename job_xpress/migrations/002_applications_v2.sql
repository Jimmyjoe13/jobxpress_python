-- ===========================================
-- JobXpress V2 - Migration Base de Données
-- ===========================================
-- À exécuter dans Supabase SQL Editor
-- 
-- ATTENTION: Ce script modifie le schéma auth.users.
-- Les colonnes credits/plan sont stockées dans une table séparée
-- pour éviter de modifier directement auth.users.
-- ===========================================

-- 1. Table des profils utilisateurs avec crédits
-- ----------------------------------------------
-- On utilise une table séparée plutôt que de modifier auth.users
-- car c'est une meilleure pratique avec Supabase

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Système de crédits
    credits INTEGER NOT NULL DEFAULT 5,
    plan VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO')),
    last_credit_reset TIMESTAMPTZ DEFAULT NOW(),
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON public.user_profiles(plan);

-- RLS sur user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger pour auto-créer le profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, credits, plan)
    VALUES (NEW.id, 5, 'FREE');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Enum pour les statuts de candidature
-- ----------------------------------------------
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM (
        'DRAFT',
        'SEARCHING',
        'WAITING_SELECTION',
        'ANALYZING',
        'GENERATING_DOCS',
        'COMPLETED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 3. Table principale des candidatures V2
-- ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- State Machine
    status application_status NOT NULL DEFAULT 'DRAFT',
    
    -- Données de recherche
    job_title VARCHAR(200) NOT NULL,
    location VARCHAR(100) DEFAULT 'France',
    contract_type VARCHAR(50),
    work_type VARCHAR(50),
    experience_level VARCHAR(50),
    cv_url TEXT,
    
    -- Filtres avancés (V2)
    job_filters JSONB DEFAULT '{}',
    
    -- Résultats
    raw_jobs JSONB,           -- Tous les résultats bruts de la recherche
    selected_jobs JSONB,       -- Les 1-5 offres choisies par l'utilisateur
    final_choice JSONB,        -- L'offre analysée et retenue
    
    -- Livrables
    cover_letter_html TEXT,    -- Lettre de motivation générée
    pdf_url TEXT,              -- URL du PDF stocké
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_applications_v2_user_id ON public.applications_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_v2_status ON public.applications_v2(status);
CREATE INDEX IF NOT EXISTS idx_applications_v2_created_at ON public.applications_v2(created_at DESC);

-- RLS
ALTER TABLE public.applications_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications_v2" ON public.applications_v2
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications_v2" ON public.applications_v2
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications_v2" ON public.applications_v2
    FOR UPDATE USING (auth.uid() = user_id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_applications_v2_updated_at ON public.applications_v2;

CREATE TRIGGER update_applications_v2_updated_at
    BEFORE UPDATE ON public.applications_v2
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 4. Fonction RPC pour débiter les crédits (atomique)
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.debit_credit(
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    v_new_credits INTEGER;
BEGIN
    UPDATE public.user_profiles
    SET credits = credits - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
      AND credits >= p_amount  -- Protection contre solde négatif
    RETURNING credits INTO v_new_credits;
    
    IF v_new_credits IS NULL THEN
        RAISE EXCEPTION 'Crédits insuffisants ou utilisateur non trouvé';
    END IF;
    
    RETURN v_new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Fonction RPC pour reset lazy des crédits
-- ----------------------------------------------
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
    
    -- Vérifier si reset nécessaire (plan FREE uniquement)
    IF v_plan = 'FREE' AND 
       v_last_reset IS NOT NULL AND 
       v_last_reset < NOW() - (p_reset_days || ' days')::INTERVAL THEN
        
        UPDATE public.user_profiles
        SET credits = p_free_credits,
            last_credit_reset = NOW(),
            updated_at = NOW()
        WHERE id = p_user_id
        RETURNING credits INTO v_credits;
    END IF;
    
    RETURN v_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Accorder les permissions RPC
-- ----------------------------------------------
GRANT EXECUTE ON FUNCTION public.debit_credit TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_reset_credits TO authenticated;

-- Fin de la migration
-- ===========================================
