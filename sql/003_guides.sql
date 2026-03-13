-- ============================================================
-- 003_guides.sql
-- Guide categories and game guides with multilingual content
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guide_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name_es     TEXT        NOT NULL,
  name_en     TEXT        NOT NULL,
  name_pt     TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guides (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT           NOT NULL UNIQUE,
  title_es        TEXT           NOT NULL,
  title_en        TEXT           NOT NULL,
  title_pt        TEXT           NOT NULL,
  content_es      TEXT,
  content_en      TEXT,
  content_pt      TEXT,
  video_url       TEXT,          -- Optional YouTube/video URL
  category_id     UUID           REFERENCES public.guide_categories(id) ON DELETE SET NULL,
  featured_image  TEXT,
  status          content_status NOT NULL DEFAULT 'draft',
  version         game_version   NOT NULL DEFAULT 'both',
  view_count      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE INDEX IF NOT EXISTS guides_slug_idx       ON public.guides (slug);
CREATE INDEX IF NOT EXISTS guides_status_idx     ON public.guides (status);
CREATE INDEX IF NOT EXISTS guides_category_idx   ON public.guides (category_id);
CREATE INDEX IF NOT EXISTS guides_version_idx    ON public.guides (version);

DROP TRIGGER IF EXISTS guides_updated_at ON public.guides;
CREATE TRIGGER guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
