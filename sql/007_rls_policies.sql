-- ============================================================
-- 007_rls_policies.sql
-- Row Level Security policies for all public tables
--
-- Strategy:
--   - Public tables (events, guides, fixes, rankings, market_items):
--     SELECT  → everyone (including anonymous)
--     INSERT/UPDATE/DELETE → admins only (via service_role OR admin user)
--   - Profiles:
--     SELECT  → authenticated users can see all profiles (for admin panel)
--     UPDATE  → users can update their own profile; admins can update any
--   - Donations:
--     SELECT/INSERT/UPDATE → admin only
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fix_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_items   ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Helper function: is the current user an admin?
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt()->'user_metadata'->>'role') = 'admin',
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles: admin delete"
  ON public.profiles FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- events — public read, admin write
-- ----------------------------------------------------------------
CREATE POLICY "events: public read"
  ON public.events FOR SELECT USING (TRUE);

CREATE POLICY "events: admin insert"
  ON public.events FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "events: admin update"
  ON public.events FOR UPDATE USING (public.is_admin());

CREATE POLICY "events: admin delete"
  ON public.events FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- guide_categories — public read, admin write
-- ----------------------------------------------------------------
CREATE POLICY "guide_categories: public read"
  ON public.guide_categories FOR SELECT USING (TRUE);

CREATE POLICY "guide_categories: admin write"
  ON public.guide_categories FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------
-- guides — public read (published only for anon), admin sees all
-- ----------------------------------------------------------------
CREATE POLICY "guides: public read published"
  ON public.guides FOR SELECT
  USING (status = 'published' OR public.is_admin());

CREATE POLICY "guides: admin insert"
  ON public.guides FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "guides: admin update"
  ON public.guides FOR UPDATE USING (public.is_admin());

CREATE POLICY "guides: admin delete"
  ON public.guides FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- fix_categories — public read, admin write
-- ----------------------------------------------------------------
CREATE POLICY "fix_categories: public read"
  ON public.fix_categories FOR SELECT USING (TRUE);

CREATE POLICY "fix_categories: admin write"
  ON public.fix_categories FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------
-- fixes — same as guides
-- ----------------------------------------------------------------
CREATE POLICY "fixes: public read published"
  ON public.fixes FOR SELECT
  USING (status = 'published' OR public.is_admin());

CREATE POLICY "fixes: admin insert"
  ON public.fixes FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "fixes: admin update"
  ON public.fixes FOR UPDATE USING (public.is_admin());

CREATE POLICY "fixes: admin delete"
  ON public.fixes FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------
-- donations — admin only
-- ----------------------------------------------------------------
CREATE POLICY "donations: admin all"
  ON public.donations FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------
-- rankings — public read, admin write
-- ----------------------------------------------------------------
CREATE POLICY "rankings: public read"
  ON public.rankings FOR SELECT USING (TRUE);

CREATE POLICY "rankings: admin write"
  ON public.rankings FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------
-- market_items — public read, admin write
-- ----------------------------------------------------------------
CREATE POLICY "market_items: public read"
  ON public.market_items FOR SELECT USING (TRUE);

CREATE POLICY "market_items: admin write"
  ON public.market_items FOR ALL USING (public.is_admin());
