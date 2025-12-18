-- ===========================================
-- JobXpress - Script de nettoyage des tables V1
-- ===========================================
-- ⚠️ ATTENTION: Ce script SUPPRIME définitivement les données
-- Ne l'exécute que si tu es sûr de ne plus en avoir besoin !
--
-- Les tables supprimées:
--   - applications (ancienne table liée à candidates)
--   - candidates (remplacée par auth.users + user_profiles)
-- ===========================================

-- Vérifier d'abord s'il y a des données
SELECT 
    'candidates' as table_name, 
    COUNT(*) as row_count 
FROM public.candidates
UNION ALL
SELECT 
    'applications' as table_name, 
    COUNT(*) as row_count 
FROM public.applications;

-- Si tu es sûr, décommente les lignes suivantes et exécute:

-- DROP TABLE IF EXISTS public.applications CASCADE;
-- DROP TABLE IF EXISTS public.candidates CASCADE;

-- Optionnel: Supprimer aussi les anciens types enum s'ils existent
-- DROP TYPE IF EXISTS old_application_status CASCADE;
