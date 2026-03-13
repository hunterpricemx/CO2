-- 020_market_schema_v2.sql
-- Extends market_items with game-specific fields for rich market display

ALTER TABLE public.market_items
  ADD COLUMN IF NOT EXISTS item_image    text,
  ADD COLUMN IF NOT EXISTS quality       text
      CHECK (quality IN ('NotQuality','Normality','Elite','Super','Refined')),
  ADD COLUMN IF NOT EXISTS plus_enchant  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minus_enchant integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sockets       integer NOT NULL DEFAULT 0
      CHECK (sockets BETWEEN 0 AND 2),
  ADD COLUMN IF NOT EXISTS seller_x      integer,
  ADD COLUMN IF NOT EXISTS seller_y      integer;

CREATE INDEX IF NOT EXISTS market_quality_idx ON public.market_items (quality);
CREATE INDEX IF NOT EXISTS market_plus_idx    ON public.market_items (plus_enchant);
