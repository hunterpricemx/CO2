-- ============================================================
-- 005_donations.sql
-- Donation records
-- ============================================================

CREATE TABLE public.donations (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name  TEXT             NOT NULL,
  amount       NUMERIC(10, 2)   NOT NULL,
  currency     TEXT             NOT NULL DEFAULT 'USD',
  platform     TEXT             NOT NULL DEFAULT 'manual',  -- tebex, paypal, manual
  status       donation_status  NOT NULL DEFAULT 'pending',
  notes        TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX donations_player_idx  ON public.donations (player_name);
CREATE INDEX donations_status_idx  ON public.donations (status);
CREATE INDEX donations_created_idx ON public.donations (created_at DESC);
