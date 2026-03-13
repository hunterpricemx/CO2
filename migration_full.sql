-- ============================================================
-- 001_profiles.sql
-- User profiles linked to Supabase Auth (auth.users)
--
-- Run this first. The profiles table extends auth.users with
-- game-specific fields and role information.
-- ============================================================

-- Create the enum types first
DO $$ BEGIN
  CREATE TYPE public.game_version AS ENUM ('1.0', '2.0', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'player');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.donation_status AS ENUM ('pending', 'completed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ranking_type AS ENUM ('pk', 'ko');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT          NOT NULL UNIQUE,
  email           TEXT          NOT NULL,
  role            user_role     NOT NULL DEFAULT 'player',
  in_game_name    TEXT,
  version         game_version  DEFAULT '1.0',
  banned          BOOLEAN       NOT NULL DEFAULT FALSE,
  ban_reason      TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
CREATE INDEX IF NOT EXISTS profiles_role_idx     ON public.profiles (role);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically create a profile when a new auth user is created.
-- The role and username are read from user_metadata (set during signUp).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================================
-- 002_events.sql
-- Game server events with multilingual content (ES/EN/PT)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.events (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es        TEXT          NOT NULL,
  title_en        TEXT          NOT NULL,
  title_pt        TEXT          NOT NULL,
  schedule        JSONB         NOT NULL DEFAULT '[]',   -- [{"day":"monday","time":"20:00"}, ...]
  description_es  TEXT,
  description_en  TEXT,
  description_pt  TEXT,
  rewards_es      TEXT,
  rewards_en      TEXT,
  rewards_pt      TEXT,
  featured_image  TEXT,                     -- URL to Supabase Storage
  status          content_status NOT NULL DEFAULT 'draft',
  version         game_version   NOT NULL DEFAULT 'both',
  view_count      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_status_idx  ON public.events (status);
CREATE INDEX IF NOT EXISTS events_version_idx ON public.events (version);

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- 003_guides.sql
-- Guide categories and game guides with multilingual content
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guide_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name_es     TEXT        NOT NULL,
  name_en     TEXT        NOT NULL,
  name_pt     TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guides (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT           NOT NULL UNIQUE,
  title_es        TEXT           NOT NULL,
  title_en        TEXT           NOT NULL,
  title_pt        TEXT           NOT NULL,
  content_es      TEXT,
  content_en      TEXT,
  content_pt      TEXT,
  video_url       TEXT,          -- Optional YouTube/video URL
  category_id     UUID           REFERENCES public.guide_categories(id) ON DELETE SET NULL,
  featured_image  TEXT,
  status          content_status NOT NULL DEFAULT 'draft',
  version         game_version   NOT NULL DEFAULT 'both',
  view_count      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE INDEX IF NOT EXISTS guides_slug_idx       ON public.guides (slug);
CREATE INDEX IF NOT EXISTS guides_status_idx     ON public.guides (status);
CREATE INDEX IF NOT EXISTS guides_category_idx   ON public.guides (category_id);
CREATE INDEX IF NOT EXISTS guides_version_idx    ON public.guides (version);

DROP TRIGGER IF EXISTS guides_updated_at ON public.guides;
CREATE TRIGGER guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- 004_fixes.sql
-- Server patches and bug fixes with multilingual content
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fix_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name_es     TEXT        NOT NULL,
  name_en     TEXT        NOT NULL,
  name_pt     TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fixes (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT           NOT NULL UNIQUE,
  title_es        TEXT           NOT NULL,
  title_en        TEXT           NOT NULL,
  title_pt        TEXT           NOT NULL,
  content_es      TEXT,
  content_en      TEXT,
  content_pt      TEXT,
  video_url       TEXT,          -- Optional YouTube/video URL
  category_id     UUID           REFERENCES public.fix_categories(id) ON DELETE SET NULL,
  featured_image  TEXT,
  status          content_status NOT NULL DEFAULT 'draft',
  version         game_version   NOT NULL DEFAULT 'both',
  view_count      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fixes
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.fix_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fixes_slug_idx      ON public.fixes (slug);
CREATE INDEX IF NOT EXISTS fixes_status_idx    ON public.fixes (status);
CREATE INDEX IF NOT EXISTS fixes_version_idx   ON public.fixes (version);
CREATE INDEX IF NOT EXISTS fixes_category_idx  ON public.fixes (category_id);

DROP TRIGGER IF EXISTS fixes_updated_at ON public.fixes;
CREATE TRIGGER fixes_updated_at
  BEFORE UPDATE ON public.fixes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- 005_donations.sql
-- Donation records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.donations (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name  TEXT             NOT NULL,
  amount       NUMERIC(10, 2)   NOT NULL,
  currency     TEXT             NOT NULL DEFAULT 'USD',
  platform     TEXT             NOT NULL DEFAULT 'manual',  -- tebex, paypal, manual
  status       donation_status  NOT NULL DEFAULT 'pending',
  notes        TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS donations_player_idx  ON public.donations (player_name);
CREATE INDEX IF NOT EXISTS donations_status_idx  ON public.donations (status);
CREATE INDEX IF NOT EXISTS donations_created_idx ON public.donations (created_at DESC);
-- ============================================================
-- 006_rankings_market.sql
-- PvP rankings (PK/KO) and player marketplace items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rankings (
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

CREATE INDEX IF NOT EXISTS rankings_type_version_idx ON public.rankings (ranking_type, version);
CREATE INDEX IF NOT EXISTS rankings_season_idx       ON public.rankings (season);
CREATE INDEX IF NOT EXISTS rankings_position_idx     ON public.rankings (rank_position);

DROP TRIGGER IF EXISTS rankings_updated_at ON public.rankings;
CREATE TRIGGER rankings_updated_at
  BEFORE UPDATE ON public.rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================

CREATE TABLE IF NOT EXISTS public.market_items (
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

CREATE INDEX IF NOT EXISTS market_version_idx ON public.market_items (version);
CREATE INDEX IF NOT EXISTS market_item_idx    ON public.market_items (item_name);
CREATE INDEX IF NOT EXISTS market_listed_idx  ON public.market_items (listed_at DESC);
-- ============================================================
-- 007_rls_policies.sql
-- Row Level Security policies for all public tables
--
-- Strategy:
--   - Public tables (events, guides, fixes, rankings, market_items):
--     SELECT  → everyone (including anonymous)
--     INSERT/UPDATE/DELETE → admins only (via service_role OR admin user)
--   - Profiles:
--     SELECT  → authenticated users can see all profiles (for admin panel)
--     UPDATE  → users can update their own profile; admins can update any
--   - Donations:
--     SELECT/INSERT/UPDATE → admin only
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fix_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_items   ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Helper function: is the current user an admin?
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt()->'user_metadata'->>'role') = 'admin',
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "profiles: public read" ON public.profiles;
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "profiles: self update" ON public.profiles;
CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles: admin delete" ON public.profiles;
CREATE POLICY "profiles: admin delete"
  ON public.profiles FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- events — public read, admin write
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "events: public read" ON public.events;
CREATE POLICY "events: public read"
  ON public.events FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "events: admin insert" ON public.events;
CREATE POLICY "events: admin insert"
  ON public.events FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "events: admin update" ON public.events;
CREATE POLICY "events: admin update"
  ON public.events FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "events: admin delete" ON public.events;
CREATE POLICY "events: admin delete"
  ON public.events FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- guide_categories — public read, admin write
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "guide_categories: public read" ON public.guide_categories;
CREATE POLICY "guide_categories: public read"
  ON public.guide_categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "guide_categories: admin write" ON public.guide_categories;
CREATE POLICY "guide_categories: admin write"
  ON public.guide_categories FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------
-- guides — public read (published only for anon), admin sees all
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "guides: public read published" ON public.guides;
CREATE POLICY "guides: public read published"
  ON public.guides FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "guides: admin insert" ON public.guides;
CREATE POLICY "guides: admin insert"
  ON public.guides FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "guides: admin update" ON public.guides;
CREATE POLICY "guides: admin update"
  ON public.guides FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "guides: admin delete" ON public.guides;
CREATE POLICY "guides: admin delete"
  ON public.guides FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- fixes — same as guides
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "fix_categories: public read" ON public.fix_categories;
CREATE POLICY "fix_categories: public read"
  ON public.fix_categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "fix_categories: admin write" ON public.fix_categories;
CREATE POLICY "fix_categories: admin write"
  ON public.fix_categories FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "fixes: public read published" ON public.fixes;
CREATE POLICY "fixes: public read published"
  ON public.fixes FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "fixes: admin insert" ON public.fixes;
CREATE POLICY "fixes: admin insert"
  ON public.fixes FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "fixes: admin update" ON public.fixes;
CREATE POLICY "fixes: admin update"
  ON public.fixes FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "fixes: admin delete" ON public.fixes;
CREATE POLICY "fixes: admin delete"
  ON public.fixes FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- donations — admin only
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "donations: admin all" ON public.donations;
CREATE POLICY "donations: admin all"
  ON public.donations FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------
-- rankings — public read, admin write
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "rankings: public read" ON public.rankings;
CREATE POLICY "rankings: public read"
  ON public.rankings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "rankings: admin write" ON public.rankings;
CREATE POLICY "rankings: admin write"
  ON public.rankings FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------
-- market_items — public read, admin write
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "market_items: public read" ON public.market_items;
CREATE POLICY "market_items: public read"
  ON public.market_items FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "market_items: admin write" ON public.market_items;
CREATE POLICY "market_items: admin write"
  ON public.market_items FOR ALL USING (public.is_admin());
-- ============================================================
-- 008_storage.sql
-- Supabase Storage bucket for media uploads
--
-- Run this in the SQL editor, OR create the bucket manually:
-- Dashboard → Storage → New bucket → "conquer-media" (public)
-- ============================================================

-- Create the storage bucket (public so images are accessible without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conquer-media',
  'conquer-media',
  TRUE,
  5242880,  -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Storage RLS policies
-- ----------------------------------------------------------------

-- Anyone can read public files
DROP POLICY IF EXISTS "conquer-media: public read" ON storage.objects;
CREATE POLICY "conquer-media: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'conquer-media');

-- Only admins can upload files
DROP POLICY IF EXISTS "conquer-media: admin upload" ON storage.objects;
CREATE POLICY "conquer-media: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'conquer-media'
    AND public.is_admin()
  );

-- Only admins can update files
DROP POLICY IF EXISTS "conquer-media: admin update" ON storage.objects;
CREATE POLICY "conquer-media: admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'conquer-media'
    AND public.is_admin()
  );

-- Only admins can delete files
DROP POLICY IF EXISTS "conquer-media: admin delete" ON storage.objects;
CREATE POLICY "conquer-media: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'conquer-media'
    AND public.is_admin()
  );
-- ============================================================
-- 009_seed.sql
-- Seed data: guide categories + sample events/guides/fixes
--
-- Run AFTER all other migration files.
-- ============================================================

-- ----------------------------------------------------------------
-- Guide Categories (5 defaults matching the original PHP site)
-- ----------------------------------------------------------------
INSERT INTO public.guide_categories (slug, name_es, name_en, name_pt, sort_order) VALUES
  ('world-bosses', 'Jefes del Mundo',  'World Bosses',   'Chefes do Mundo', 1),
  ('events',       'Eventos',          'Events',         'Eventos',         2),
  ('quests',       'Misiones',         'Quests',         'Missões',         3),
  ('systems',      'Sistemas',         'Systems',        'Sistemas',        4),
  ('general',      'Guías Generales',  'General Guides', 'Guias Gerais',    5)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------
-- Events — Conquer Classic Plus 2.0
-- ----------------------------------------------------------------
DELETE FROM public.events WHERE version = '2.0';

INSERT INTO public.events (title_es, title_en, title_pt, schedule, description_es, description_en, description_pt, rewards_es, rewards_en, rewards_pt, status, version) VALUES

-- 1. ClassPK
('ClassPK', 'ClassPK', 'ClassPK',
 '[{"day":"daily","time":"19:00"}]',
 'Evento diario por clase. Lunes: Trojans, Martes: Warriors, Miércoles: Archers, Jueves: Fire Taoists, Viernes: Water Taoists.',
 'Daily class event. Monday: Trojans, Tuesday: Warriors, Wednesday: Archers, Thursday: Fire Taoists, Friday: Water Taoists.',
 'Evento diário por classe. Segunda: Trojans, Terça: Warriors, Quarta: Archers, Quinta: Fire Taoists, Sexta: Water Taoists.',
 'Nivel 0–99: 215 CPs + 1 EXP Ball
Nivel 100–119: 390 CPs + 3 EXP Balls
Nivel 120–129: 510 CPs + 5 EXP Balls
Nivel 130+: 730 CPs + 10 EXP Balls + TOP',
 'Level 0–99: 215 CPs + 1 EXP Ball
Level 100–119: 390 CPs + 3 EXP Balls
Level 120–129: 510 CPs + 5 EXP Balls
Level 130+: 730 CPs + 10 EXP Balls + TOP',
 'Nível 0–99: 215 CPs + 1 EXP Ball
Nível 100–119: 390 CPs + 3 EXP Balls
Nível 120–129: 510 CPs + 5 EXP Balls
Nível 130+: 730 CPs + 10 EXP Balls + TOP',
 'published', '2.0'),

-- 2. SkillTeamPK (TorneoPkcomun)
('SkillTeamPK', 'SkillTeamPK', 'SkillTeamPK',
 '[{"day":"wednesday","time":"19:55"}]',
 'Torneo de equipos por habilidades. Forma equipo y compite en la arena.',
 'Skill-based team tournament. Form a team and compete in the arena.',
 'Torneio de equipes por habilidades. Forme um time e compita na arena.',
 'Ver premios en la interfaz de Arena.',
 'See awards in the Arena interface.',
 'Ver prêmios na interface da Arena.',
 'published', '2.0'),

-- 3. ElitePK (TorneoHeroes)
('ElitePK', 'ElitePK', 'ElitePK',
 '[{"day":"friday","time":"19:55"}]',
 'El torneo de los héroes. Solo los mejores jugadores pueden competir.',
 'The heroes tournament. Only the best players can compete.',
 'O torneio dos heróis. Apenas os melhores jogadores podem competir.',
 'Ver premios en la interfaz de Arena.',
 'See awards in the Arena interface.',
 'Ver prêmios na interface da Arena.',
 'published', '2.0'),

-- 4. TeamPK (TorneoPkGrupo)
('TeamPK', 'TeamPK', 'TeamPK',
 '[{"day":"saturday","time":"18:55"}]',
 'Torneo por grupos PK. Forma tu grupo y demuestra tu poder.',
 'Group PK tournament. Form your group and show your power.',
 'Torneio por grupos PK. Forme seu grupo e mostre seu poder.',
 'Ver premios en la interfaz de Arena.',
 'See awards in the Arena interface.',
 'Ver prêmios na interface da Arena.',
 'published', '2.0'),

-- 5. Guildwar
('Guildwar', 'Guildwar', 'Guildwar',
 '[{"day":"sunday","time":"16:00"}]',
 'La batalla entre guilds por el dominio del servidor. Dura de 16:00 a 18:00.',
 'The guild battle for server dominance. Runs from 16:00 to 18:00.',
 'A batalha entre guildas pelo domínio do servidor. Dura das 16:00 às 18:00.',
 '5.000 CPs',
 '5,000 CPs',
 '5.000 CPs',
 'published', '2.0'),

-- 6. Dis City
('Dis City', 'Dis City', 'Dis City',
 '[{"day":"monday","time":"20:00"},{"day":"wednesday","time":"20:00"},{"day":"tuesday","time":"12:00"},{"day":"thursday","time":"12:00"},{"day":"saturday","time":"00:00"}]',
 'Conquista la ciudad de Dis y obtén recompensas únicas.',
 'Conquer the city of Dis and earn unique rewards.',
 'Conquiste a cidade de Dis e ganhe recompensas únicas.',
 'EXP Balls directas, Clean Water',
 'Exp balls direct, Clean Water',
 'EXP Balls diretas, Clean Water',
 'published', '2.0'),

-- 7. War Flags (Guerra Banderas)
('Guerra de Banderas', 'War Flags', 'Guerra de Bandeiras',
 '[{"day":"saturday","time":"21:00"}]',
 'Batalla por las banderas del servidor. El evento más competitivo de la semana.',
 'Battle for the server flags. The most competitive event of the week.',
 'Batalha pelas bandeiras do servidor. O evento mais competitivo da semana.',
 'TOP 1: 120.000.000 Money + 3.000 CPs
TOP 2: 100.000.000 Money + 2.000 CPs
TOP 3: 80.000.000 Money + 1.000 CPs
TOP 4: 65.000.000 Money + 600 CPs
TOP 5: 50.000.000 Money + 500 CPs
TOP 6: 40.000.000 Money + 400 CPs
TOP 7: 30.000.000 Money + 300 CPs
TOP 8: 20.000.000 Money + 200 CPs',
 'TOP 1: 120,000,000 Money + 3,000 CPs
TOP 2: 100,000,000 Money + 2,000 CPs
TOP 3: 80,000,000 Money + 1,000 CPs
TOP 4: 65,000,000 Money + 600 CPs
TOP 5: 50,000,000 Money + 500 CPs
TOP 6: 40,000,000 Money + 400 CPs
TOP 7: 30,000,000 Money + 300 CPs
TOP 8: 20,000,000 Money + 200 CPs',
 'TOP 1: 120.000.000 Money + 3.000 CPs
TOP 2: 100.000.000 Money + 2.000 CPs
TOP 3: 80.000.000 Money + 1.000 CPs
TOP 4: 65.000.000 Money + 600 CPs
TOP 5: 50.000.000 Money + 500 CPs
TOP 6: 40.000.000 Money + 400 CPs
TOP 7: 30.000.000 Money + 300 CPs
TOP 8: 20.000.000 Money + 200 CPs',
 'published', '2.0'),

-- 8. Monthly
('Mensual', 'Monthly', 'Mensal',
 '[{"day":"first_of_month","time":"20:00"}]',
 'Evento especial del primer día de cada mes.',
 'Special event on the first day of each month.',
 'Evento especial no primeiro dia de cada mês.',
 'Nivel 1–99: 215 CPs, 2 EXP Balls, Class 1 Money Bag (300.000 silver)
Nivel 100–119: 215 CPs, 3 EXP Balls, Class 2 Money Bag (800.000 silver)
Nivel 120–129: 215 CPs, 1 Power EXP Ball, Class 3 Money Bag (1.200.000 silver)
Nivel 130+: 215 CPs, 2 Power EXP Balls, Class 5 Money Bag (5.000.000 silver)',
 'Level 1–99: 215 CPs, 2 EXP Balls, Class 1 Money Bag (300,000 silver)
Level 100–119: 215 CPs, 3 EXP Balls, Class 2 Money Bag (800,000 silver)
Level 120–129: 215 CPs, 1 Power EXP Ball, Class 3 Money Bag (1,200,000 silver)
Level 130+: 215 CPs, 2 Power EXP Balls, Class 5 Money Bag (5,000,000 silver)',
 'Nível 1–99: 215 CPs, 2 EXP Balls, Class 1 Money Bag (300.000 silver)
Nível 100–119: 215 CPs, 3 EXP Balls, Class 2 Money Bag (800.000 silver)
Nível 120–129: 215 CPs, 1 Power EXP Ball, Class 3 Money Bag (1.200.000 silver)
Nível 130+: 215 CPs, 2 Power EXP Balls, Class 5 Money Bag (5.000.000 silver)',
 'published', '2.0'),

-- 9. WeeklyPK
('WeeklyPK', 'WeeklyPK', 'WeeklyPK',
 '[{"day":"saturday","time":"22:00"}]',
 'El gran torneo PK semanal. Demuestra que eres el más fuerte del servidor.',
 'The grand weekly PK tournament. Prove you are the strongest on the server.',
 'O grande torneio PK semanal. Prove que você é o mais forte do servidor.',
 'Nivel 1–99: 215 CPs, 1 EXP Ball, Class 1 Money Bag (300k silver)
Nivel 100–119: 215 CPs, 2 EXP Balls, Class 2 Money Bag (800k silver)
Nivel 120–129: 215 CPs, 3 EXP Balls, Class 3 Money Bag (1.2M silver)
Nivel 130+: 215 CPs, 5 EXP Balls, Class 4 Money Bag (1.8M silver) + HALO',
 'Level 1–99: 215 CPs, 1 EXP Ball, Class 1 Money Bag (300k silver)
Level 100–119: 215 CPs, 2 EXP Balls, Class 2 Money Bag (800k silver)
Level 120–129: 215 CPs, 3 EXP Balls, Class 3 Money Bag (1.2M silver)
Level 130+: 215 CPs, 5 EXP Balls, Class 4 Money Bag (1.8M silver) + HALO',
 'Nível 1–99: 215 CPs, 1 EXP Ball, Class 1 Money Bag (300k silver)
Nível 100–119: 215 CPs, 2 EXP Balls, Class 2 Money Bag (800k silver)
Nível 120–129: 215 CPs, 3 EXP Balls, Class 3 Money Bag (1.2M silver)
Nível 130+: 215 CPs, 5 EXP Balls, Class 4 Money Bag (1.8M silver) + HALO',
 'published', '2.0'),

-- 10. SteedRace
('Carrera de Corceles', 'SteedRace', 'Corrida de Corcéis',
 '[{"day":"daily","time":"13:30"},{"day":"daily","time":"22:30"}]',
 'La carrera diaria de corceles. Compite por el primer lugar dos veces al día.',
 'The daily steed race. Compete for first place twice a day.',
 'A corrida diária de corcéis. Compita pelo primeiro lugar duas vezes ao dia.',
 'Rank 1: 10 puntos
Rank 2: 5 puntos
Rank 3: 3 puntos',
 'Rank 1: 10 points
Rank 2: 5 points
Rank 3: 3 points',
 'Rank 1: 10 pontos
Rank 2: 5 pontos
Rank 3: 3 pontos',
 'published', '2.0'),

-- 11. BattlePK
('BattlePK', 'BattlePK', 'BattlePK',
 '[{"day":"tuesday","time":"19:54"}]',
 'El torneo BattlePK. Acumula BP y gana grandes premios.',
 'The BattlePK tournament. Accumulate BP and win great prizes.',
 'O torneio BattlePK. Acumule BP e ganhe grandes prêmios.',
 '100–250 BP: 215 CPs
250–300 BP: 500 CPs
300+ BP: 1.075 CPs',
 '100–250 BP: 215 CPs
250–300 BP: 500 CPs
300+ BP: 1,075 CPs',
 '100–250 BP: 215 CPs
250–300 BP: 500 CPs
300+ BP: 1.075 CPs',
 'published', '2.0'),

-- 12. Clan War
('Clan War', 'Clan War', 'Clan War',
 '[{"day":"daily","time":"21:30"}]',
 'La guerra de clanes diaria. Lucha junto a tu clan por la gloria del servidor.',
 'The daily clan war. Fight alongside your clan for server glory.',
 'A guerra de clãs diária. Lute ao lado do seu clã pela glória do servidor.',
 NULL, NULL, NULL,
 'published', '2.0'),

-- 13. LuckyNumber (Número de la suerte)
('Número de la Suerte', 'Lucky Number', 'Número da Sorte',
 '[{"day":"daily","time":"03:10"},{"day":"daily","time":"07:10"},{"day":"daily","time":"11:10"},{"day":"daily","time":"15:10"},{"day":"daily","time":"19:10"},{"day":"daily","time":"23:10"}]',
 'El evento del número de la suerte. ¡Participa 6 veces al día y prueba tu fortuna!',
 'The lucky number event. Participate 6 times a day and test your fortune!',
 'O evento do número da sorte. Participe 6 vezes ao dia e teste sua sorte!',
 'DragonBall con 10% de probabilidad. Si no aparece, uno de estos ítems aleatorios: Meteor, MeteorScroll, +1, +2, MoonBox, CleanWater, Class3MoneyBag.',
 'DragonBall with a 10% chance. If it doesn''t appear, one of these random items: Meteor, MeteorScroll, +1, +2, MoonBox, CleanWater, Class3MoneyBag.',
 'DragonBall com 10% de chance. Se não aparecer, um desses itens aleatórios: Meteor, MeteorScroll, +1, +2, MoonBox, CleanWater, Class3MoneyBag.',
 'published', '2.0');

-- ----------------------------------------------------------------
-- Guides
-- ----------------------------------------------------------------
DELETE FROM public.guides
WHERE slug IN (
  'como-subir-de-nivel-rapido',
  'consejos-para-empezar',
  'primer-reborn-paso-a-paso',
  'equipamiento-bless-y-sockets',
  'eventos-clave-para-farmear-cps',
  'guia-de-guild-war-y-war-flags',
  'quest-de-promocion-y-superman',
  'snow-banshee-ruta-y-recompensas'
);

INSERT INTO public.guides (slug, title_es, title_en, title_pt, content_es, content_en, content_pt, status, version, category_id)
VALUES
(
  'como-subir-de-nivel-rapido',
  'Cómo subir de nivel rápido',
  'How to level up fast',
  'Como subir de nível rápido',
  '<p>Subir de nivel rápido en Conquer Classic Plus depende de una ruta simple, buen equipo inicial y aprovechar los eventos diarios.</p><h2>Ruta recomendada</h2><ul><li>Niveles 1 a 40: Desert y Twin City.</li><li>Niveles 40 a 70: Ape Mountain y Bird Island.</li><li>Niveles 70 a 110: Mystic Castle, Lab o mapas con buen respawn.</li><li>Desde 110: combina farm con eventos diarios para no depender solo del leveo tradicional.</li></ul><h2>Consejos clave</h2><p>Usa tus EXP Balls en rangos donde realmente te ahorren tiempo, mejora el arma primero y mantén siempre algunas pociones y scrolls para rotar mapas más rápido.</p>',
  '<p>Leveling quickly in Conquer Classic Plus depends on a simple route, decent starter gear, and taking advantage of daily events.</p><h2>Recommended route</h2><ul><li>Levels 1 to 40: Desert and Twin City.</li><li>Levels 40 to 70: Ape Mountain and Bird Island.</li><li>Levels 70 to 110: Mystic Castle, Lab, or maps with strong respawn rates.</li><li>After 110: combine farming with daily events instead of relying only on traditional grinding.</li></ul><h2>Key tips</h2><p>Use your EXP Balls when they save meaningful time, upgrade your weapon first, and always keep potions and scrolls ready to rotate between maps faster.</p>',
  '<p>Subir de nível rápido no Conquer Classic Plus depende de uma rota simples, equipamento inicial razoável e bom uso dos eventos diários.</p><h2>Rota recomendada</h2><ul><li>Níveis 1 a 40: Desert e Twin City.</li><li>Níveis 40 a 70: Ape Mountain e Bird Island.</li><li>Níveis 70 a 110: Mystic Castle, Lab ou mapas com bom respawn.</li><li>Depois do 110: combine farm com eventos diários para não depender apenas do grind tradicional.</li></ul><h2>Dicas principais</h2><p>Use suas EXP Balls nos níveis em que realmente economizam tempo, melhore a arma primeiro e mantenha poções e scrolls para trocar de mapa mais rápido.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'general')
),
(
  'consejos-para-empezar',
  'Consejos para empezar',
  'Getting started tips',
  'Dicas para começar',
  '<p>Si acabas de entrar al servidor, evita gastar recursos sin plan. Lo primero es definir tu clase, conseguir equipo básico y revisar las guías de eventos y sistemas.</p><h2>Orden recomendado</h2><ul><li>Haz leveling temprano.</li><li>Consigue equipo con buena calidad base.</li><li>Únete a una guild activa.</li><li>Revisa horarios de eventos antes de desconectarte.</li></ul><p>Entrar a una comunidad activa acelera mucho tu progreso porque podrás resolver quests, bosses y eventos con menos riesgo.</p>',
  '<p>If you just joined the server, avoid spending resources without a plan. First choose your class, secure basic gear, and review the event and system guides.</p><h2>Recommended order</h2><ul><li>Push early leveling.</li><li>Get gear with solid base quality.</li><li>Join an active guild.</li><li>Check the event schedule before logging off.</li></ul><p>Joining an active community speeds up your progress because quests, bosses, and events become much easier to handle.</p>',
  '<p>Se você acabou de entrar no servidor, evite gastar recursos sem planejamento. Primeiro defina sua classe, consiga equipamento básico e leia as guias de eventos e sistemas.</p><h2>Ordem recomendada</h2><ul><li>Avance no leveling inicial.</li><li>Consiga equipamento com boa qualidade base.</li><li>Entre em uma guild ativa.</li><li>Confira os horários dos eventos antes de sair.</li></ul><p>Entrar em uma comunidade ativa acelera muito o progresso porque quests, bosses e eventos ficam bem mais fáceis.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'general')
),
(
  'primer-reborn-paso-a-paso',
  'Primer reborn paso a paso',
  'First reborn step by step',
  'Primeiro reborn passo a passo',
  '<p>El primer reborn es uno de los hitos más importantes. Antes de intentarlo, asegúrate de cumplir el nivel requerido, tener los items necesarios y dejar espacio en inventario.</p><h2>Antes de empezar</h2><ul><li>Confirma el nivel mínimo y la clase correcta.</li><li>Guarda tus recursos importantes en el warehouse.</li><li>Lleva dinero para teleports y consumibles.</li></ul><h2>Recomendación</h2><p>No hagas reborn en medio de un evento o con inventario lleno. Organiza el proceso, termina la quest completa y vuelve a subir con equipo guardado para el nuevo ciclo.</p>',
  '<p>Your first reborn is one of the biggest milestones in the game. Before starting it, make sure you meet the required level, have the necessary items, and keep inventory space available.</p><h2>Before you start</h2><ul><li>Confirm the minimum level and correct class.</li><li>Store important resources in the warehouse.</li><li>Carry enough money for teleports and consumables.</li></ul><h2>Recommendation</h2><p>Do not attempt reborn during an event or with a full inventory. Plan the process, finish the full quest line, and level again with the gear you prepared in advance.</p>',
  '<p>O primeiro reborn é um dos marcos mais importantes do jogo. Antes de começar, confirme o nível exigido, os itens necessários e deixe espaço no inventário.</p><h2>Antes de começar</h2><ul><li>Confirme o nível mínimo e a classe correta.</li><li>Guarde recursos importantes no warehouse.</li><li>Leve dinheiro para teleports e consumíveis.</li></ul><h2>Recomendação</h2><p>Não faça reborn no meio de evento nem com inventário cheio. Organize o processo, complete toda a quest e volte a upar com o equipamento separado para o novo ciclo.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'systems')
),
(
  'equipamiento-bless-y-sockets',
  'Equipamiento, bless y sockets',
  'Gear, bless, and sockets',
  'Equipamento, bless e sockets',
  '<p>Un personaje fuerte no depende solo del nivel. La diferencia real aparece cuando mejoras bless, calidad, plus y sockets de forma inteligente.</p><h2>Prioridades</h2><ul><li>Arma principal primero.</li><li>Después piezas defensivas con bless.</li><li>Los sockets tienen más valor en equipo que usarás por más tiempo.</li></ul><p>No inviertas todos tus recursos en una pieza temporal. Mejora por etapas y usa cada avance para farmear más rápido el siguiente upgrade.</p>',
  '<p>A strong character does not depend on level alone. The real difference appears when you improve bless, quality, plus, and sockets intelligently.</p><h2>Priorities</h2><ul><li>Main weapon first.</li><li>Then defensive pieces with bless.</li><li>Sockets are most valuable on gear you will keep longer.</li></ul><p>Do not spend all your resources on temporary gear. Upgrade in stages and use each improvement to farm the next one faster.</p>',
  '<p>Um personagem forte não depende apenas do nível. A diferença real aparece quando você melhora bless, qualidade, plus e sockets de forma inteligente.</p><h2>Prioridades</h2><ul><li>Arma principal primeiro.</li><li>Depois peças defensivas com bless.</li><li>Sockets valem mais em equipamentos que você usará por mais tempo.</li></ul><p>Não gaste todos os recursos em uma peça temporária. Melhore por etapas e use cada avanço para farmar o próximo upgrade mais rápido.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'systems')
),
(
  'eventos-clave-para-farmear-cps',
  'Eventos clave para farmear CPs',
  'Best events to farm CPs',
  'Eventos chave para farmar CPs',
  '<p>Si quieres crecer sin depender únicamente del market, debes entrar a los eventos con mejor retorno de CPs y recompensas por tiempo invertido.</p><h2>Eventos más rentables</h2><ul><li>ClassPK para premios por rango.</li><li>WeeklyPK para recompensas semanales.</li><li>BattlePK si tienes buen daño y constancia.</li><li>Lucky Number como ingreso extra con suerte.</li></ul><p>Revisa el horario oficial y prepara consumibles antes de entrar. El jugador que llega listo gana más que el que improvisa.</p>',
  '<p>If you want to progress without relying only on the market, you need to join the events with the strongest CP return and the best reward-to-time ratio.</p><h2>Most profitable events</h2><ul><li>ClassPK for rank rewards.</li><li>WeeklyPK for weekly prize value.</li><li>BattlePK if you have good damage and consistency.</li><li>Lucky Number as extra income when luck helps.</li></ul><p>Check the official schedule and prepare consumables before entering. The player who arrives ready earns more than the player who improvises.</p>',
  '<p>Se você quer crescer sem depender apenas do market, precisa entrar nos eventos com melhor retorno de CPs e melhores recompensas pelo tempo investido.</p><h2>Eventos mais lucrativos</h2><ul><li>ClassPK por premiações de ranking.</li><li>WeeklyPK pelo valor semanal.</li><li>BattlePK se você tem bom dano e consistência.</li><li>Lucky Number como renda extra com sorte.</li></ul><p>Confira o horário oficial e prepare consumíveis antes de entrar. O jogador que chega pronto ganha mais do que o que improvisa.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'events')
),
(
  'guia-de-guild-war-y-war-flags',
  'Guía de Guild War y War Flags',
  'Guild War and War Flags guide',
  'Guia de Guild War e War Flags',
  '<p>Guild War y War Flags son eventos donde la organización pesa más que el daño individual. Una guild ordenada siempre rinde mejor que un grupo fuerte sin plan.</p><h2>Qué necesita una guild competitiva</h2><ul><li>Líderes claros por canal o grupo.</li><li>Jugadores asignados a ataque, defensa y soporte.</li><li>Inventario con potions, revives y teleports.</li></ul><p>La clave es controlar zonas y no regalar muertes. Practicar rutas de entrada y tiempos de respawn hace una gran diferencia.</p>',
  '<p>Guild War and War Flags reward organization more than raw individual damage. A disciplined guild consistently performs better than a strong but unstructured group.</p><h2>What a competitive guild needs</h2><ul><li>Clear leaders for each group or voice channel.</li><li>Players assigned to attack, defense, and support.</li><li>Inventories prepared with potions, revives, and teleports.</li></ul><p>The key is controlling areas and avoiding unnecessary deaths. Practicing entry routes and respawn timing creates a major advantage.</p>',
  '<p>Guild War e War Flags premiam mais a organização do que o dano individual. Uma guild disciplinada sempre rende melhor do que um grupo forte sem plano.</p><h2>O que uma guild competitiva precisa</h2><ul><li>Líderes claros para cada grupo ou canal.</li><li>Jogadores divididos entre ataque, defesa e suporte.</li><li>Inventário preparado com potions, revives e teleports.</li></ul><p>A chave é controlar áreas e evitar mortes desnecessárias. Treinar rotas de entrada e tempo de respawn cria grande vantagem.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'events')
),
(
  'quest-de-promocion-y-superman',
  'Quest de promoción y Superman',
  'Promotion quest and Superman guide',
  'Quest de promoção e Superman',
  '<p>Muchas clases dependen de completar sus promociones a tiempo para desbloquear daño, skills o rutas de progreso más eficientes. Superman también acelera mucho el farmeo cuando se usa bien.</p><h2>Recomendaciones</h2><ul><li>Haz promotion apenas cumplas requisitos.</li><li>Lee todos los pasos antes de moverte entre NPCs.</li><li>Guarda Superman para zonas con buen respawn y mobs compactos.</li></ul><p>El error común es activar Superman en mapas pobres o perder tiempo buscando NPCs sin revisar la quest completa.</p>',
  '<p>Many classes depend on finishing promotions on time to unlock damage, skills, or more efficient progression routes. Superman also speeds up farming dramatically when used correctly.</p><h2>Recommendations</h2><ul><li>Complete promotion as soon as you meet the requirements.</li><li>Read every step before moving between NPCs.</li><li>Save Superman for maps with dense respawn and compact monster packs.</li></ul><p>The common mistake is wasting Superman in weak maps or losing time while searching for NPCs without reading the full quest first.</p>',
  '<p>Muitas classes dependem de completar promoções no momento certo para liberar dano, skills ou rotas de progressão mais eficientes. Superman também acelera muito o farm quando usado corretamente.</p><h2>Recomendações</h2><ul><li>Faça a promotion assim que cumprir os requisitos.</li><li>Leia todas as etapas antes de sair entre NPCs.</li><li>Guarde Superman para mapas com respawn denso e mobs agrupados.</li></ul><p>O erro comum é desperdiçar Superman em mapas fracos ou perder tempo procurando NPCs sem ler a quest inteira antes.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'quests')
),
(
  'snow-banshee-ruta-y-recompensas',
  'Snow Banshee: ruta y recompensas',
  'Snow Banshee: route and rewards',
  'Snow Banshee: rota e recompensas',
  '<p>Snow Banshee es uno de los world bosses que más interés genera por su mezcla de dificultad, competencia y recompensa. Llegar tarde casi siempre significa pelear en desventaja.</p><h2>Preparación</h2><ul><li>Llega con antelación al mapa.</li><li>Ve en party o con apoyo de guild.</li><li>Lleva suficientes consumibles para aguantar presión de otros jugadores.</li></ul><h2>Consejo táctico</h2><p>No enfoques solo el boss. Controlar el área, visión del respawn y tiempos de entrada suele definir quién se lleva el kill o el loot.</p>',
  '<p>Snow Banshee is one of the most contested world bosses because of its difficulty, competition, and reward potential. Arriving late usually means fighting from a weaker position.</p><h2>Preparation</h2><ul><li>Reach the map early.</li><li>Go with a party or guild support.</li><li>Bring enough consumables to survive player pressure.</li></ul><h2>Tactical advice</h2><p>Do not focus only on the boss. Controlling the area, tracking the respawn, and timing your entry often decide who gets the kill or the loot.</p>',
  '<p>Snow Banshee é um dos world bosses mais disputados por causa da dificuldade, competição e potencial de recompensa. Chegar tarde normalmente significa lutar em desvantagem.</p><h2>Preparação</h2><ul><li>Chegue cedo ao mapa.</li><li>Vá em party ou com apoio da guild.</li><li>Leve consumíveis suficientes para resistir à pressão de outros jogadores.</li></ul><h2>Dica tática</h2><p>Não foque apenas no boss. Controlar a área, acompanhar o respawn e acertar o tempo de entrada normalmente decide quem fica com o kill ou o loot.</p>',
  'published',
  'both',
  (SELECT id FROM public.guide_categories WHERE slug = 'world-bosses')
)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------
-- Fix Categories
-- ----------------------------------------------------------------
INSERT INTO public.fix_categories (slug, name_es, name_en, name_pt, sort_order) VALUES
  ('stability', 'Estabilidad', 'Stability', 'Estabilidade', 1),
  ('events-balance', 'Balance de Eventos', 'Event Balance', 'Balanceamento de Eventos', 2),
  ('maps-npcs', 'Mapas y NPCs', 'Maps and NPCs', 'Mapas e NPCs', 3),
  ('skills-classes', 'Skills y Clases', 'Skills and Classes', 'Skills e Classes', 4),
  ('quality-of-life', 'Calidad de Vida', 'Quality of Life', 'Qualidade de Vida', 5)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------
-- Fixes
-- ----------------------------------------------------------------
DELETE FROM public.fixes
WHERE slug IN (
  'fix-crash-guild-map',
  'ajuste-recompensas-battlepk',
  'correccion-npcs-bird-island',
  'mejora-archer-fastblade',
  'optimizacion-inventario-y-loot'
);

INSERT INTO public.fixes (slug, title_es, title_en, title_pt, content_es, content_en, content_pt, status, version, category_id)
VALUES
(
  'fix-crash-guild-map',
  'Corrección de crash al entrar al Guild Map',
  'Fix: crash when entering Guild Map',
  'Correção de crash ao entrar no Guild Map',
  '<p>Se corrigió un cierre inesperado que ocurría al entrar al Guild Map con alta concurrencia. El problema estaba relacionado con carga de entidades y validación de acceso al mapa.</p><ul><li>Se estabilizó la carga inicial del mapa.</li><li>Se corrigió una validación que podía dejar personajes en estado inconsistente.</li><li>Se redujeron errores al reloguear después del crash.</li></ul>',
  '<p>An unexpected crash when entering Guild Map under heavy concurrency has been fixed. The issue was tied to entity loading and map access validation.</p><ul><li>Initial map loading is now more stable.</li><li>A validation path that could leave characters in an inconsistent state was corrected.</li><li>Relogging after the crash now fails far less often.</li></ul>',
  '<p>Foi corrigido um fechamento inesperado ao entrar no Guild Map com alta concorrência. O problema estava ligado ao carregamento de entidades e à validação de acesso ao mapa.</p><ul><li>O carregamento inicial do mapa ficou mais estável.</li><li>Uma validação que podia deixar personagens em estado inconsistente foi corrigida.</li><li>O relogin após o crash agora falha com muito menos frequência.</li></ul>',
  'published',
  'both',
  (SELECT id FROM public.fix_categories WHERE slug = 'stability')
),
(
  'ajuste-recompensas-battlepk',
  'Ajuste de recompensas en BattlePK',
  'BattlePK reward adjustment',
  'Ajuste de recompensas no BattlePK',
  '<p>Se ajustaron las recompensas de BattlePK para que la progresión sea más consistente entre rangos medios y altos.</p><ul><li>Los tramos intermedios ahora tienen mejor transición de premio.</li><li>Se corrigieron textos desactualizados en la interfaz.</li><li>Se revisó el cálculo final de recompensa para evitar diferencias entre anuncio y entrega.</li></ul>',
  '<p>BattlePK rewards were adjusted to make progression more consistent between mid and high brackets.</p><ul><li>Mid-tier reward ranges now transition more smoothly.</li><li>Outdated interface texts were corrected.</li><li>The final reward calculation was reviewed to avoid differences between the announcement and the delivered prize.</li></ul>',
  '<p>As recompensas do BattlePK foram ajustadas para deixar a progressão mais consistente entre faixas médias e altas.</p><ul><li>As faixas intermediárias agora têm transição melhor de premiação.</li><li>Textos desatualizados da interface foram corrigidos.</li><li>O cálculo final da recompensa foi revisado para evitar diferença entre anúncio e entrega.</li></ul>',
  'published',
  'both',
  (SELECT id FROM public.fix_categories WHERE slug = 'events-balance')
),
(
  'correccion-npcs-bird-island',
  'Corrección de NPCs y coordenadas en Bird Island',
  'Bird Island NPC and coordinate fix',
  'Correção de NPCs e coordenadas em Bird Island',
  '<p>Se corrigieron NPCs con diálogo incompleto y coordenadas erróneas en Bird Island.</p><ul><li>NPCs duplicados fueron removidos.</li><li>Se ajustaron teleports que apuntaban a casillas inválidas.</li><li>Algunas quests ahora muestran el texto correcto al avanzar.</li></ul>',
  '<p>NPCs with incomplete dialog and incorrect coordinates in Bird Island were fixed.</p><ul><li>Duplicated NPCs were removed.</li><li>Teleports pointing to invalid tiles were adjusted.</li><li>Several quests now display the correct text while progressing.</li></ul>',
  '<p>NPCs com diálogo incompleto e coordenadas incorretas em Bird Island foram corrigidos.</p><ul><li>NPCs duplicados foram removidos.</li><li>Teleports apontando para tiles inválidos foram ajustados.</li><li>Algumas quests agora exibem o texto correto ao avançar.</li></ul>',
  'published',
  'both',
  (SELECT id FROM public.fix_categories WHERE slug = 'maps-npcs')
),
(
  'mejora-archer-fastblade',
  'Mejora de skills y animaciones para clases',
  'Class skill and animation improvement',
  'Melhoria de skills e animações para classes',
  '<p>Se revisaron skills con comportamiento inconsistente en combate, especialmente interacciones entre animación y daño aplicado.</p><ul><li>Se corrigieron ventanas de animación que cancelaban daño visualmente.</li><li>Se estabilizó el disparo de skills en situaciones de alta latencia.</li><li>Se redujeron casos donde el objetivo no recibía feedback correcto del golpe.</li></ul>',
  '<p>Skills with inconsistent combat behavior were reviewed, especially interactions between animation timing and actual damage application.</p><ul><li>Animation windows that visually cancelled damage were fixed.</li><li>Skill triggering is now more stable under higher latency.</li><li>Cases where the target received incorrect hit feedback were reduced.</li></ul>',
  '<p>Skills com comportamento inconsistente em combate foram revisadas, especialmente interações entre o tempo da animação e a aplicação real do dano.</p><ul><li>Janelas de animação que visualmente cancelavam dano foram corrigidas.</li><li>O disparo de skills ficou mais estável em latência alta.</li><li>Casos em que o alvo recebia feedback incorreto do golpe foram reduzidos.</li></ul>',
  'published',
  'both',
  (SELECT id FROM public.fix_categories WHERE slug = 'skills-classes')
),
(
  'optimizacion-inventario-y-loot',
  'Optimización de inventario y recolección de loot',
  'Inventory and loot pickup optimization',
  'Otimização de inventário e coleta de loot',
  '<p>Se mejoró la respuesta del inventario en acciones repetidas y la consistencia al recoger loot en zonas concurridas.</p><ul><li>Se redujo el retraso entre pickup y reflejo visual en el inventario.</li><li>Ahora el servidor valida mejor espacios libres antes de confirmar el loot.</li><li>Se corrigieron casos donde ítems stackeables no actualizaban su cantidad al instante.</li></ul>',
  '<p>Inventory responsiveness during repeated actions and loot pickup consistency in crowded zones were improved.</p><ul><li>The delay between pickup and visual inventory update was reduced.</li><li>The server now validates free slots more reliably before confirming loot.</li><li>Cases where stackable items failed to update their quantity instantly were fixed.</li></ul>',
  '<p>A resposta do inventário em ações repetidas e a consistência ao coletar loot em áreas cheias foram melhoradas.</p><ul><li>O atraso entre pickup e atualização visual do inventário foi reduzido.</li><li>O servidor agora valida melhor espaços livres antes de confirmar o loot.</li><li>Casos em que itens empilháveis não atualizavam a quantidade instantaneamente foram corrigidos.</li></ul>',
  'published',
  'both',
  (SELECT id FROM public.fix_categories WHERE slug = 'quality-of-life')
)
ON CONFLICT (slug) DO NOTHING;
