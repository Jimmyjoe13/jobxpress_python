-- ===========================================
-- Migration 012 - Nettoyage et Optimisation Base de Données
-- Date: 2026-01-23
-- Auteur: JobXpress Team
-- Description: Suppression des tables obsolètes et optimisation des index
-- ===========================================
-- 
-- ACTIONS EFFECTUÉES:
-- 1. Suppression de 4 tables obsolètes (Telegram bot + Leads)
-- 2. Nettoyage de 3 colonnes redondantes dans user_profiles
-- 3. Ajout de toutes les Foreign Keys manquantes vers auth.users
-- 4. Optimisation des index (suppression des inutiles + ajout composite)
--
-- ⚠️ ATTENTION: Ce script contient des DROP TABLE
-- Ne l'exécute que si tu es sûr de ne plus avoir besoin des données
-- ===========================================

-- ========================================
-- PARTIE 1 : Suppression des tables obsolètes
-- ========================================

-- Tables liées au bot Telegram (non utilisées par JobXpress)
DROP TABLE IF EXISTS public.message_history CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.bot_error_logs CASCADE;

-- Table de scraping de leads (hors scope JobXpress)
DROP TABLE IF EXISTS public.leads CASCADE;

-- ========================================
-- PARTIE 2 : Nettoyage des colonnes redondantes
-- ========================================

-- Colonnes jobyjoba_* redondantes avec la table chat_sessions
ALTER TABLE public.user_profiles 
DROP COLUMN IF EXISTS jobyjoba_daily_messages,
DROP COLUMN IF EXISTS jobyjoba_last_message_date,
DROP COLUMN IF EXISTS jobyjoba_custom_context;

-- ========================================
-- PARTIE 3 : Ajout des Foreign Keys manquantes
-- ========================================

-- applications_v2.user_id → auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'applications_v2_user_id_fkey'
    ) THEN
        ALTER TABLE public.applications_v2
        ADD CONSTRAINT applications_v2_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK applications_v2.user_id ajoutée';
    END IF;
END $$;

-- chat_sessions.user_id → auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chat_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE public.chat_sessions
        ADD CONSTRAINT chat_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK chat_sessions.user_id ajoutée';
    END IF;
END $$;

-- notifications.user_id → auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK notifications.user_id ajoutée';
    END IF;
END $$;

-- stripe_events.user_id → auth.users(id)
-- Note: ON DELETE SET NULL car on veut garder l'historique des paiements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stripe_events_user_id_fkey'
    ) THEN
        ALTER TABLE public.stripe_events
        ADD CONSTRAINT stripe_events_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ FK stripe_events.user_id ajoutée';
    END IF;
END $$;

-- user_profiles.id → auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_id_fkey'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK user_profiles.id ajoutée';
    END IF;
END $$;

-- user_settings.user_id → auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_settings_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_settings
        ADD CONSTRAINT user_settings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK user_settings.user_id ajoutée';
    END IF;
END $$;

-- ========================================
-- PARTIE 4 : Optimisation des index
-- ========================================

-- Suppression des index inutiles (jamais utilisés dans les requêtes)
DROP INDEX IF EXISTS public.idx_user_profiles_job_title;
DROP INDEX IF EXISTS public.idx_user_profiles_location;
DROP INDEX IF EXISTS public.idx_user_profiles_plan_starter; -- Doublon de idx_user_profiles_plan

-- Ajout d'un index composite pour les requêtes fréquentes
-- Usage: "Récupérer les dernières candidatures d'un utilisateur"
CREATE INDEX IF NOT EXISTS idx_applications_user_created 
ON public.applications_v2 (user_id, created_at DESC);

-- ========================================
-- PARTIE 5 : Vérification finale
-- ========================================

-- Afficher un résumé des tables restantes
DO $$ 
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    
    RAISE NOTICE '=================================';
    RAISE NOTICE '✅ MIGRATION 012 TERMINÉE';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Tables dans public: %', table_count;
    RAISE NOTICE 'Tables attendues: 6 (applications_v2, chat_sessions, notifications, stripe_events, user_profiles, user_settings)';
END $$;

-- Lister toutes les Foreign Keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ===========================================
-- FIN DE LA MIGRATION
-- ===========================================
