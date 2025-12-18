-- ===========================================
-- JobXpress - Migration: Ajout cv_text pour JobyJoba
-- ===========================================
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne cv_text pour stocker le texte OCR du CV
-- Cela permet à JobyJoba d'avoir accès au contexte du CV

ALTER TABLE public.applications_v2 
ADD COLUMN IF NOT EXISTS cv_text TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN public.applications_v2.cv_text IS 'Texte extrait du CV via OCR Mistral, utilisé par JobyJoba pour le contexte';

-- Fin de la migration
-- ===========================================
