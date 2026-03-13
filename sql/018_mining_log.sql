-- 018_mining_log.sql
-- Registro de ítems obtenidos por minería (sincronizado desde el servidor de juego)

CREATE TABLE IF NOT EXISTS public.mining_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text        NOT NULL,
  item_name   text        NOT NULL,
  item_type   text        NOT NULL DEFAULT 'mineral',  -- dragonball | meteor | gem | mineral | scroll | other
  quantity    int         NOT NULL DEFAULT 1,
  zone_name   text,
  version     text        NOT NULL DEFAULT '1.0',
  mined_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mining_logs_player_idx    ON public.mining_logs (player_name);
CREATE INDEX IF NOT EXISTS mining_logs_version_idx   ON public.mining_logs (version);
CREATE INDEX IF NOT EXISTS mining_logs_mined_idx     ON public.mining_logs (mined_at DESC);
CREATE INDEX IF NOT EXISTS mining_logs_item_type_idx ON public.mining_logs (item_type);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.mining_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mining_logs: public read" ON public.mining_logs;
CREATE POLICY "mining_logs: public read"
  ON public.mining_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "mining_logs: admin write" ON public.mining_logs;
CREATE POLICY "mining_logs: admin write"
  ON public.mining_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
