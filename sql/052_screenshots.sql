-- 052_screenshots.sql
-- Galería de Screenshots para v1.0 / v2.0:
--   1. screenshot_categories (PvP, Bosses, Eventos, etc.)
--   2. screenshots (image_url + multilingual metadata + version + category)
--   3. RLS: lectura pública para published, escritura admin con permission 'screenshots'

-- ── Categorías ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE,
  name_es     text        NOT NULL,
  name_en     text        NOT NULL,
  name_pt     text        NOT NULL,
  icon        text,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE screenshot_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "screenshot_categories: public read" ON screenshot_categories;
CREATE POLICY "screenshot_categories: public read" ON screenshot_categories
  FOR SELECT USING (true);

-- Seed de categorías por defecto
INSERT INTO screenshot_categories (slug, name_es, name_en, name_pt, icon, sort_order) VALUES
  ('pvp',       'PvP',          'PvP',          'PvP',          'Swords',     10),
  ('bosses',    'Jefes',        'Bosses',       'Chefes',       'Skull',      20),
  ('events',    'Eventos',      'Events',       'Eventos',      'Calendar',   30),
  ('guilds',    'Hermandades',  'Guilds',       'Guildas',      'Shield',     40),
  ('costumes',  'Atuendos',     'Costumes',     'Trajes',       'Shirt',      50),
  ('world',     'Mundo',        'World',        'Mundo',        'Globe',      60),
  ('memes',     'Memes',        'Memes',        'Memes',        'Smile',      70),
  ('other',     'Otros',        'Other',        'Outros',       'Image',      99)
ON CONFLICT (slug) DO NOTHING;

-- ── Screenshots ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshots (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text         NOT NULL UNIQUE,         -- url-friendly, generado del título
  version       text         NOT NULL CHECK (version IN ('1.0','2.0','both')),
  category_id   uuid         REFERENCES screenshot_categories(id) ON DELETE SET NULL,
  title_es      text         NOT NULL,
  title_en      text         NOT NULL DEFAULT '',
  title_pt      text         NOT NULL DEFAULT '',
  description_es text,
  description_en text,
  description_pt text,
  image_url     text         NOT NULL,                -- Supabase storage public URL
  thumbnail_url text,                                 -- opcional, futuro
  uploaded_by   uuid         REFERENCES profiles(id) ON DELETE SET NULL,
  uploader_name text,                                 -- snapshot por si el admin se borra
  status        text         NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  view_count    int          NOT NULL DEFAULT 0,
  tags          text[]       NOT NULL DEFAULT ARRAY[]::text[],
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_version    ON screenshots(version);
CREATE INDEX IF NOT EXISTS idx_screenshots_category   ON screenshots(category_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_status     ON screenshots(status);
CREATE INDEX IF NOT EXISTS idx_screenshots_created    ON screenshots(created_at DESC);

ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "screenshots: public read published" ON screenshots;
CREATE POLICY "screenshots: public read published" ON screenshots
  FOR SELECT USING (status = 'published');

-- ── RPC para incrementar view_count atómicamente ───────────────
CREATE OR REPLACE FUNCTION increment_screenshot_view(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE screenshots SET view_count = view_count + 1 WHERE id = p_id AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION increment_screenshot_view(uuid) TO anon, authenticated;
