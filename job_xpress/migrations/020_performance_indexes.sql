-- ===========================================
-- JobXpress - Migration 020: Performance Tuning (Indexes)
-- Date: 2026-03-08
-- Description: Adds missing indexes for foreign keys and status columns to speed up dashboard.
-- ===========================================

-- 1. Index sur les FK manquantes
-- ----------------------------------------------
-- Notifications liées aux applications
CREATE INDEX IF NOT EXISTS idx_notifications_application_id ON public.notifications(application_id);

-- 2. Index sur les colonnes de statut (Dashboard)
-- ----------------------------------------------
-- Pour filtrer rapidement les candidatures par statut
CREATE INDEX IF NOT EXISTS idx_applications_v2_status ON public.applications_v2(status);

-- Pour filtrer les candidatures par score (Top candidatures)
CREATE INDEX IF NOT EXISTS idx_applications_v2_match_score ON public.applications_v2(((final_choice->>'match_score')::int)) WHERE final_choice IS NOT NULL;

-- 3. Optimisation de l'historique
-- ----------------------------------------------
-- Pour le nettoyage et le tri chronologique
CREATE INDEX IF NOT EXISTS idx_search_history_user_id_created ON public.search_history(user_id, created_at DESC);

-- 4. Cleanup des index inutilisés (OptionNEL/Safe)
-- ----------------------------------------------
-- Selon les logs du dashboard Supabase: idx_notifications_unread_user_id si doublon avec idx_notifications_unread
-- (On préfère laisser par précaution si incertain, mais ici on ajoute les critiques).

-- ===========================================
-- End of Migration 020
-- ===========================================
