-- ============================================================
-- 025_influencers_seed.sql
-- Seed data: influencers / streamers de la comunidad
-- ============================================================

INSERT INTO public.influencers (
  name, slug, photo_url,
  description_es, description_en, description_pt,
  streamer_code,
  facebook_url, instagram_url, tiktok_url, youtube_url, twitch_url,
  is_active, sort_order
) VALUES

-- 1. ElDragonConquistador
(
  'ElDragonConquistador',
  'el-dragon-conquistador',
  NULL,
  'Veterano de Conquer desde 2004. Streams diarios de PvP, guías de build y eventos del servidor. ¡La comunidad más activa en Twitch!',
  'Conquer veteran since 2004. Daily PvP streams, build guides and server events. The most active community on Twitch!',
  'Veterano do Conquer desde 2004. Streams diários de PvP, guias de build e eventos do servidor. A comunidade mais ativa no Twitch!',
  'DRAGON10',
  'https://facebook.com/eldragonconquistador',
  'https://instagram.com/eldragonconquistador',
  'https://tiktok.com/@eldragonconquistador',
  'https://youtube.com/@eldragonconquistador',
  'https://twitch.tv/eldragonconquistador',
  TRUE, 1
),

-- 2. QueenArcher
(
  'QueenArcher',
  'queen-archer',
  NULL,
  'Especialista en Archer. Contenido enfocado en PK, estrategia y los mejores drops del servidor. Streams los fines de semana.',
  'Archer specialist. Content focused on PK, strategy and the best server drops. Streams on weekends.',
  'Especialista em Archer. Conteúdo focado em PK, estratégia e os melhores drops do servidor. Streams nos fins de semana.',
  'QUEEN20',
  NULL,
  'https://instagram.com/queenarcherco',
  'https://tiktok.com/@queenarcherco',
  'https://youtube.com/@queenarcherco',
  NULL,
  TRUE, 2
),

-- 3. TaoMasterXL
(
  'TaoMasterXL',
  'tao-master-xl',
  NULL,
  'El mejor Taoist de Conquer Classic Plus. Tutoriales, guías de leveling y transmisiones en vivo de eventos especiales.',
  'The best Taoist in Conquer Classic Plus. Tutorials, leveling guides and live broadcasts of special events.',
  'O melhor Taoist do Conquer Classic Plus. Tutoriais, guias de leveling e transmissões ao vivo de eventos especiais.',
  'TAO30',
  'https://facebook.com/taomasterxl',
  'https://instagram.com/taomasterxl',
  NULL,
  'https://youtube.com/@taomasterxl',
  'https://twitch.tv/taomasterxl',
  TRUE, 3
),

-- 4. ShadowWarrior
(
  'ShadowWarrior',
  'shadow-warrior',
  NULL,
  'Warrior de élite. Conocido por sus increíbles rachas en Guild War y sus guías de equipamiento definitivo.',
  'Elite Warrior. Known for his incredible Guild War streaks and ultimate gear guides.',
  'Warrior de elite. Conhecido por suas incríveis sequências na Guild War e suas guias de equipamento definitivo.',
  'SHADOW40',
  NULL,
  'https://instagram.com/shadowwarriorco',
  'https://tiktok.com/@shadowwarriorco',
  NULL,
  'https://twitch.tv/shadowwarriorco',
  TRUE, 4
),

-- 5. CelestialTrojan
(
  'CelestialTrojan',
  'celestial-trojan',
  NULL,
  'Trojan con más de 10 años de experiencia. Streams de madrugada, SkillTeamPK y análisis de builds competitivos.',
  'Trojan with over 10 years of experience. Late night streams, SkillTeamPK and competitive build analysis.',
  'Trojan com mais de 10 anos de experiência. Streams de madrugada, SkillTeamPK e análise de builds competitivos.',
  'CELESTIAL50',
  'https://facebook.com/celestialtrojan',
  NULL,
  'https://tiktok.com/@celestialtrojan',
  'https://youtube.com/@celestialtrojan',
  NULL,
  TRUE, 5
),

-- 6. NinjaBladeX
(
  'NinjaBladeX',
  'ninja-blade-x',
  NULL,
  'Creador de contenido especializado en Conquer. Reviews de servers, comparativas de versiones y streams de PvP competitivo.',
  'Content creator specialized in Conquer. Server reviews, version comparisons and competitive PvP streams.',
  'Criador de conteúdo especializado em Conquer. Reviews de servidores, comparações de versões e streams de PvP competitivo.',
  'NINJA60',
  'https://facebook.com/ninjabladex',
  'https://instagram.com/ninjabladex',
  'https://tiktok.com/@ninjabladex',
  'https://youtube.com/@ninjabladex',
  'https://twitch.tv/ninjabladex',
  TRUE, 6
)

ON CONFLICT (slug) DO UPDATE SET
  name            = EXCLUDED.name,
  description_es  = EXCLUDED.description_es,
  description_en  = EXCLUDED.description_en,
  description_pt  = EXCLUDED.description_pt,
  streamer_code   = EXCLUDED.streamer_code,
  facebook_url    = EXCLUDED.facebook_url,
  instagram_url   = EXCLUDED.instagram_url,
  tiktok_url      = EXCLUDED.tiktok_url,
  youtube_url     = EXCLUDED.youtube_url,
  twitch_url      = EXCLUDED.twitch_url,
  is_active       = EXCLUDED.is_active,
  sort_order      = EXCLUDED.sort_order,
  updated_at      = NOW();
