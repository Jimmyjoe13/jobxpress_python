-- ===========================================
-- JobXpress - Migration 018: Security Hardening (Supabase)
-- Date: 2026-03-08
-- Description: Fixes search_path for SECURITY DEFINER functions and tightens RLS.
-- ===========================================

-- 1. FIX: SECURITY DEFINER Search Path (Anti HJ)
-- ----------------------------------------------

ALTER FUNCTION public.cleanup_old_stripe_events() SET search_path = public;
ALTER FUNCTION public.check_and_reset_credits(UUID, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION public.check_and_reset_jobyjoba_daily(UUID) SET search_path = public;
ALTER FUNCTION public.increment_jobyjoba_message(UUID) SET search_path = public;
ALTER FUNCTION public.debit_credit(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.check_and_use_search_quota(UUID) SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user_settings() SET search_path = public;

-- 2. FIX: Row Level Security (RLS) policies
-- ----------------------------------------------

-- Table: stripe_events (Add missing policy for service_role)
-- ----------------------------------------------
-- Note: Already enabled RLS in Mig 011, but no policies.
-- In Supabase, service_role bypasses RLS, but it's good practice to be explicit.
DROP POLICY IF EXISTS "Service role can perform all on stripe_events" ON public.stripe_events;
CREATE POLICY "Service role can perform all on stripe_events" ON public.stripe_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table: notifications (Fix overly permissive INSERT)
-- ----------------------------------------------
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Explicitly only allow service_role to insert system notifications
CREATE POLICY "Service role can insert notifications" ON public.notifications
    FOR INSERT TO service_role WITH CHECK (true);

-- Table: chat_sessions (Fix overly permissive INSERT)
-- ----------------------------------------------
DROP POLICY IF EXISTS "Service can insert chat sessions" ON public.chat_sessions;
CREATE POLICY "Service role can insert chat sessions" ON public.chat_sessions
    FOR INSERT TO service_role WITH CHECK (true);

-- 3. PERF: RLS Cache (auth.uid optimization)
-- ----------------------------------------------
-- Re-defining critical policies to use (select auth.uid()) for better perf

-- user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING ((select auth.uid()) = id);

-- applications_v2
DROP POLICY IF EXISTS "Users can view own applications_v2" ON public.applications_v2;
CREATE POLICY "Users can view own applications_v2" ON public.applications_v2
    FOR SELECT USING ((select auth.uid()) = user_id);

-- 4. PERF: Missing Indexes
-- ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_application_id ON public.notifications(application_id);

-- ===========================================
-- End of Migration 018
-- ===========================================
