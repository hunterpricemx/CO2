-- 043_rename_accsory_to_accesory.sql
-- Normaliza typo historico: accsory -> accesory.

DO $$
BEGIN
  IF to_regclass('public.accsory') IS NOT NULL AND to_regclass('public.accesory') IS NULL THEN
    ALTER TABLE public.accsory RENAME TO accesory;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.accsory_active_sort_idx') IS NOT NULL
     AND to_regclass('public.accesory_active_sort_idx') IS NULL THEN
    ALTER INDEX public.accsory_active_sort_idx RENAME TO accesory_active_sort_idx;
  END IF;
  IF to_regclass('public.accsory_reserved_idx') IS NOT NULL
     AND to_regclass('public.accesory_reserved_idx') IS NULL THEN
    ALTER INDEX public.accsory_reserved_idx RENAME TO accesory_reserved_idx;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accsory_select_active')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accesory_select_active') THEN
    ALTER POLICY accsory_select_active ON public.accesory RENAME TO accesory_select_active;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accsory_insert_admin')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accesory_insert_admin') THEN
    ALTER POLICY accsory_insert_admin ON public.accesory RENAME TO accesory_insert_admin;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accsory_update_admin')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accesory_update_admin') THEN
    ALTER POLICY accsory_update_admin ON public.accesory RENAME TO accesory_update_admin;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accsory_delete_admin')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accesory' AND policyname='accesory_delete_admin') THEN
    ALTER POLICY accsory_delete_admin ON public.accesory RENAME TO accesory_delete_admin;
  END IF;
END $$;
