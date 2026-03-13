-- ============================================================
-- 021_payment_config.sql
-- Agrega campos de configuración de pagos a server_config.
-- Stripe (test/live) + Tebex, con toggles de activación.
-- Solo el admin puede leer/escribir (RLS ya configurada).
-- ============================================================

ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS stripe_enabled      BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_mode         TEXT     NOT NULL DEFAULT 'test',  -- 'test' | 'live'
  ADD COLUMN IF NOT EXISTS stripe_pk_test      TEXT     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_sk_test      TEXT     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_pk_live      TEXT     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_sk_live      TEXT     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tebex_enabled       BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tebex_secret        TEXT     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tebex_webstore_id   TEXT     NOT NULL DEFAULT '';
