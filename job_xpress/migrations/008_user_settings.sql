-- ===========================================
-- JobXpress - Paramètres Utilisateur
-- ===========================================
-- Migration 008 : Table des paramètres utilisateur
-- À exécuter dans Supabase SQL Editor
-- ===========================================

-- 1. Créer la table user_settings
-- ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notifications
    email_candidatures BOOLEAN DEFAULT TRUE NOT NULL,
    email_new_offers BOOLEAN DEFAULT TRUE NOT NULL,
    email_newsletter BOOLEAN DEFAULT FALSE NOT NULL,
    push_notifications BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Préférences
    language VARCHAR(10) DEFAULT 'fr' NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Europe/Paris' NOT NULL,
    dark_mode BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Contrainte d'unicité
    CONSTRAINT user_settings_user_id_unique UNIQUE(user_id)
);

-- 2. Index pour les performances
-- ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- 3. Activer RLS (Row Level Security)
-- ----------------------------------------------
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
-- ----------------------------------------------
-- Lecture : l'utilisateur ne peut voir que ses propres paramètres
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
    ON public.user_settings 
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insertion : l'utilisateur peut créer ses paramètres
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
    ON public.user_settings 
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Mise à jour : l'utilisateur ne peut modifier que ses propres paramètres
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
    ON public.user_settings 
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 5. Trigger pour updated_at automatique
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_user_settings ON public.user_settings;
CREATE TRIGGER set_updated_at_user_settings
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Auto-création des paramètres pour les nouveaux utilisateurs
-- ----------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user_settings();

-- 7. Créer les paramètres pour les utilisateurs existants
-- ----------------------------------------------
INSERT INTO public.user_settings (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- 8. Commentaires de documentation
-- ----------------------------------------------
COMMENT ON TABLE public.user_settings IS 'Paramètres utilisateur (notifications et préférences)';
COMMENT ON COLUMN public.user_settings.email_candidatures IS 'Recevoir un email à chaque candidature envoyée';
COMMENT ON COLUMN public.user_settings.email_new_offers IS 'Recevoir des alertes pour les nouvelles offres correspondant au profil';
COMMENT ON COLUMN public.user_settings.email_newsletter IS 'Recevoir la newsletter hebdomadaire avec conseils emploi';
COMMENT ON COLUMN public.user_settings.push_notifications IS 'Activer les notifications push dans le navigateur';
COMMENT ON COLUMN public.user_settings.language IS 'Langue de l''interface (fr, en)';
COMMENT ON COLUMN public.user_settings.timezone IS 'Fuseau horaire pour l''affichage des dates';
COMMENT ON COLUMN public.user_settings.dark_mode IS 'Activer le thème sombre';

-- Fin de la migration
-- ===========================================
