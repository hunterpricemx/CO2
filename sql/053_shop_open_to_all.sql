-- 053_shop_open_to_all.sql
-- Toggle por versión para abrir el market a TODOS los jugadores logueados,
-- bypasseando la whitelist beta (shop_buyer_whitelist).
--
-- Reglas:
--   - shop_open_to_all_v1=true → cualquier sesión válida en /1.0/market puede comprar.
--   - shop_open_to_all_v1=false → solo usernames en shop_buyer_whitelist (modo beta).
--   - Análogo para v2.
--   - El kill switch global sigue siendo shop_enabled_v1 / shop_enabled_v2:
--     si esos están en false, NADIE puede comprar (ni whitelisted ni open-to-all).

ALTER TABLE server_config
  ADD COLUMN IF NOT EXISTS shop_open_to_all_v1 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shop_open_to_all_v2 boolean DEFAULT false;
