-- ============================================================
-- 013_server_config_dual_tables.sql
-- Migra public.server_config para soportar dos tablas de personajes:
--   - table_characters_v1
--   - table_characters_v2
-- Compatible con instalaciones previas que solo tenían table_characters.
-- ============================================================

ALTER TABLE public.server_config
  ADD COLUMN IF NOT EXISTS table_characters_v1 TEXT NOT NULL DEFAULT 'topservers',
  ADD COLUMN IF NOT EXISTS table_characters_v2 TEXT NOT NULL DEFAULT 'topservers';

-- Si existe columna legacy table_characters, copiar sus valores a v1/v2
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'server_config'
      AND column_name = 'table_characters'
  ) THEN
    EXECUTE '
      UPDATE public.server_config
      SET table_characters_v1 = COALESCE(NULLIF(table_characters_v1, ''''), table_characters),
          table_characters_v2 = COALESCE(NULLIF(table_characters_v2, ''''), table_characters)
    ';

    EXECUTE 'ALTER TABLE public.server_config DROP COLUMN table_characters';
  END IF;
END
$$;

-- Garantizar defaults correctos
ALTER TABLE public.server_config
  ALTER COLUMN table_characters_v1 SET DEFAULT 'topservers',
  ALTER COLUMN table_characters_v2 SET DEFAULT 'topservers';
