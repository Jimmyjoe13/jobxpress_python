-- ===========================================
-- JobXpress - Migration 005: Notifications & Chat Sessions
-- ===========================================
-- Tables pour le système de notifications et les sessions de chat JobyJoba
-- ===========================================

-- 1. Table des notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- 'workflow_complete', 'offer_jobyjoba', 'system'
    title VARCHAR(200) NOT NULL,
    message TEXT,
    application_id UUID REFERENCES public.applications_v2(id) ON DELETE SET NULL,
    action_url VARCHAR(500),     -- URL vers laquelle rediriger
    action_label VARCHAR(100),   -- Texte du bouton d'action
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

-- 2. Table des sessions de chat JobyJoba
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.applications_v2(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,  -- Array de {role, content, timestamp}
    message_count INTEGER DEFAULT 0,
    max_messages INTEGER DEFAULT 10,
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'completed', 'expired'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_app_id ON public.chat_sessions(application_id);

-- 3. RLS Policies pour notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- 4. RLS Policies pour chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert chat sessions" ON public.chat_sessions;
CREATE POLICY "Service can insert chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (true);

-- 5. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
