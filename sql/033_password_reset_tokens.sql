-- 033_password_reset_tokens.sql
-- Secure password reset tokens for game accounts.

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          timestamptz DEFAULT now() NOT NULL,
  username            text        NOT NULL,
  email               text        NOT NULL,
  version             smallint    NOT NULL,
  token_hash          text        NOT NULL UNIQUE,
  expires_at          timestamptz NOT NULL,
  used_at             timestamptz,
  requested_ip        text,
  requested_user_agent text
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_lookup_idx
  ON public.password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_idx
  ON public.password_reset_tokens (expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "password_reset_tokens_admin_all" ON public.password_reset_tokens;
CREATE POLICY "password_reset_tokens_admin_all"
  ON public.password_reset_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
