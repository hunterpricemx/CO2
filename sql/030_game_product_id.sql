-- ============================================================
-- 030_game_product_id.sql
-- Adds the game-internal product ID (1-5) to donation_packages
-- so the payment flow can write the correct integer into
-- dbb_payments.product instead of the Supabase UUID.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.donation_packages
  ADD COLUMN IF NOT EXISTS game_product_id INT DEFAULT NULL;

COMMENT ON COLUMN public.donation_packages.game_product_id IS
  'Internal product ID used by the game server in dbb_payments.product (1=Starter, 2=Bronze, 3=Silver, 4=Gold, 5=Diamond). Must match the PHP productMapping.';
