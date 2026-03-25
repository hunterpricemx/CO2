-- ============================================================
-- 038_garments.sql
-- Módulo de Garments (vestimenta) — mercado de trajes.
-- Tablas, RLS, storage buckets y columna server_config.
-- ============================================================

-- ── 1. Tabla de catálogo de garments ────────────────────────

CREATE TABLE IF NOT EXISTS public.garments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  image_url    TEXT,
  active       BOOLEAN     NOT NULL DEFAULT true,
  allows_custom BOOLEAN    NOT NULL DEFAULT false,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para garments
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;

-- Lectura pública (solo filas activas para jugadores, todas para admin)
CREATE POLICY "garments_select_active"
  ON public.garments FOR SELECT
  USING (active = true OR public.is_admin());

-- Solo admin puede insertar / actualizar / eliminar
CREATE POLICY "garments_insert_admin"
  ON public.garments FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "garments_update_admin"
  ON public.garments FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "garments_delete_admin"
  ON public.garments FOR DELETE
  USING (public.is_admin());

-- ── 2. Tabla de órdenes de garments ─────────────────────────

CREATE TABLE IF NOT EXISTS public.garment_orders (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  garment_id          UUID        REFERENCES public.garments(id) ON DELETE SET NULL,
  garment_name        TEXT        NOT NULL DEFAULT '',
  account_name        TEXT        NOT NULL,
  character_name      TEXT        NOT NULL,
  version             INTEGER     NOT NULL DEFAULT 2,
  is_custom           BOOLEAN     NOT NULL DEFAULT false,
  custom_description  TEXT,
  reference_image_url TEXT,
  amount_paid         NUMERIC(10, 2) NOT NULL DEFAULT 60,
  currency            TEXT        NOT NULL DEFAULT 'USD',
  -- pending_payment | paid | in_progress | delivered | cancelled
  status              TEXT        NOT NULL DEFAULT 'pending_payment',
  tebex_basket_ident  TEXT,
  tebex_transaction   TEXT,
  admin_notes         TEXT,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para garment_orders
ALTER TABLE public.garment_orders ENABLE ROW LEVEL SECURITY;

-- Jugadores ven solo sus propias órdenes (via account_name)
-- Como el juego usa game_session (no Supabase auth) usamos service_role en acciones de servidor;
-- la lectura pública directa no está expuesta, las acciones siempre usan admin client.
CREATE POLICY "garment_orders_select_admin"
  ON public.garment_orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "garment_orders_insert_anon"
  ON public.garment_orders FOR INSERT
  WITH CHECK (true);  -- El servidor valida la sesión antes de insertar

CREATE POLICY "garment_orders_update_admin"
  ON public.garment_orders FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "garment_orders_delete_admin"
  ON public.garment_orders FOR DELETE
  USING (public.is_admin());

-- ── 3. Índices ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS garments_active_sort
  ON public.garments (active, sort_order ASC);

CREATE INDEX IF NOT EXISTS garment_orders_account
  ON public.garment_orders (account_name);

CREATE INDEX IF NOT EXISTS garment_orders_status
  ON public.garment_orders (status);

-- ── 4. Columna en server_config para el package ID de Tebex ─

ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS tebex_garment_package_id TEXT NOT NULL DEFAULT '';

-- ── 5. Storage bucket para imágenes de garments ─────────────
-- Imágenes de catálogo (subidas por admin) y referencias de jugadores.
-- Se reutiliza el bucket conquer-media ya existente con subcarpetas.

-- garments/       → imágenes del catálogo (admin-only upload)
-- garment-refs/   → imágenes de referencia de jugadores (service_role upload via API route)

-- No se necesita bucket nuevo; el bucket conquer-media ya tiene políticas adecuadas.
-- Las imágenes de referencia de jugadores se suben a través de /api/player/garments/upload-ref
-- que usa el admin client en el servidor, evitando exponer upload público.
