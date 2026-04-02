-- 042_accsory.sql
-- Modulo base para Accesory (catalogo similar a garments).

CREATE TABLE IF NOT EXISTS public.accesory (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  image_url     TEXT,
  active        BOOLEAN     NOT NULL DEFAULT true,
  is_reserved   BOOLEAN     NOT NULL DEFAULT false,
  allows_custom BOOLEAN     NOT NULL DEFAULT false,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accesory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accesory_select_active"
  ON public.accesory FOR SELECT
  USING (active = true OR public.is_admin());

CREATE POLICY "accesory_insert_admin"
  ON public.accesory FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "accesory_update_admin"
  ON public.accesory FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "accesory_delete_admin"
  ON public.accesory FOR DELETE
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS accesory_active_sort_idx
  ON public.accesory (active, sort_order ASC);

CREATE INDEX IF NOT EXISTS accesory_reserved_idx
  ON public.accesory (is_reserved);
