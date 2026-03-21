-- 034_account_action_logs.sql
-- Audit log for admin actions on game accounts.

CREATE TABLE IF NOT EXISTS public.account_action_logs (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz  DEFAULT now() NOT NULL,
  admin_id       uuid,
  admin_username text,
  action         text         NOT NULL, -- 'recovery_sent' | 'email_changed'
  username       text         NOT NULL,
  version        smallint     NOT NULL,
  before_value   text,
  after_value    text,
  metadata       jsonb
);

CREATE INDEX IF NOT EXISTS account_action_logs_created_at_idx ON public.account_action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS account_action_logs_username_idx   ON public.account_action_logs (username);
CREATE INDEX IF NOT EXISTS account_action_logs_action_idx     ON public.account_action_logs (action);
CREATE INDEX IF NOT EXISTS account_action_logs_admin_idx      ON public.account_action_logs (admin_username);

ALTER TABLE public.account_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_action_logs_admin_read" ON public.account_action_logs;
CREATE POLICY "account_action_logs_admin_read"
  ON public.account_action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "account_action_logs_admin_insert" ON public.account_action_logs;
CREATE POLICY "account_action_logs_admin_insert"
  ON public.account_action_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
