-- 015_news.sql
-- News categories + news posts (shared across versions, multilingual)

-- ── News Categories ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.news_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name_es    text NOT NULL,
  name_en    text NOT NULL,
  name_pt    text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── News Posts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.news_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  category_id  uuid REFERENCES public.news_categories(id) ON DELETE SET NULL,
  title_es     text NOT NULL,
  title_en     text NOT NULL DEFAULT '',
  title_pt     text NOT NULL DEFAULT '',
  summary_es   text,
  summary_en   text,
  summary_pt   text,
  content_es   text,
  content_en   text,
  content_pt   text,
  featured_image text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_posts_status_idx      ON public.news_posts (status);
CREATE INDEX IF NOT EXISTS news_posts_category_idx    ON public.news_posts (category_id);
CREATE INDEX IF NOT EXISTS news_posts_published_at_idx ON public.news_posts (published_at DESC);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_posts_updated_at ON public.news_posts;
CREATE TRIGGER news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_categories: public read" ON public.news_categories;
CREATE POLICY "news_categories: public read"
  ON public.news_categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "news_categories: admin all" ON public.news_categories;
CREATE POLICY "news_categories: admin all"
  ON public.news_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "news_posts: public read published" ON public.news_posts;
CREATE POLICY "news_posts: public read published"
  ON public.news_posts FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "news_posts: admin all" ON public.news_posts;
CREATE POLICY "news_posts: admin all"
  ON public.news_posts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Seed: default categories ──────────────────────────────────────────────────
INSERT INTO public.news_categories (slug, name_es, name_en, name_pt, sort_order) VALUES
  ('updates',    'Actualizaciones', 'Updates',    'Atualizações', 0),
  ('events',     'Eventos',         'Events',     'Eventos',      1),
  ('maintenance','Mantenimiento',   'Maintenance','Manutenção',   2),
  ('community',  'Comunidad',       'Community',  'Comunidade',   3)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed: news posts ──────────────────────────────────────────────────────────
INSERT INTO public.news_posts
  (slug, category_id, title_es, title_en, title_pt,
   summary_es, summary_en, summary_pt,
   content_es, content_en, content_pt,
   status, published_at)
SELECT
  'parche-1236-correcciones-y-mejoras', nc.id,
  'Parche 1.236 - Correcciones y Mejoras',
  'Patch 1.236 - Fixes and Improvements',
  'Patch 1.236 - Correções e Melhorias',
  'Hemos lanzado el parche 1.236 con correcciones importantes en GuildWar y mejoras de rendimiento.',
  'We have released patch 1.236 with important GuildWar fixes and performance improvements.',
  'Lançamos o patch 1.236 com correções importantes no GuildWar e melhorias de desempenho.',
  '<p>El parche 1.236 está disponible. Principales cambios:</p><ul><li>Corrección de errores críticos en el sistema de <strong>GuildWar</strong></li><li>Mejoras de rendimiento en zonas PvP de alta concurrencia</li><li>Corrección de drops incorrectos en monstruos nivel 100+</li><li>Estabilidad mejorada en el servidor en horario pico</li></ul>',
  '<p>Patch 1.236 is now available. Key changes:</p><ul><li>Fixed critical bugs in the <strong>GuildWar</strong> system</li><li>Performance improvements in high-concurrency PvP zones</li><li>Fixed incorrect drop rates on level 100+ monsters</li><li>Improved server stability during peak hours</li></ul>',
  '<p>O patch 1.236 está disponível. Principais mudanças:</p><ul><li>Correção de bugs críticos no sistema de <strong>GuildWar</strong></li><li>Melhorias de desempenho em zonas PvP de alta concorrência</li><li>Correção de drops incorretos em monstros nível 100+</li><li>Estabilidade do servidor melhorada nos horários de pico</li></ul>',
  'published', '2026-03-10 12:00:00+00'
FROM public.news_categories nc WHERE nc.slug = 'updates'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.news_posts
  (slug, category_id, title_es, title_en, title_pt,
   summary_es, summary_en, summary_pt,
   content_es, content_en, content_pt,
   status, published_at)
SELECT
  'nuevo-evento-boss-mensual-marzo-2026', nc.id,
  'Nuevo Evento: Boss Mensual - Marzo 2026',
  'New Event: Monthly Boss - March 2026',
  'Novo Evento: Boss Mensal - Março 2026',
  'El Boss Mensual de marzo regresa con recompensas exclusivas. ¡Forma tu equipo y derrótalo!',
  'The March Monthly Boss returns with exclusive rewards. Form your team and defeat it!',
  'O Boss Mensal de março retorna com recompensas exclusivas. Forme seu time e derrote-o!',
  '<p>El <strong>Boss Mensual</strong> de marzo estará activo del <strong>15 al 31 de marzo</strong>. Reúne a tu grupo y enfrenta al legendario Dragón Oscuro en las Cavernas Prohibidas.</p><h3>Recompensas</h3><ul><li>Equipo exclusivo nivel 110</li><li>Montura especial "Dragón de Fuego" (primeros 10 grupos)</li><li>Medallas de temporada y puntos de ranking</li></ul><h3>Requisitos</h3><ul><li>Nivel mínimo: 90</li><li>Grupo de 5 jugadores</li></ul>',
  '<p>The <strong>Monthly Boss</strong> for March will be active from <strong>March 15 to 31</strong>. Gather your group and face the legendary Dark Dragon in the Forbidden Caverns.</p><h3>Rewards</h3><ul><li>Exclusive level 110 equipment</li><li>Special mount "Fire Dragon" (first 10 groups)</li><li>Season medals and ranking points</li></ul><h3>Requirements</h3><ul><li>Minimum level: 90</li><li>Group of 5 players</li></ul>',
  '<p>O <strong>Boss Mensal</strong> de março estará ativo de <strong>15 a 31 de março</strong>. Reúna seu grupo e enfrente o lendário Dragão das Trevas nas Cavernas Proibidas.</p><h3>Recompensas</h3><ul><li>Equipamento exclusivo nível 110</li><li>Montaria especial "Dragão de Fogo" (primeiros 10 grupos)</li><li>Medalhas de temporada e pontos de ranking</li></ul><h3>Requisitos</h3><ul><li>Nível mínimo: 90</li><li>Grupo de 5 jogadores</li></ul>',
  'published', '2026-03-08 10:00:00+00'
FROM public.news_categories nc WHERE nc.slug = 'events'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.news_posts
  (slug, category_id, title_es, title_en, title_pt,
   summary_es, summary_en, summary_pt,
   content_es, content_en, content_pt,
   status, published_at)
SELECT
  'mantenimiento-programado-14-marzo-2026', nc.id,
  'Mantenimiento Programado - 14 de Marzo',
  'Scheduled Maintenance - March 14th',
  'Manutenção Programada - 14 de Março',
  'El servidor estará en mantenimiento el 14 de marzo de 03:00 a 06:00 (UTC-5).',
  'The server will be under maintenance on March 14th from 03:00 to 06:00 (UTC-5).',
  'O servidor estará em manutenção no dia 14 de março das 03:00 às 06:00 (UTC-5).',
  '<p>El servidor estará <strong>fuera de línea</strong> el <strong>14 de marzo de 2026</strong> para mantenimiento.</p><h3>¿Qué se hará?</h3><ul><li>Optimización de base de datos</li><li>Aplicación del parche 1.236</li><li>Revisión de logs de seguridad</li><li>Actualización de configuración del servidor</li></ul><p>El servidor estará disponible nuevamente a las 06:00 (UTC-5).</p>',
  '<p>The server will be <strong>offline</strong> on <strong>March 14, 2026</strong> for maintenance.</p><h3>What will be done?</h3><ul><li>Database optimization</li><li>Applying patch 1.236</li><li>Security log review</li><li>Server configuration update</li></ul><p>The server will be available again at 06:00 (UTC-5).</p>',
  '<p>O servidor estará <strong>offline</strong> no dia <strong>14 de março de 2026</strong> para manutenção.</p><h3>O que será feito?</h3><ul><li>Otimização de banco de dados</li><li>Aplicação do patch 1.236</li><li>Revisão de logs de segurança</li><li>Atualização de configuração do servidor</li></ul><p>O servidor estará disponível novamente às 06:00 (UTC-5).</p>',
  'published', '2026-03-05 09:00:00+00'
FROM public.news_categories nc WHERE nc.slug = 'maintenance'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.news_posts
  (slug, category_id, title_es, title_en, title_pt,
   summary_es, summary_en, summary_pt,
   content_es, content_en, content_pt,
   status, published_at)
SELECT
  'torneo-pvp-febrero-2026-resultados', nc.id,
  'Resultados: Torneo PvP Febrero 2026',
  'Results: February 2026 PvP Tournament',
  'Resultados: Torneio PvP Fevereiro 2026',
  '¡El Torneo PvP de Febrero concluyó! Conoce a los ganadores y las recompensas entregadas.',
  'The February PvP Tournament has concluded! Meet the winners and delivered rewards.',
  'O Torneio PvP de Fevereiro foi concluído! Conheça os vencedores e as recompensas entregues.',
  '<p>El <strong>Torneo PvP de Febrero 2026</strong> finalizó con gran éxito. Más de 200 jugadores participaron.</p><h3>Ganadores</h3><ol><li><strong>ShadowKnight_X</strong> — Campeón absoluto</li><li><strong>FireArcher99</strong> — Segundo lugar</li><li><strong>IronWarrior</strong> — Tercer lugar</li></ol><h3>Recompensas</h3><ul><li>1er lugar: Título exclusivo + Arma +12 + 10.000 monedas</li><li>2do lugar: Título + Arma +10 + 5.000 monedas</li><li>3er lugar: Título + 2.000 monedas</li></ul><p>¡El próximo torneo será en abril. Prepárense!</p>',
  '<p>The <strong>February 2026 PvP Tournament</strong> concluded with great success. Over 200 players participated.</p><h3>Winners</h3><ol><li><strong>ShadowKnight_X</strong> — Absolute Champion</li><li><strong>FireArcher99</strong> — Second place</li><li><strong>IronWarrior</strong> — Third place</li></ol><h3>Rewards</h3><ul><li>1st place: Exclusive title + +12 Weapon + 10,000 coins</li><li>2nd place: Title + +10 Weapon + 5,000 coins</li><li>3rd place: Title + 2,000 coins</li></ul><p>The next tournament will be in April. Get ready!</p>',
  '<p>O <strong>Torneio PvP de Fevereiro 2026</strong> foi concluído com grande sucesso. Mais de 200 jogadores participaram.</p><h3>Vencedores</h3><ol><li><strong>ShadowKnight_X</strong> — Campeão absoluto</li><li><strong>FireArcher99</strong> — Segundo lugar</li><li><strong>IronWarrior</strong> — Terceiro lugar</li></ol><h3>Recompensas</h3><ul><li>1º lugar: Título exclusivo + Arma +12 + 10.000 moedas</li><li>2º lugar: Título + Arma +10 + 5.000 moedas</li><li>3º lugar: Título + 2.000 moedas</li></ul><p>O próximo torneio será em abril. Preparem-se!</p>',
  'published', '2026-02-28 16:00:00+00'
FROM public.news_categories nc WHERE nc.slug = 'community'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.news_posts
  (slug, category_id, title_es, title_en, title_pt,
   summary_es, summary_en, summary_pt,
   content_es, content_en, content_pt,
   status, published_at)
SELECT
  'bienvenida-servidor-conquer-online', nc.id,
  '¡Bienvenidos al servidor Conquer Online!',
  'Welcome to the Conquer Online server!',
  'Bem-vindos ao servidor Conquer Online!',
  'El servidor está oficialmente abierto. Conoce todo lo que tenemos preparado para ti.',
  'The server is officially open. Find out everything we have prepared for you.',
  'O servidor está oficialmente aberto. Conheça tudo o que preparamos para você.',
  '<p>¡Estamos muy emocionados de anunciar que el servidor <strong>Conquer Online</strong> está oficialmente en línea!</p><h3>¿Qué nos diferencia?</h3><ul><li>Versiones <strong>1.0 y 2.0</strong> disponibles simultáneamente</li><li>Eventos regulares cada semana</li><li>Sistema de ranking activo</li><li>Staff disponible 24/7</li><li>Comunidad activa en Discord</li></ul><p>¡Únete ahora y comienza tu aventura. Todos los jugadores nuevos reciben un <strong>pack de bienvenida</strong> con objetos exclusivos!</p>',
  '<p>We are excited to announce that the <strong>Conquer Online</strong> server is officially online!</p><h3>What sets us apart?</h3><ul><li>Versions <strong>1.0 and 2.0</strong> available simultaneously</li><li>Regular weekly events</li><li>Active ranking system</li><li>Staff available 24/7</li><li>Active community on Discord</li></ul><p>Join now and start your adventure. All new players receive a <strong>welcome pack</strong> with exclusive items!</p>',
  '<p>Estamos animados em anunciar que o servidor <strong>Conquer Online</strong> está oficialmente online!</p><h3>O que nos diferencia?</h3><ul><li>Versões <strong>1.0 e 2.0</strong> disponíveis simultaneamente</li><li>Eventos regulares toda semana</li><li>Sistema de ranking ativo</li><li>Staff disponível 24/7</li><li>Comunidade ativa no Discord</li></ul><p>Junte-se agora. Todos os novos jogadores recebem um <strong>pack de boas-vindas</strong> com itens exclusivos!</p>',
  'published', '2024-01-10 08:00:00+00'
FROM public.news_categories nc WHERE nc.slug = 'community'
ON CONFLICT (slug) DO NOTHING;
