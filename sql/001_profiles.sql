-- ============================================================
-- 001_profiles.sql
-- User profiles linked to Supabase Auth (auth.users)
--
-- Run this first. The profiles table extends auth.users with
-- game-specific fields and role information.
-- ============================================================

-- Create the enum types first
CREATE TYPE public.game_version   AS ENUM ('1.0', '2.0', 'both');
CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.user_role      AS ENUM ('admin', 'player');
CREATE TYPE public.donation_status AS ENUM ('pending', 'completed', 'refunded');
CREATE TYPE public.ranking_type   AS ENUM ('pk', 'ko');

-- Profiles table
CREATE TABLE public.profiles (
  id              UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT          NOT NULL UNIQUE,
  email           TEXT          NOT NULL,
  role            user_role     NOT NULL DEFAULT 'player',
  panel_permissions JSONB       NOT NULL DEFAULT '{"events": false, "guides": false, "fixes": false, "donations": false, "users": false, "gameServer": false}'::jsonb,
  in_game_name    TEXT,
  version         game_version  DEFAULT '1.0',
  banned          BOOLEAN       NOT NULL DEFAULT FALSE,
  ban_reason      TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for fast username lookups
CREATE INDEX profiles_username_idx ON public.profiles (username);
CREATE INDEX profiles_role_idx     ON public.profiles (role);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically create a profile when a new auth user is created.
-- The role and username are read from user_metadata (set during signUp).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role, panel_permissions)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player'),
    COALESCE(
      (NEW.raw_user_meta_data->'panel_permissions')::jsonb,
      CASE
        WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'player') = 'admin'
          THEN '{"events": true, "guides": true, "fixes": true, "donations": true, "users": true, "gameServer": true}'::jsonb
        ELSE '{"events": false, "guides": false, "fixes": false, "donations": false, "users": false, "gameServer": false}'::jsonb
      END
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
