-- ============================================================
-- 010_create_admin.sql
-- Promote an existing Supabase Dashboard user to admin safely.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ----------------------------------------------------------------
-- Step 1: Fix handle_new_user trigger (fault-tolerant)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- Step 2: Promote existing user to admin and sync profile
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_email TEXT := 'hunterpricemx@gmail.com';
  v_username TEXT := 'mariano';
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = v_email;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User % does not exist in auth.users. Create it from Supabase Dashboard first.', v_email;
  END IF;

  -- Keep auth metadata aligned with admin checks in proxy.ts.
  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'admin', 'username', v_username)
  WHERE id = v_uid;

  -- If another user already owns the desired username, free it.
  UPDATE public.profiles
  SET username = username || '_' || substring(id::text, 1, 6)
  WHERE username = v_username
    AND id <> v_uid;

  -- Ensure profile exists and is admin.
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (v_uid, v_username, v_email, 'admin'::user_role)
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      role = 'admin'::user_role,
      username = EXCLUDED.username;
END $$;

-- ----------------------------------------------------------------
-- Verify
-- ----------------------------------------------------------------
SELECT
  u.email,
  u.email_confirmed_at,
  u.raw_user_meta_data->>'role' AS auth_role,
  p.username,
  p.role AS profile_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'hunterpricemx@gmail.com';
