-- ============================================================
-- 029_influencers_character_photo.sql
-- Add character_photo_url column to influencers table
-- Run this in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS character_photo_url TEXT DEFAULT NULL;
