-- 037_add_ticket_number.sql
-- Adds the ticket_number (SERIAL) column to the existing tickets table.
-- Also clears any existing test tickets so the sequence starts clean from #0001.
-- Run this in Supabase SQL Editor BEFORE deploying the new front-end.

-- 1. Remove existing test/seed tickets (cascades to ticket_messages automatically)
DELETE FROM public.tickets;

-- 2. Add the ticket_number column as a sequence
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_number integer;

CREATE SEQUENCE IF NOT EXISTS public.tickets_ticket_number_seq;

ALTER TABLE public.tickets
  ALTER COLUMN ticket_number SET DEFAULT nextval('public.tickets_ticket_number_seq');

ALTER SEQUENCE public.tickets_ticket_number_seq OWNED BY public.tickets.ticket_number;

-- 3. Add unique constraint
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_ticket_number_unique;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_ticket_number_unique UNIQUE (ticket_number);
