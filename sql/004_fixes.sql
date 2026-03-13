-- ============================================================
-- 004_fixes.sql
-- Server patches and bug fixes with multilingual content
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fix_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name_es     TEXT        NOT NULL,
  name_en     TEXT        NOT NULL,
  name_pt     TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fix_categories_slug_idx ON public.fix_categories (slug);
CREATE INDEX IF NOT EXISTS fix_categories_sort_idx ON public.fix_categories (sort_order);

CREATE TABLE IF NOT EXISTS public.fixes (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT           NOT NULL UNIQUE,
  title_es        TEXT           NOT NULL,
  title_en        TEXT           NOT NULL,
  title_pt        TEXT           NOT NULL,
  content_es      TEXT,
  content_en      TEXT,
  content_pt      TEXT,
  video_url       TEXT,          -- Optional YouTube/video URL
  category_id     UUID           REFERENCES public.fix_categories(id) ON DELETE SET NULL,
  featured_image  TEXT,
  status          content_status NOT NULL DEFAULT 'draft',
  version         game_version   NOT NULL DEFAULT 'both',
  view_count      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fixes
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fix_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fixes_slug_idx      ON public.fixes (slug);
CREATE INDEX IF NOT EXISTS fixes_status_idx    ON public.fixes (status);
CREATE INDEX IF NOT EXISTS fixes_version_idx   ON public.fixes (version);
CREATE INDEX IF NOT EXISTS fixes_category_idx  ON public.fixes (category_id);

DROP TRIGGER IF EXISTS fixes_updated_at ON public.fixes;
CREATE TRIGGER fixes_updated_at
  BEFORE UPDATE ON public.fixes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
