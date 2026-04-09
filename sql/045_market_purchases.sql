-- 045_market_purchases.sql
-- Sistema de compras del mercado con CPs del sitio.

-- ── 1. Tabla market_purchases ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_purchases (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Comprador
  buyer_username  TEXT        NOT NULL,
  buyer_uid       INTEGER     NOT NULL,  -- accounts.EntityID del game server
  char_name       TEXT        NOT NULL,  -- nombre del personaje al comprar

  -- Ítem
  item_id         TEXT        NOT NULL,  -- marketlogs.ID (string)
  item_name       TEXT        NOT NULL,
  item_plus       INTEGER     NOT NULL DEFAULT 0,
  item_bless      INTEGER     NOT NULL DEFAULT 0,
  item_soc1       TEXT,
  item_soc2       TEXT,

  -- Vendedor (para entrega en juego)
  seller_name     TEXT        NOT NULL,
  seller_x        INTEGER,
  seller_y        INTEGER,

  -- Precio
  silver_price    BIGINT      NOT NULL,  -- precio original en silvers del juego
  cp_cost         INTEGER     NOT NULL,  -- CPs descontados
  cp_rate         INTEGER     NOT NULL,  -- tasa aplicada (1 CP = N silvers)

  -- Versión del servidor
  version         TEXT        NOT NULL,  -- '1.0' | '2.0'

  -- Estado
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  admin_note      TEXT,
  completed_at    TIMESTAMPTZ
);

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS market_purchases_buyer_idx   ON public.market_purchases (buyer_uid);
CREATE INDEX IF NOT EXISTS market_purchases_status_idx  ON public.market_purchases (status);
CREATE INDEX IF NOT EXISTS market_purchases_created_idx ON public.market_purchases (created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.market_purchases ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer (el filtro por buyer_uid lo hace el server con service_role)
-- Solo el service_role (admin client) puede INSERT/UPDATE/DELETE

CREATE POLICY "market_purchases_select_all"
  ON public.market_purchases FOR SELECT USING (true);

-- ── 2. Columna cp_market_rate en server_config ────────────────────────────────
-- 1 CP = 100,000 silvers por defecto

ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS cp_market_rate INTEGER NOT NULL DEFAULT 100000;
