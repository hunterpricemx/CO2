-- ============================================================
-- 024_influencers.sql
-- Tabla de influencers/streamers del servidor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.influencers (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT          NOT NULL,
  slug             TEXT          UNIQUE NOT NULL,
  photo_url        TEXT          DEFAULT NULL,
  description_es   TEXT          DEFAULT NULL,
  description_en   TEXT          DEFAULT NULL,
  description_pt   TEXT          DEFAULT NULL,
  streamer_code    TEXT          DEFAULT NULL,
  facebook_url     TEXT          DEFAULT NULL,
  instagram_url    TEXT          DEFAULT NULL,
  tiktok_url       TEXT          DEFAULT NULL,
  youtube_url      TEXT          DEFAULT NULL,
  twitch_url       TEXT          DEFAULT NULL,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order       INTEGER       NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS influencers_active_sort_idx ON public.influencers (is_active, sort_order);
CREATE INDEX IF NOT EXISTS influencers_slug_idx        ON public.influencers (slug);

CREATE TRIGGER influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo registros activos
CREATE POLICY "influencers_public_read"
  ON public.influencers FOR SELECT
  USING (is_active = TRUE);

-- Admin (service role) puede hacer todo
CREATE POLICY "influencers_admin_all"
  ON public.influencers FOR ALL
  USING (auth.role() = 'service_role');
