-- Migration 016: Ajout des colonnes manquantes pour le dashboard
-- À exécuter dans Supabase SQL Editor

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS current_cv_id UUID,
ADD COLUMN IF NOT EXISTS free_searches_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_searches_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month';

-- Index pour la recherche rapide
CREATE INDEX IF NOT EXISTS idx_user_profiles_free_searches ON public.user_profiles(free_searches_used);
