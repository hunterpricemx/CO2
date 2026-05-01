-- 050_server_pruebas_y_shop_endpoint.sql
-- Servidor "Pruebas" independiente + endpoint HTTP del listener C# del game server.
-- No toca v1/v2: solo añade columnas con sufijo _test y una tabla nueva.

-- ── Credenciales y tablas del servidor pruebas ─────────────────
ALTER TABLE server_config
  ADD COLUMN IF NOT EXISTS db_host_test          text,
  ADD COLUMN IF NOT EXISTS db_port_test          int  DEFAULT 3306,
  ADD COLUMN IF NOT EXISTS db_name_test          text,
  ADD COLUMN IF NOT EXISTS db_user_test          text,
  ADD COLUMN IF NOT EXISTS db_pass_test          text,
  ADD COLUMN IF NOT EXISTS table_accounts_test   text DEFAULT 'accounts',
  ADD COLUMN IF NOT EXISTS table_characters_test text DEFAULT 'topserver_turbo',
  ADD COLUMN IF NOT EXISTS table_payments_test   text DEFAULT 'dbb_payments';

-- ── Endpoint HTTP del game server (por entorno) ────────────────
ALTER TABLE server_config
  ADD COLUMN IF NOT EXISTS shop_endpoint_test    text,
  ADD COLUMN IF NOT EXISTS shop_hmac_secret_test text,
  ADD COLUMN IF NOT EXISTS shop_enabled_test     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shop_timeout_ms_test  int     DEFAULT 5000;

-- ── Historial de compras de prueba (separado de market_purchases) ──
CREATE TABLE IF NOT EXISTS market_test_purchases (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  admin_email       text          NOT NULL,
  uid               int           NOT NULL,
  item_id           bigint        NOT NULL,
  cp_amount         int           NOT NULL,
  player_ip         text,
  status            text          NOT NULL CHECK (status IN ('pending','completed','failed','refunded')),
  delivery_attempts int           NOT NULL DEFAULT 0,
  delivery_error    text,
  delivered_at      timestamptz,
  request_payload   jsonb,
  response_body     jsonb
);

CREATE INDEX IF NOT EXISTS idx_mtp_status   ON market_test_purchases(status);
CREATE INDEX IF NOT EXISTS idx_mtp_uid      ON market_test_purchases(uid);
CREATE INDEX IF NOT EXISTS idx_mtp_created  ON market_test_purchases(created_at DESC);

-- RLS: solo service role escribe; admins leen vía createAdminClient en server actions.
ALTER TABLE market_test_purchases ENABLE ROW LEVEL SECURITY;
