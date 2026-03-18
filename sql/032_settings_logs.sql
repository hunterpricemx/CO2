-- 032_settings_logs.sql
-- Auditoria de cambios en ajustes del panel admin.

CREATE TABLE IF NOT EXISTS public.settings_logs (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz  DEFAULT now() NOT NULL,
  source         text         NOT NULL, -- 'site_settings' | 'payment_config'
  event          text         NOT NULL,
  message        text         NOT NULL,
  admin_id       uuid,
  admin_username text,
  setting_key    text,
  before_value   text,
  after_value    text,
  metadata       jsonb
);

CREATE INDEX IF NOT EXISTS settings_logs_created_at_idx ON public.settings_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS settings_logs_source_idx ON public.settings_logs (source);
CREATE INDEX IF NOT EXISTS settings_logs_key_idx ON public.settings_logs (setting_key);
CREATE INDEX IF NOT EXISTS settings_logs_admin_idx ON public.settings_logs (admin_username);

ALTER TABLE public.settings_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_logs_admin_read" ON public.settings_logs;
CREATE POLICY "settings_logs_admin_read"
  ON public.settings_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
