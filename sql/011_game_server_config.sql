-- ============================================================
-- 011_game_server_config.sql
-- Tabla de configuración del servidor de juego (MariaDB remoto)
-- Solo el admin puede leer/escribir. La contraseña nunca sale al cliente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.server_config (
  id                    INT         PRIMARY KEY DEFAULT 1,  -- solo 1 fila
  db_host               TEXT        NOT NULL DEFAULT '',
  db_port               INT         NOT NULL DEFAULT 3306,
  db_name               TEXT        NOT NULL DEFAULT '',
  db_user               TEXT        NOT NULL DEFAULT '',
  db_pass               TEXT        NOT NULL DEFAULT '',  -- cifrado en reposo por Supabase
  table_accounts        TEXT        NOT NULL DEFAULT 'accounts',
  table_characters_v1   TEXT        NOT NULL DEFAULT 'topservers',      -- servidor v1.0
  table_characters_v2   TEXT        NOT NULL DEFAULT 'topservers',      -- servidor v2.0 (ajustar al nombre real)
  last_sync             TIMESTAMPTZ DEFAULT NULL,
  sync_accounts_count   INT         DEFAULT 0,
  sync_characters_count INT         DEFAULT 0,  -- total v1 + v2
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.server_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "server_config: admin only" ON public.server_config;
CREATE POLICY "server_config: admin only"
  ON public.server_config FOR ALL
  USING (public.is_admin());

-- Insertar fila inicial vacía
INSERT INTO public.server_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
