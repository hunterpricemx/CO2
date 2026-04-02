-- 041_garments_reserved_flag.sql
-- Marca manual de garments apartados para galeria de disponibles/apartados.

ALTER TABLE public.garments
  ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS garments_reserved_idx
  ON public.garments (is_reserved);
