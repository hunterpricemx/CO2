-- ============================================================
-- 006_rankings_market.sql
-- PvP rankings (PK/KO) and player marketplace items
-- ============================================================

CREATE TABLE public.rankings (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name     TEXT          NOT NULL,
  points          INTEGER       NOT NULL DEFAULT 0,
  ranking_type    ranking_type  NOT NULL,
  version         game_version  NOT NULL,
  season          TEXT          NOT NULL DEFAULT 'Season 1',
  rank_position   INTEGER       NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX rankings_type_version_idx ON public.rankings (ranking_type, version);
CREATE INDEX rankings_season_idx       ON public.rankings (season);
CREATE INDEX rankings_position_idx     ON public.rankings (rank_position);

CREATE TRIGGER rankings_updated_at
  BEFORE UPDATE ON public.rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================

CREATE TABLE public.market_items (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name   TEXT          NOT NULL,
  seller      TEXT          NOT NULL,
  price       NUMERIC(14,2) NOT NULL,
  currency    TEXT          NOT NULL DEFAULT 'CP',
  version     game_version  NOT NULL,
  item_type   TEXT,
  quantity    INTEGER       NOT NULL DEFAULT 1,
  listed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX market_version_idx ON public.market_items (version);
CREATE INDEX market_item_idx    ON public.market_items (item_name);
CREATE INDEX market_listed_idx  ON public.market_items (listed_at DESC);
