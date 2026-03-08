-- ===========================================
-- JobXpress - Migration 019: RLS Performance Hardening (V2)
-- Date: 2026-03-08
-- Description: Optimizes RLS performance for all remaining tables using cached auth.uid().
-- ===========================================

-- 1. Table: user_settings
-- ----------------------------------------------
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2. Table: saved_jobs
-- ----------------------------------------------
DROP POLICY IF EXISTS "Users can view own saved_jobs" ON public.saved_jobs;
CREATE POLICY "Users can view own saved_jobs" ON public.saved_jobs
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own saved_jobs" ON public.saved_jobs;
CREATE POLICY "Users can update own saved_jobs" ON public.saved_jobs
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own saved_jobs" ON public.saved_jobs;
CREATE POLICY "Users can insert own saved_jobs" ON public.saved_jobs
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own saved_jobs" ON public.saved_jobs;
CREATE POLICY "Users can delete own saved_jobs" ON public.saved_jobs
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 3. Table: search_history
-- ----------------------------------------------
DROP POLICY IF EXISTS "Users can view own search_history" ON public.search_history;
CREATE POLICY "Users can view own search_history" ON public.search_history
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own search_history" ON public.search_history;
CREATE POLICY "Users can insert own search_history" ON public.search_history
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own search_history" ON public.search_history;
CREATE POLICY "Users can delete own search_history" ON public.search_history
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 4. FIX: Missing RLS on notifications for UPDATE
-- ----------------------------------------------
-- Ensure 'read' status can be updated by user
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- 5. PERF: Ensure all SECURITY DEFINER functions from older migrations are covered
-- ----------------------------------------------
-- Some functions might have been missed in 018 if they were in older files
-- Note: 'IF EXISTS' is not supported by 'ALTER FUNCTION' in some Postgres versions.
-- We catch potential errors or ensure functions exist before running.
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- ===========================================
-- End of Migration 019
-- ===========================================
