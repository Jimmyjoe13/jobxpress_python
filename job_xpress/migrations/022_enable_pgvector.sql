-- Migration 022: Activation de pgvector et recherche de similarité
-- Cette version utilise la table applications_v2 déjà existante pour stocker les offres analysées.

-- 1. Activer l'extension vector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Ajouter les colonnes nécessaires à la table applications_v2 pour le Vector Search
-- On ajoute l'embedding sur l'application elle-même (basé sur le CV/Profil)
ALTER TABLE applications_v2 ADD COLUMN IF NOT EXISTS cv_embedding vector(1536);

-- 3. Créer une table dédiée aux offres d'emploi indexées (pour la recherche hybride)
CREATE TABLE IF NOT EXISTS job_offers_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  description text,
  location text,
  salary text,
  contract_type text,
  is_remote boolean DEFAULT false,
  match_score integer DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Activer RLS sur la nouvelle table
ALTER TABLE job_offers_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job offers" ON job_offers_v2
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job offers" ON job_offers_v2
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Créer un index HNSW pour la performance
CREATE INDEX IF NOT EXISTS job_offers_embedding_idx ON job_offers_v2 
USING hnsw (embedding vector_cosine_ops);

-- 6. Fonction SQL pour la recherche de similarité cosinus
CREATE OR REPLACE FUNCTION match_jobs (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  company text,
  description text,
  location text,
  contract_type text,
  url text,
  match_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.company,
    j.description,
    j.location,
    j.contract_type,
    j.url,
    (1 - (j.embedding <=> query_embedding))::float AS match_score
  FROM job_offers_v2 j
  WHERE (filter_user_id IS NULL OR j.user_id = filter_user_id)
    AND 1 - (j.embedding <=> query_embedding) > match_threshold
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
