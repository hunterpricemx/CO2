-- 046_guides_summary.sql
-- Agrega extractos cortos multiidioma para las guias.

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS summary_es TEXT,
  ADD COLUMN IF NOT EXISTS summary_en TEXT,
  ADD COLUMN IF NOT EXISTS summary_pt TEXT;