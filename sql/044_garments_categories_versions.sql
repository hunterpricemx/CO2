-- 044_garments_categories_versions.sql
-- Agrega tabla de categorías para garments y columna de versiones disponibles.

-- ── 1. Tabla de categorías ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.garment_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.garment_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garment_categories_select_all"
  ON public.garment_categories FOR SELECT USING (true);

CREATE POLICY "garment_categories_insert_admin"
  ON public.garment_categories FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "garment_categories_update_admin"
  ON public.garment_categories FOR UPDATE USING (public.is_admin());

CREATE POLICY "garment_categories_delete_admin"
  ON public.garment_categories FOR DELETE USING (public.is_admin());

CREATE INDEX IF NOT EXISTS garment_categories_sort_idx
  ON public.garment_categories (sort_order ASC);

-- ── 2. FK categoría en garments ──────────────────────────────────────────────

ALTER TABLE public.garments
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.garment_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS garments_category_idx
  ON public.garments (category_id);

-- ── 3. Columna versions en garments ─────────────────────────────────────────
-- Valores: 'both' | '1' | '2'

ALTER TABLE public.garments
  ADD COLUMN IF NOT EXISTS versions TEXT NOT NULL DEFAULT 'both'
    CHECK (versions IN ('1', '2', 'both'));
