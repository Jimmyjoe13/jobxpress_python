-- ===========================================
-- JobXpress - Extension du Profil Utilisateur
-- ===========================================
-- Migration 007 : Ajoute les champs profil complet
-- À exécuter dans Supabase SQL Editor
-- ===========================================

-- 1. Ajouter les colonnes de profil personnel
-- ----------------------------------------------
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Ajouter les colonnes de profil professionnel
-- ----------------------------------------------
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS job_title VARCHAR(200),
ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'France',
ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50) DEFAULT 'Non spécifié';

-- 3. Ajouter les préférences de candidature
-- ----------------------------------------------
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS preferred_contract_type VARCHAR(50) DEFAULT 'CDI',
ADD COLUMN IF NOT EXISTS preferred_work_type VARCHAR(50) DEFAULT 'Tous',
ADD COLUMN IF NOT EXISTS key_skills TEXT[] DEFAULT '{}';

-- 4. Ajouter les infos CV
-- ----------------------------------------------
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS cv_url TEXT,
ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMPTZ;

-- 5. Mettre à jour le trigger pour copier les données de auth.users
-- ----------------------------------------------
-- SECURITY DEFINER : s'exécute avec les privilèges du créateur (postgres)
-- SET search_path : évite les attaques par détournement de path
-- COALESCE : évite les erreurs NOT NULL si les métadonnées sont absentes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        credits, 
        plan,
        first_name,
        last_name
    )
    VALUES (
        NEW.id, 
        5, 
        'FREE',
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Recréer le trigger
-- ----------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Index pour les nouvelles colonnes
-- ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_job_title ON public.user_profiles(job_title);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON public.user_profiles(location);

-- 8. Sync les utilisateurs existants avec leurs métadonnées auth
-- ----------------------------------------------
-- Cette requête met à jour les profils existants avec les données de auth.users
UPDATE public.user_profiles up
SET 
    first_name = COALESCE(up.first_name, (
        SELECT raw_user_meta_data->>'first_name' 
        FROM auth.users 
        WHERE id = up.id
    )),
    last_name = COALESCE(up.last_name, (
        SELECT raw_user_meta_data->>'last_name' 
        FROM auth.users 
        WHERE id = up.id
    )),
    updated_at = NOW()
WHERE first_name IS NULL OR last_name IS NULL;

-- 9. Commentaires de documentation
-- ----------------------------------------------
COMMENT ON COLUMN public.user_profiles.first_name IS 'Prénom de l''utilisateur';
COMMENT ON COLUMN public.user_profiles.last_name IS 'Nom de l''utilisateur';
COMMENT ON COLUMN public.user_profiles.phone IS 'Numéro de téléphone (format FR)';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'URL de l''avatar stocké dans Supabase Storage';
COMMENT ON COLUMN public.user_profiles.job_title IS 'Poste recherché par défaut';
COMMENT ON COLUMN public.user_profiles.location IS 'Localisation souhaitée par défaut';
COMMENT ON COLUMN public.user_profiles.experience_level IS 'Niveau d''expérience (Junior, Confirmé, Sénior)';
COMMENT ON COLUMN public.user_profiles.preferred_contract_type IS 'Type de contrat préféré (CDI, CDD, etc.)';
COMMENT ON COLUMN public.user_profiles.preferred_work_type IS 'Mode de travail préféré (Remote, Hybride, Présentiel)';
COMMENT ON COLUMN public.user_profiles.key_skills IS 'Compétences clés (array de tags)';
COMMENT ON COLUMN public.user_profiles.cv_url IS 'URL du CV par défaut stocké dans Supabase Storage';
COMMENT ON COLUMN public.user_profiles.cv_uploaded_at IS 'Date du dernier upload de CV';

-- Fin de la migration
-- ===========================================
