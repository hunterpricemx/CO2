-- ============================================================
-- 023_tebex_headless_checkout.sql
-- Separa la private key de Tebex del webhook secret y agrega
-- el mapeo de package id de Tebex a los paquetes internos.
-- ============================================================

ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS tebex_webhook_secret TEXT NOT NULL DEFAULT '';

ALTER TABLE public.donation_packages
  ADD COLUMN IF NOT EXISTS tebex_package_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS donation_packages_tebex_idx
  ON public.donation_packages (tebex_package_id)
  WHERE tebex_package_id IS NOT NULL;