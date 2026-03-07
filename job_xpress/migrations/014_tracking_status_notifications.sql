-- Migration: 014_tracking_status_notifications.sql
-- Description: Adds tracking status to applications_v2 and realtime to notifications

BEGIN;

-- 1. Create ENUM type for tracking status if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        CREATE TYPE public.tracking_status AS ENUM (
            'SAVED',                -- Offre sauvegardée (peut-être utilisée plus tard, ici on utilise saved_jobs mais c'est cohérent)
            'APPLIED',              -- Candidature envoyée
            'INTERVIEW_SCHEDULED',  -- Entretien planifié
            'INTERVIEWED',          -- Entretien passé
            'OFFER_RECEIVED',       -- Offre reçue
            'ACCEPTED',             -- Offre acceptée
            'REJECTED',             -- Refusé
            'WITHDRAWN'             -- Candidat s'est désisté
        );
    END IF;
END $$;

-- 2. Add columns to applications_v2
ALTER TABLE public.applications_v2 
    ADD COLUMN IF NOT EXISTS tracking_status public.tracking_status DEFAULT 'APPLIED';

ALTER TABLE public.applications_v2 
    ADD COLUMN IF NOT EXISTS tracking_notes JSONB DEFAULT '[]'::jsonb;
    -- Note: Format expected [{"date": "2026-03-07T12:00:00Z", "note": "text", "status": "APPLIED"}]

-- 3. Enable real-time for notifications table
-- First check if publication supabase_realtime exists, then add table to it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Verify if not already in publication
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND tablename = 'notifications'
              AND schemaname = 'public'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        END IF;
    END IF;
END $$;

COMMIT;

-- 4. Notification Policies (assuming notifications table exists as stated in audit)
-- We ensure the user can update their notifications (to set read_at, etc.)
-- NOTE: If not explicitly created, let's just make sure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'notifications'
          AND policyname = 'Users can update own notifications'
    ) THEN
        CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;
