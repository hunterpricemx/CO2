-- 019_lottery_log.sql
-- Registro de premios de lotería (sincronizado desde el servidor de juego)

CREATE TABLE IF NOT EXISTS public.lottery_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text        NOT NULL,
  prize_name  text        NOT NULL,
  prize_type  text        NOT NULL DEFAULT 'item',   -- item | cp | mount | gem | scroll | dragonball | other
  version     text        NOT NULL DEFAULT '1.0',
  won_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lottery_logs_player_idx     ON public.lottery_logs (player_name);
CREATE INDEX IF NOT EXISTS lottery_logs_version_idx    ON public.lottery_logs (version);
CREATE INDEX IF NOT EXISTS lottery_logs_won_idx        ON public.lottery_logs (won_at DESC);
CREATE INDEX IF NOT EXISTS lottery_logs_prize_type_idx ON public.lottery_logs (prize_type);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.lottery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lottery_logs: public read" ON public.lottery_logs;
CREATE POLICY "lottery_logs: public read"
  ON public.lottery_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "lottery_logs: admin write" ON public.lottery_logs;
CREATE POLICY "lottery_logs: admin write"
  ON public.lottery_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
