-- ============================================================
-- 022_donations_system.sql
-- Sistema completo de donaciones con soporte multi-versión,
-- paquetes configurables e influencer codes con bonus proporcional.
--
-- FLUJO:
--   1. Jugador elige paquete en el sitio (v1 o v2)
--   2. Paga vía Stripe / Tebex
--   3. Webhook crea registro en `donations` + inserta en game DB (cq_pending_donations)
--   4. Jugador va al NPC en el juego → ingresa código de influencer (opcional)
--   5. NPC calcula bonus proporcional y acredita CPs
--   6. Se marca como 'claimed' en ambas BDs
--
-- NOTA: La tabla `donations` de 005_donations.sql es la versión legacy.
--   Este sistema la reemplaza con la versión completa. Si ya migraste
--   a producción, ejecuta primero el bloque de migración al fondo.
-- ============================================================

-- ============================================================
-- 1. PAQUETES DE DONACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.donation_packages (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL,                   -- ej: "Inicio", "Aventurero", "Héroe"
  price_usd     NUMERIC(10,2) NOT NULL,                   -- precio en USD
  cps           INT           NOT NULL,                   -- CPs que entrega
  version       SMALLINT      NOT NULL DEFAULT 0,         -- 0=ambas | 1=v1 | 2=v2
  active        BOOLEAN       NOT NULL DEFAULT true,
  sort_order    INT           NOT NULL DEFAULT 0,
  bonus_label   TEXT          DEFAULT NULL,               -- texto extra ej: "+50% bonus esta semana"
  image_url     TEXT          DEFAULT NULL,               -- URL pública de la imagen del paquete
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donation_packages_version_idx ON public.donation_packages (version, active);

-- Seed: paquetes de ejemplo (ajusta precios/CPs a tu servidor)
INSERT INTO public.donation_packages (name, price_usd, cps, version, sort_order) VALUES
  ('Starter',    8.00,    530,  0, 10),
  ('Bronze',    16.00,   1075,  0, 20),
  ('Silver',    30.00,   2050,  0, 30),
  ('Gold',      60.00,   4200,  0, 40),
  ('Diamond',  285.00,  21000,  0, 50)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. CÓDIGOS DE INFLUENCER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.influencer_codes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT          NOT NULL UNIQUE,          -- ej: "HUNTER10"
  influencer_name TEXT          NOT NULL,                 -- nombre del influencer
  bonus_percent   NUMERIC(5,2)  NOT NULL DEFAULT 5.00,    -- % extra de CPs (proporcional)
  version         SMALLINT      NOT NULL DEFAULT 0,       -- 0=ambas | 1=v1 | 2=v2
  active          BOOLEAN       NOT NULL DEFAULT true,
  total_uses      INT           NOT NULL DEFAULT 0,       -- contador de usos
  total_bonus_cps BIGINT        NOT NULL DEFAULT 0,       -- total de CPs extra generados
  notes           TEXT          DEFAULT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ   DEFAULT NULL              -- NULL = sin expiración
);

CREATE INDEX IF NOT EXISTS influencer_codes_active_idx ON public.influencer_codes (active);

-- ============================================================
-- 3. DONACIONES (tabla principal)
-- Reemplaza la tabla legacy de 005_donations.sql
-- ============================================================
-- ESTADO (status):
--   'pending'   → pago iniciado pero no confirmado
--   'paid'      → pago confirmado, pendiente de acreditar en game DB
--   'credited'  → insertado en cq_pending_donations (listo para canjear en NPC)
--   'claimed'   → jugador canjeó en el NPC
--   'refunded'  → devuelto
--   'expired'   → no canjeado en tiempo límite (opcional)

-- Elimina la tabla legacy (005_donations.sql) si existe
DROP TABLE IF EXISTS public.donations CASCADE;

-- Elimina el tipo enum legacy si existe
DROP TYPE IF EXISTS public.donation_status;

CREATE TABLE public.donations (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quién dona
  user_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  character_name      TEXT          NOT NULL,             -- nombre del personaje en-juego
  version             SMALLINT      NOT NULL,             -- 1 | 2

  -- Qué compra
  package_id          UUID          REFERENCES public.donation_packages(id) ON DELETE SET NULL,
  amount_paid         NUMERIC(10,2) NOT NULL,
  currency            TEXT          NOT NULL DEFAULT 'USD',

  -- CPs
  cps_base            INT           NOT NULL,             -- CPs del paquete
  cps_bonus           INT           NOT NULL DEFAULT 0,   -- CPs extra por código de influencer
  cps_total           INT           NOT NULL,             -- cps_base + cps_bonus

  -- Influencer (el jugador lo ingresa en el NPC, no en el sitio)
  influencer_code     TEXT          DEFAULT NULL,
  influencer_code_id  UUID          REFERENCES public.influencer_codes(id) ON DELETE SET NULL,

  -- Pago
  payment_provider    TEXT          NOT NULL DEFAULT 'stripe',  -- 'stripe' | 'tebex' | 'manual'
  payment_intent_id   TEXT          DEFAULT NULL,               -- Stripe PaymentIntent ID
  tebex_transaction   TEXT          DEFAULT NULL,               -- Tebex transaction ID

  -- Estado
  status              TEXT          NOT NULL DEFAULT 'pending',
  game_credited_at    TIMESTAMPTZ   DEFAULT NULL,         -- cuando se insertó en game DB
  claimed_at          TIMESTAMPTZ   DEFAULT NULL,         -- cuando el jugador canjeó en NPC
  notes               TEXT          DEFAULT NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donations_user_idx         ON public.donations (user_id);
CREATE INDEX IF NOT EXISTS donations_char_version_idx ON public.donations (character_name, version);
CREATE INDEX IF NOT EXISTS donations_status_idx       ON public.donations (status);
CREATE INDEX IF NOT EXISTS donations_created_idx      ON public.donations (created_at DESC);
CREATE INDEX IF NOT EXISTS donations_payment_intent   ON public.donations (payment_intent_id) WHERE payment_intent_id IS NOT NULL;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- donation_packages: lectura pública, escritura solo admin
ALTER TABLE public.donation_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donation_packages_public_read" ON public.donation_packages;
DROP POLICY IF EXISTS "donation_packages_admin_all"   ON public.donation_packages;

CREATE POLICY "donation_packages_public_read" ON public.donation_packages
  FOR SELECT USING (active = true);

CREATE POLICY "donation_packages_admin_all" ON public.donation_packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- influencer_codes: solo admin (contiene info sensible de influencers)
ALTER TABLE public.influencer_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "influencer_codes_admin_all" ON public.influencer_codes;

CREATE POLICY "influencer_codes_admin_all" ON public.influencer_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- donations: el dueño ve las suyas, admin ve todas
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donations_owner_read"           ON public.donations;
DROP POLICY IF EXISTS "donations_admin_all"            ON public.donations;
DROP POLICY IF EXISTS "donations_service_role_insert"  ON public.donations;

CREATE POLICY "donations_owner_read" ON public.donations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "donations_admin_all" ON public.donations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role puede insertar sin restricción (para webhooks de Stripe/Tebex)
CREATE POLICY "donations_service_role_insert" ON public.donations
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 5. FUNCIÓN: acreditar influencer code al marcar claimed
--    Se llama desde el servidor cuando el NPC notifica el canje.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_donation(
  p_donation_id       UUID,
  p_influencer_code   TEXT   DEFAULT NULL,
  p_cps_bonus         INT    DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code_id   UUID;
  v_cps_base  INT;
BEGIN
  -- Obtiene cps_base de la donación
  SELECT cps_base INTO v_cps_base
  FROM public.donations
  WHERE id = p_donation_id AND status = 'credited';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'Donación no encontrada o ya canjeada');
  END IF;

  -- Si hay código de influencer, obtiene su id y actualiza contadores
  IF p_influencer_code IS NOT NULL AND p_influencer_code <> '' THEN
    SELECT id INTO v_code_id
    FROM public.influencer_codes
    WHERE code = UPPER(p_influencer_code) AND active = true;

    IF FOUND THEN
      UPDATE public.influencer_codes
      SET total_uses      = total_uses + 1,
          total_bonus_cps = total_bonus_cps + p_cps_bonus
      WHERE id = v_code_id;
    END IF;
  END IF;

  -- Marca como claimed
  UPDATE public.donations SET
    status             = 'claimed',
    influencer_code    = NULLIF(UPPER(p_influencer_code), ''),
    influencer_code_id = v_code_id,
    cps_bonus          = p_cps_bonus,
    cps_total          = v_cps_base + p_cps_bonus,
    claimed_at         = now()
  WHERE id = p_donation_id;

  RETURN jsonb_build_object('ok', true, 'msg', 'Donación canjeada correctamente');
END;
$$;

-- ============================================================
-- MIGRACIÓN (solo si ya tienes la tabla donations de 005)
-- Ejecuta SOLO si la tabla donations ya existía antes:
-- ============================================================
-- ALTER TABLE public.donations
--   ADD COLUMN IF NOT EXISTS character_name     TEXT,
--   ADD COLUMN IF NOT EXISTS version            SMALLINT     NOT NULL DEFAULT 2,
--   ADD COLUMN IF NOT EXISTS package_id         UUID         REFERENCES public.donation_packages(id),
--   ADD COLUMN IF NOT EXISTS cps_base           INT          NOT NULL DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS cps_bonus          INT          NOT NULL DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS cps_total          INT          NOT NULL DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS influencer_code    TEXT,
--   ADD COLUMN IF NOT EXISTS influencer_code_id UUID         REFERENCES public.influencer_codes(id),
--   ADD COLUMN IF NOT EXISTS payment_provider   TEXT         NOT NULL DEFAULT 'manual',
--   ADD COLUMN IF NOT EXISTS payment_intent_id  TEXT,
--   ADD COLUMN IF NOT EXISTS tebex_transaction  TEXT,
--   ADD COLUMN IF NOT EXISTS game_credited_at   TIMESTAMPTZ,
--   ADD COLUMN IF NOT EXISTS claimed_at         TIMESTAMPTZ;
