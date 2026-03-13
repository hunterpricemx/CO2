-- ============================================================
-- 014_admin_panel_permissions.sql
-- Adds per-panel admin permissions to public.profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS panel_permissions JSONB
  NOT NULL DEFAULT '{"events": false, "guides": false, "fixes": false, "donations": false, "users": false, "gameServer": false}'::jsonb;

UPDATE public.profiles
SET panel_permissions = '{"events": true, "guides": true, "fixes": true, "donations": true, "users": true, "gameServer": true}'::jsonb
WHERE role = 'admin'
  AND (
    panel_permissions IS NULL
    OR panel_permissions = '{}'::jsonb
    OR panel_permissions = '{"events": false, "guides": false, "fixes": false, "donations": false, "users": false, "gameServer": false}'::jsonb
  );

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