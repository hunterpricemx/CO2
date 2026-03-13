-- ============================================================
-- 023_donations_account_name.sql
-- Agrega account_name a la tabla donations para trazabilidad
-- por cuenta de juego (username), independiente del char_name.
-- ============================================================

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT NULL;

COMMENT ON COLUMN public.donations.account_name
  IS 'Username de la cuenta de juego (MariaDB accounts.Username). Trazabilidad aunque el char cambie de nombre.';

CREATE INDEX IF NOT EXISTS donations_account_idx ON public.donations (account_name);
