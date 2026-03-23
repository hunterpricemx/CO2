-- 035_tickets.sql
-- Support ticket system: tickets + messages + storage bucket + RLS.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tickets (
  id               uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number    serial       UNIQUE NOT NULL,
  created_at       timestamptz  DEFAULT now() NOT NULL,
  updated_at       timestamptz  DEFAULT now() NOT NULL,
  player_id        uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  player_username  text         NOT NULL,
  title            text         NOT NULL,
  description      text         NOT NULL,
  status           text         NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
  priority         text         NOT NULL DEFAULT 'medium', -- low | medium | high | critical
  category         text         NOT NULL DEFAULT 'other', -- account | payment | bug | other
  version          text,                                  -- '1.0' | '2.0' | 'both' | null
  evidence_url     text,
  attachment_urls  jsonb        DEFAULT '[]'::jsonb,
  closed_at        timestamptz
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now() NOT NULL,
  ticket_id        uuid        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_username  text        NOT NULL,
  sender_role      text        NOT NULL, -- 'player' | 'admin'
  body             text        NOT NULL,
  attachment_urls  jsonb       DEFAULT '[]'::jsonb
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS tickets_status_idx       ON public.tickets (status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx     ON public.tickets (priority);
CREATE INDEX IF NOT EXISTS tickets_player_id_idx    ON public.tickets (player_id);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx   ON public.tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_updated_at_idx   ON public.tickets (updated_at DESC);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON public.ticket_messages (ticket_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_set_updated_at ON public.tickets;
CREATE TRIGGER tickets_set_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: player can INSERT own + SELECT own
DROP POLICY IF EXISTS "tickets_player_insert" ON public.tickets;
CREATE POLICY "tickets_player_insert"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "tickets_player_select" ON public.tickets;
CREATE POLICY "tickets_player_select"
  ON public.tickets FOR SELECT
  USING (
    auth.uid() = player_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Tickets: admin can UPDATE (status, priority, etc.)
DROP POLICY IF EXISTS "tickets_admin_update" ON public.tickets;
CREATE POLICY "tickets_admin_update"
  ON public.tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Tickets: admin can DELETE
DROP POLICY IF EXISTS "tickets_admin_delete" ON public.tickets;
CREATE POLICY "tickets_admin_delete"
  ON public.tickets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Messages: player can INSERT + SELECT messages on their own tickets
DROP POLICY IF EXISTS "ticket_messages_player_insert" ON public.ticket_messages;
CREATE POLICY "ticket_messages_player_insert"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ticket_messages_player_select" ON public.ticket_messages;
CREATE POLICY "ticket_messages_player_select"
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND (
          t.player_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

-- Messages: admin can INSERT replies
DROP POLICY IF EXISTS "ticket_messages_admin_insert" ON public.ticket_messages;
CREATE POLICY "ticket_messages_admin_insert"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Run manually in Supabase Storage dashboard or via API:
-- CREATE BUCKET 'ticket-attachments' (public: true, file_size_limit: 5242880, allowed_mime_types: ['image/*'])
--
-- Or via SQL (Supabase manages buckets via storage schema):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: players upload to their own folder, admins read everything
DROP POLICY IF EXISTS "ticket_attachments_player_upload" ON storage.objects;
CREATE POLICY "ticket_attachments_player_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "ticket_attachments_public_read" ON storage.objects;
CREATE POLICY "ticket_attachments_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments');
