-- ============================================================
-- 002_events.sql
-- Game server events with multilingual content (ES/EN/PT)
-- ============================================================

CREATE TABLE public.events (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es        TEXT          NOT NULL,
  title_en        TEXT          NOT NULL,
  title_pt        TEXT          NOT NULL,
  schedule        JSONB         NOT NULL DEFAULT '[]',   -- [{"day":"monday","time":"20:00"}, ...]
  description_es  TEXT,
  description_en  TEXT,
  description_pt  TEXT,
  rewards_es      TEXT,
  rewards_en      TEXT,
  rewards_pt      TEXT,
  featured_image  TEXT,                     -- URL to Supabase Storage
  status          content_status NOT NULL DEFAULT 'draft',
  version         game_version   NOT NULL DEFAULT 'both',
  view_count      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX events_status_idx  ON public.events (status);
CREATE INDEX events_version_idx ON public.events (version);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
