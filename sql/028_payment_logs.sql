-- 028_payment_logs.sql
-- Tabla de logs de compras para debugging en el panel de admin.
-- Registra todos los eventos relevantes de Tebex, Stripe y pagos manuales.

CREATE TABLE IF NOT EXISTS payment_logs (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz  DEFAULT now() NOT NULL,
  source       text         NOT NULL,               -- 'tebex' | 'stripe' | 'manual' | 'debug'
  level        text         NOT NULL DEFAULT 'info', -- 'info' | 'warn' | 'error'
  event        text         NOT NULL,               -- 'webhook_received', 'credited', 'error', etc.
  username     text,
  product      text,
  amount       numeric,
  donation_id  uuid,
  txn_id       text,
  basket_ident text,
  message      text         NOT NULL,
  metadata     jsonb
);

CREATE INDEX IF NOT EXISTS payment_logs_created_at_idx  ON payment_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS payment_logs_source_idx      ON payment_logs (source);
CREATE INDEX IF NOT EXISTS payment_logs_level_idx       ON payment_logs (level);
CREATE INDEX IF NOT EXISTS payment_logs_username_idx    ON payment_logs (username);

-- Row Level Security: only admins can read payment logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_logs_admin_read" ON public.payment_logs;
CREATE POLICY "payment_logs_admin_read"
  ON public.payment_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
