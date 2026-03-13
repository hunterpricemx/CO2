-- ============================================================
-- 026_site_settings.sql
-- Configuración global del sitio: logos, fondos, video, promo slides
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS site_settings_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública (no hay datos sensibles aquí)
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
  ON public.site_settings FOR SELECT
  USING (true);

-- Solo service_role puede escribir
DROP POLICY IF EXISTS "site_settings_admin_all" ON public.site_settings;
CREATE POLICY "site_settings_admin_all"
  ON public.site_settings FOR ALL
  USING (auth.role() = 'service_role');

-- ── Valores por defecto ───────────────────────────────────────

INSERT INTO public.site_settings (key, value) VALUES
  ('logo_v1',            '/images/logos/conquer_classic_plus_10_logo.png'),
  ('logo_v2',            '/images/logos/conquer_classic_plus_20_logo.png'),
  ('hero_bg_v1',         '/images/backgrounds/bg__main10.jpg'),
  ('hero_bg_v2',         '/images/backgrounds/bg__main20.jpg'),
  ('home_video_url_v1',  ''),
  ('home_video_url_v2',  ''),
  ('promo_slides_v1',    '[]'),
  ('promo_slides_v2',    '[]')
ON CONFLICT (key) DO NOTHING;
