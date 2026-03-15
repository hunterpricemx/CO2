-- ============================================================
-- 024_tebex_admin_fields.sql
-- Campos administrativos extra para referencia y operación de Tebex.
-- ============================================================

ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS tebex_uri_v1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tebex_uri_v2 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tebex_payment_table TEXT NOT NULL DEFAULT 'dbb_payments',
  ADD COLUMN IF NOT EXISTS tebex_category_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tebex_product_id TEXT NOT NULL DEFAULT '';