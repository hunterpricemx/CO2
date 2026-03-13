-- 017_drops_log.sql
-- Log de ítems caídos de monstruos (sincronizado desde el servidor de juego)

CREATE TABLE IF NOT EXISTS public.drop_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text        NOT NULL,
  monster     text        NOT NULL,
  item_name   text        NOT NULL,
  item_type   text        NOT NULL DEFAULT 'other',   -- weapon | armor | accessory | gem | scroll | other
  item_plus   smallint    NOT NULL DEFAULT 0,
  map_name    text,
  version     text        NOT NULL DEFAULT '1.0',
  dropped_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drop_logs_player_idx    ON public.drop_logs (player_name);
CREATE INDEX IF NOT EXISTS drop_logs_version_idx   ON public.drop_logs (version);
CREATE INDEX IF NOT EXISTS drop_logs_dropped_idx   ON public.drop_logs (dropped_at DESC);
CREATE INDEX IF NOT EXISTS drop_logs_item_type_idx ON public.drop_logs (item_type);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.drop_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drop_logs: public read" ON public.drop_logs;
CREATE POLICY "drop_logs: public read"
  ON public.drop_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "drop_logs: admin write" ON public.drop_logs;
CREATE POLICY "drop_logs: admin write"
  ON public.drop_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
