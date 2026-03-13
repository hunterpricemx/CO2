-- ============================================================
-- 012_game_characters_version.sql
-- Añade columna `version` a game_characters para soportar
-- dos servidores (v1.0 y v2.0) que comparten la misma BD.
-- PK cambia de (entity_id) a (entity_id, version).
-- ============================================================

-- 1. Agregar columna version
ALTER TABLE public.game_characters
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0';

-- 2. Cambiar PK a compuesta (entity_id, version)
ALTER TABLE public.game_characters DROP CONSTRAINT IF EXISTS game_characters_pkey;
ALTER TABLE public.game_characters ADD PRIMARY KEY (entity_id, version);

-- 3. Reemplazar vista v_top_players para incluir version
DROP VIEW IF EXISTS public.v_top_players;
CREATE VIEW public.v_top_players AS
SELECT
  gc.entity_id,
  gc.version,
  gc.name,
  gc.level,
  gc.reborn,
  gc.cps,
  gc.pk_points,
  gc.guild_name,
  gc.mesh,
  gc.avatar,
  gc.strength,
  gc.agility,
  gc.vitality,
  gc.spirit,
  gc.synced_at
FROM public.game_characters gc
ORDER BY gc.reborn DESC, gc.level DESC, gc.cps DESC;

-- 4. Reemplazar vista v_guild_rankings para incluir version
DROP VIEW IF EXISTS public.v_guild_rankings;
CREATE VIEW public.v_guild_rankings AS
SELECT
  gc.version,
  gc.guild_name,
  COUNT(*)                        AS member_count,
  SUM(gc.cps)                     AS total_cps,
  MAX(gc.level)                   AS max_level,
  SUM(gc.pk_points)               AS total_pk
FROM public.game_characters gc
WHERE gc.guild_name IS NOT NULL AND gc.guild_name <> ''
GROUP BY gc.version, gc.guild_name
ORDER BY gc.version, total_cps DESC;

-- 5. Reemplazar función get_player_card para aceptar version opcional
DROP FUNCTION IF EXISTS public.get_player_card(TEXT);
CREATE OR REPLACE FUNCTION public.get_player_card(
  p_name    TEXT,
  p_version TEXT DEFAULT NULL
)
RETURNS TABLE (
  entity_id   BIGINT,
  version     TEXT,
  name        TEXT,
  level       SMALLINT,
  reborn      SMALLINT,
  cps         BIGINT,
  pk_points   INT,
  guild_name  TEXT,
  mesh        INT,
  avatar      INT,
  strength    INT,
  agility     INT,
  vitality    INT,
  spirit      INT,
  spouse      TEXT,
  synced_at   TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT
    gc.entity_id, gc.version, gc.name, gc.level, gc.reborn,
    gc.cps, gc.pk_points, gc.guild_name, gc.mesh, gc.avatar,
    gc.strength, gc.agility, gc.vitality, gc.spirit,
    gc.spouse, gc.synced_at
  FROM public.game_characters gc
  WHERE gc.name = p_name
    AND (p_version IS NULL OR gc.version = p_version);
$$;
