-- ===========================================
-- JobXpress - Migration 004: Ajout champs candidat
-- ===========================================
-- Ajoute email et infos candidat à applications_v2
-- pour permettre l'envoi d'email après l'analyse IA
-- ===========================================

-- Ajouter la colonne email
ALTER TABLE public.applications_v2 
ADD COLUMN IF NOT EXISTS candidate_email VARCHAR(255);

-- Ajouter les infos du candidat (optionnel, pour autonomie)
ALTER TABLE public.applications_v2 
ADD COLUMN IF NOT EXISTS candidate_first_name VARCHAR(100);

ALTER TABLE public.applications_v2 
ADD COLUMN IF NOT EXISTS candidate_last_name VARCHAR(100);

ALTER TABLE public.applications_v2 
ADD COLUMN IF NOT EXISTS candidate_phone VARCHAR(50);

-- Index pour recherche par email
CREATE INDEX IF NOT EXISTS idx_applications_v2_email 
ON public.applications_v2(candidate_email);
