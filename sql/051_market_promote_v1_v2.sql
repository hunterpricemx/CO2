-- 051_market_promote_v1_v2.sql
-- Promueve la integración shop-test al market público de v1.0 y v2.0:
--   1. Endpoint shop config para v1 y v2 (paralelo a las _test del 050)
--   2. Whitelist de compradores autorizados (compartida)
--   3. Tracking de delivery en market_purchases (mismo esquema que market_test_purchases)

-- ── Shop endpoint config para v1.0 y v2.0 ──────────────────────
ALTER TABLE server_config
  ADD COLUMN IF NOT EXISTS shop_endpoint_v1    text,
  ADD COLUMN IF NOT EXISTS shop_hmac_secret_v1 text,
  ADD COLUMN IF NOT EXISTS shop_enabled_v1     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shop_timeout_ms_v1  int     DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS shop_endpoint_v2    text,
  ADD COLUMN IF NOT EXISTS shop_hmac_secret_v2 text,
  ADD COLUMN IF NOT EXISTS shop_enabled_v2     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shop_timeout_ms_v2  int     DEFAULT 5000;

-- ── Whitelist de usernames autorizados (compartida v1+v2) ──────
ALTER TABLE server_config
  ADD COLUMN IF NOT EXISTS shop_buyer_whitelist text[] DEFAULT ARRAY['arael120','wilker']::text[];

-- Si la fila id=1 ya existe pero la columna se agregó como NULL, inicializamos.
UPDATE server_config
   SET shop_buyer_whitelist = ARRAY['arael120','wilker']::text[]
 WHERE id = 1 AND shop_buyer_whitelist IS NULL;

-- ── Tracking de delivery en market_purchases ───────────────────
ALTER TABLE market_purchases
  ADD COLUMN IF NOT EXISTS delivery_attempts int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_error    text,
  ADD COLUMN IF NOT EXISTS delivered_at      timestamptz,
  ADD COLUMN IF NOT EXISTS player_ip         text,
  ADD COLUMN IF NOT EXISTS request_payload   jsonb,
  ADD COLUMN IF NOT EXISTS response_body     jsonb;

-- ── Permitir status 'failed' para delivery fallido sin refund ──
ALTER TABLE market_purchases DROP CONSTRAINT IF EXISTS market_purchases_status_check;
ALTER TABLE market_purchases
  ADD CONSTRAINT market_purchases_status_check
  CHECK (status IN ('pending','completed','cancelled','refunded','failed'));
