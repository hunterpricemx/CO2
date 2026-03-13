-- ============================================================
-- 027_script_injection.sql
-- Agrega las claves para scripts personalizados (analytics, pixels, etc.)
-- ============================================================

INSERT INTO public.site_settings (key, value) VALUES
  ('script_head',   ''),
  ('script_footer', '')
ON CONFLICT (key) DO NOTHING;
