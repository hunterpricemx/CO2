-- ============================================================
-- 025_game_server_per_version.sql
-- Separa la configuración de la base de datos del juego en
-- dos sets independientes: V1.0 y V2.0.
-- ============================================================

-- Renombrar columnas actuales a sufijo _v2 (preservan datos existentes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_host'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_host_v2'
  ) THEN
    ALTER TABLE public.server_config RENAME COLUMN db_host TO db_host_v2;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_port'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_port_v2'
  ) THEN
    ALTER TABLE public.server_config RENAME COLUMN db_port TO db_port_v2;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_name_v2'
  ) THEN
    ALTER TABLE public.server_config RENAME COLUMN db_name TO db_name_v2;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_user'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_user_v2'
  ) THEN
    ALTER TABLE public.server_config RENAME COLUMN db_user TO db_user_v2;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_pass'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'db_pass_v2'
  ) THEN
    ALTER TABLE public.server_config RENAME COLUMN db_pass TO db_pass_v2;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'table_accounts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'server_config' AND column_name = 'table_accounts_v2'
  ) THEN
    ALTER TABLE public.server_config RENAME COLUMN table_accounts TO table_accounts_v2;
  END IF;
END $$;

ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS table_payments_v2 TEXT NOT NULL DEFAULT 'dbb_payments';

-- Agregar columnas V1
ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS db_host_v1         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS db_port_v1         INT  NOT NULL DEFAULT 3306,
  ADD COLUMN IF NOT EXISTS db_name_v1         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS db_user_v1         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS db_pass_v1         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS table_accounts_v1  TEXT NOT NULL DEFAULT 'accounts',
  ADD COLUMN IF NOT EXISTS table_payments_v1  TEXT NOT NULL DEFAULT 'dbb_payments';

-- table_characters_v1 y table_characters_v2 ya existen con nombres correctos
