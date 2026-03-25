-- ============================================================
-- 040_seo_settings.sql
-- Agrega claves SEO globales y por página a site_settings.
-- ============================================================

INSERT INTO public.site_settings (key, value) VALUES
  ('seo_site_name',           'Conquer Classic Plus'),
  ('seo_default_description', 'Revive la leyenda en el mejor servidor privado de Conquer Online. Classic 1.0 y Experience 2.0 — combate épico, comunidad activa y eventos exclusivos. ¡Juega gratis!'),
  ('seo_og_image',            ''),
  ('seo_pages', '{
  "home": {
    "title": "Inicio",
    "description": "Bienvenido a Conquer Classic Plus, el servidor privado de Conquer Online más auténtico. Elige entre Classic 1.0 y Experience 2.0, juega gratis y forma parte de la comunidad."
  },
  "guides": {
    "title": "Guías",
    "description": "Guías completas para dominar Conquer Classic Plus. Aprende sobre clases, equipamiento, skills, composición de ítems y las mecánicas de Classic 1.0 y Experience 2.0."
  },
  "fixes": {
    "title": "Fixes y Parches",
    "description": "Historial oficial de correcciones, parches y mejoras aplicadas al servidor. Mantente al día con cada actualización y balance de Conquer Classic Plus."
  },
  "events": {
    "title": "Eventos",
    "description": "Participa en los eventos exclusivos de Conquer Classic Plus: torneos, competencias PvP, recompensas por temporada y mucho más. ¡No te pierdas ninguno!"
  },
  "news": {
    "title": "Noticias",
    "description": "Últimas noticias, anuncios oficiales y actualizaciones del servidor Conquer Classic Plus. Sé el primero en enterarte de novedades, mantenimientos y lanzamientos."
  },
  "market": {
    "title": "Mercado",
    "description": "Explora el mercado jugador de Conquer Classic Plus. Compra y vende equipamiento, armas, armaduras y consumibles con otros jugadores en tiempo real."
  },
  "rankings": {
    "title": "Rankings",
    "description": "Consulta el ranking oficial de Conquer Classic Plus. Los guerreros, gremios y jugadores más poderosos del servidor ordenados por nivel, fuerza y méritos."
  },
  "downloads": {
    "title": "Descargas",
    "description": "Descarga el cliente oficial de Conquer Classic Plus y comienza a jugar gratis en minutos. Disponible para Classic 1.0 y Experience 2.0. Instalación sencilla y rápida."
  },
  "donate": {
    "title": "Donar",
    "description": "Apoya el servidor con una donación y obtén bonificaciones exclusivas. Tu contribución mantiene Conquer Classic Plus activo y en constante mejora."
  },
  "vip": {
    "title": "VIP",
    "description": "Hazte VIP en Conquer Classic Plus y disfruta de ventajas exclusivas: experiencia aumentada, drops mejorados y soporte prioritario. Lleva tu personaje al siguiente nivel."
  },
  "influencers": {
    "title": "Influencers",
    "description": "Únete al programa oficial de influencers de Conquer Classic Plus. Crea contenido, consigue recompensas únicas y crece junto a una comunidad apasionada."
  },
  "compose": {
    "title": "Calculadora de Compose",
    "description": "Calcula el costo exacto de componer y mejorar tus ítems en Conquer Classic Plus. Herramienta gratuita para Classic 1.0 y Experience 2.0 con precios del mercado en vivo."
  }
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
