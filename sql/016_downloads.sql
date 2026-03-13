-- 016_downloads.sql
-- Download entries per game version (clients + patch history)

CREATE TABLE IF NOT EXISTS public.downloads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version        text NOT NULL CHECK (version IN ('1.0','2.0')),
  type           text NOT NULL DEFAULT 'patch' CHECK (type IN ('client','patch')),
  patch_version  text,                -- e.g. "1.236" identifies the patch build
  release_date   date,
  name_es        text NOT NULL,
  name_en        text NOT NULL DEFAULT '',
  name_pt        text NOT NULL DEFAULT '',
  description_es text,
  description_en text,
  description_pt text,
  url            text NOT NULL DEFAULT '#',
  file_size      text,               -- e.g. "2.4 GB"
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS downloads_version_idx      ON public.downloads (version);

-- ── Migrate existing table: add new columns if missing ────────────────────────
-- (must run before indexes that reference these columns)
ALTER TABLE public.downloads
  ADD COLUMN IF NOT EXISTS type          text NOT NULL DEFAULT 'patch',
  ADD COLUMN IF NOT EXISTS patch_version text,
  ADD COLUMN IF NOT EXISTS release_date  date;

-- Add CHECK constraint separately (safe to re-run)
ALTER TABLE public.downloads
  DROP CONSTRAINT IF EXISTS downloads_type_check;
ALTER TABLE public.downloads
  ADD CONSTRAINT downloads_type_check CHECK (type IN ('client','patch'));

CREATE INDEX IF NOT EXISTS downloads_type_idx         ON public.downloads (type);
CREATE INDEX IF NOT EXISTS downloads_release_date_idx ON public.downloads (release_date DESC);

DROP TRIGGER IF EXISTS downloads_updated_at ON public.downloads;
CREATE TRIGGER downloads_updated_at
  BEFORE UPDATE ON public.downloads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "downloads: public read active" ON public.downloads;
CREATE POLICY "downloads: public read active"
  ON public.downloads FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "downloads: admin all" ON public.downloads;
CREATE POLICY "downloads: admin all"
  ON public.downloads FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Seed: clients ─────────────────────────────────────────────────────────────
INSERT INTO public.downloads
  (version, type, patch_version, release_date, name_es, name_en, name_pt,
   description_es, description_en, description_pt, url, file_size, sort_order)
VALUES
  ('1.0', 'client', '1.0', '2024-01-15',
   'Cliente Completo Conquer 1.0',
   'Conquer 1.0 Full Client',
   'Cliente Completo Conquer 1.0',
   'Instalación completa del servidor Conquer 1.0. Incluye todos los archivos necesarios para jugar.',
   'Full installation for the Conquer 1.0 server. Includes all files needed to play.',
   'Instalação completa do servidor Conquer 1.0. Inclui todos os arquivos necessários para jogar.',
   '#', '~2.4 GB', 0),

  ('2.0', 'client', '2.0', '2024-06-01',
   'Cliente Completo Conquer 2.0',
   'Conquer 2.0 Full Client',
   'Cliente Completo Conquer 2.0',
   'Instalación completa del servidor Conquer 2.0. Incluye todos los archivos necesarios para jugar.',
   'Full installation for the Conquer 2.0 server. Includes all files needed to play.',
   'Instalação completa do servidor Conquer 2.0. Inclui todos os arquivos necessários para jogar.',
   '#', '~3.1 GB', 0)
ON CONFLICT DO NOTHING;

-- ── Seed: patch history v1.0 ──────────────────────────────────────────────────
INSERT INTO public.downloads
  (version, type, patch_version, release_date, name_es, name_en, name_pt,
   description_es, description_en, description_pt, url, file_size, sort_order)
VALUES
  ('1.0', 'patch', '1.236', '2026-03-10',
   'Parche 1.236 - Correcciones y Mejoras',
   'Patch 1.236 - Fixes and Improvements',
   'Patch 1.236 - Correções e Melhorias',
   'Corrección de errores en el sistema de GuildWar. Mejoras de rendimiento en zonas PvP.',
   'Fixed bugs in the GuildWar system. Performance improvements in PvP zones.',
   'Correção de bugs no sistema GuildWar. Melhorias de desempenho em zonas PvP.',
   '#', '145 MB', 10),

  ('1.0', 'patch', '1.235', '2026-02-20',
   'Parche 1.235 - Nuevo Evento Boss',
   'Patch 1.235 - New Boss Event',
   'Patch 1.235 - Novo Evento Boss',
   'Añade el nuevo evento Boss Mensual. Ajuste de balanceo en clases Archer y Warrior.',
   'Adds the new Monthly Boss event. Balance adjustments for Archer and Warrior classes.',
   'Adiciona o novo evento Boss Mensal. Ajustes de balanceamento nas classes Archer e Warrior.',
   '#', '98 MB', 20),

  ('1.0', 'patch', '1.234', '2026-01-30',
   'Parche 1.234 - Mantenimiento General',
   'Patch 1.234 - General Maintenance',
   'Patch 1.234 - Manutenção Geral',
   'Mantenimiento general del servidor. Optimización de base de datos y corrección de drops.',
   'General server maintenance. Database optimization and drop rate fixes.',
   'Manutenção geral do servidor. Otimização de banco de dados e correção de drops.',
   '#', '62 MB', 30),

  ('1.0', 'patch', '1.233', '2025-12-15',
   'Parche 1.233 - Evento Navidad',
   'Patch 1.233 - Christmas Event',
   'Patch 1.233 - Evento Natal',
   'Evento de Navidad activado: NPC especial, drops exclusivos y misiones navideñas.',
   'Christmas event activated: special NPC, exclusive drops, and holiday quests.',
   'Evento de Natal ativado: NPC especial, drops exclusivos e missões natalinas.',
   '#', '210 MB', 40),

  ('1.0', 'patch', '1.232', '2025-11-10',
   'Parche 1.232 - Nuevo Mapa: Cavernas Oscuras',
   'Patch 1.232 - New Map: Dark Caverns',
   'Patch 1.232 - Novo Mapa: Cavernas Sombrias',
   'Introduce el nuevo mapa Cavernas Oscuras con monstruos de nivel 90-110 y drops exclusivos.',
   'Introduces the new Dark Caverns map with level 90-110 monsters and exclusive drops.',
   'Apresenta o novo mapa Cavernas Sombrias com monstros de nível 90-110 e drops exclusivos.',
   '#', '380 MB', 50)
ON CONFLICT DO NOTHING;

-- ── Seed: patch history v2.0 ──────────────────────────────────────────────────
INSERT INTO public.downloads
  (version, type, patch_version, release_date, name_es, name_en, name_pt,
   description_es, description_en, description_pt, url, file_size, sort_order)
VALUES
  ('2.0', 'patch', '2.89', '2026-03-08',
   'Parche 2.89 - Mejoras UI y Correcciones',
   'Patch 2.89 - UI Improvements and Fixes',
   'Patch 2.89 - Melhorias de UI e Correções',
   'Mejoras en la interfaz de usuario. Corrección del bug en el sistema de Subidas de Nivel.',
   'User interface improvements. Fixed a bug in the Level-Up system.',
   'Melhorias na interface do usuário. Correção do bug no sistema de Subida de Nível.',
   '#', '178 MB', 10),

  ('2.0', 'patch', '2.88', '2026-02-14',
   'Parche 2.88 - San Valentín + Balance',
   'Patch 2.88 - Valentine''s Day + Balance',
   'Patch 2.88 - Dia dos Namorados + Balanceamento',
   'Evento San Valentín activado. Rebalanceo general de habilidades PvE.',
   'Valentine''s Day event activated. General PvE skill rebalance.',
   'Evento Dia dos Namorados ativado. Rebalanceamento geral de habilidades PvE.',
   '#', '134 MB', 20),

  ('2.0', 'patch', '2.87', '2026-01-20',
   'Parche 2.87 - Dungeon de Año Nuevo',
   'Patch 2.87 - New Year Dungeon',
   'Patch 2.87 - Dungeon Ano Novo',
   'Nueva dungeon temporal de Año Nuevo. Corrección de errores en el chat global.',
   'New temporary New Year dungeon. Fixed bugs in global chat.',
   'Nova dungeon temporária de Ano Novo. Correção de bugs no chat global.',
   '#', '290 MB', 30),

  ('2.0', 'patch', '2.86', '2025-12-20',
   'Parche 2.86 - Temporada Invierno',
   'Patch 2.86 - Winter Season',
   'Patch 2.86 - Temporada Inverno',
   'Contenido de temporada de invierno. Nuevos sets de equipo y monturas exclusivas.',
   'Winter season content. New equipment sets and exclusive mounts.',
   'Conteúdo da temporada de inverno. Novos sets de equipamento e montarias exclusivas.',
   '#', '445 MB', 40),

  ('2.0', 'patch', '2.85', '2025-11-05',
   'Parche 2.85 - Sistema de Gremios 2.0',
   'Patch 2.85 - Guild System 2.0',
   'Patch 2.85 - Sistema de Guilda 2.0',
   'Renovación completa del sistema de gremios. Nuevas guerras de gremios y ranking.',
   'Complete overhaul of the guild system. New guild wars and ranking system.',
   'Renovação completa do sistema de guilda. Novas guerras de guilda e ranking.',
   '#', '520 MB', 50)
ON CONFLICT DO NOTHING;
