-- ── PRIVATE SCHEMA + ROLE HELPER (avoids RLS recursion on profiles) ──────────
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_user_role(user_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ── ARTWORKS ──────────────────────────────────────────────────────────────────
CREATE POLICY "artworks_select_public"
  ON public.artworks FOR SELECT
  TO anon, authenticated
  USING (status IN ('available', 'auctioning', 'sold'));

CREATE POLICY "artworks_select_own"
  ON public.artworks FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = artist_id);

CREATE POLICY "artworks_insert_artist"
  ON public.artworks FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = artist_id
    AND private.get_user_role((SELECT auth.uid())) = 'artist'
  );

CREATE POLICY "artworks_update_own"
  ON public.artworks FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = artist_id);

CREATE POLICY "artworks_delete_own_draft"
  ON public.artworks FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = artist_id AND status = 'draft');

-- ── AUCTIONS ──────────────────────────────────────────────────────────────────
CREATE POLICY "auctions_select_public"
  ON public.auctions FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'closed'));

CREATE POLICY "auctions_insert_artist"
  ON public.auctions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artworks
      WHERE id = artwork_id AND artist_id = (SELECT auth.uid())
    )
  );

-- ── BIDS ──────────────────────────────────────────────────────────────────────
CREATE POLICY "bids_select_amounts_only"
  ON public.bids FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions
      WHERE id = auction_id AND status IN ('active', 'closed')
    )
  );

CREATE POLICY "bids_select_own"
  ON public.bids FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = bidder_id);

-- ── ORDERS ────────────────────────────────────────────────────────────────────
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = buyer_id);

CREATE POLICY "orders_select_artist"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artworks
      WHERE id = artwork_id AND artist_id = (SELECT auth.uid())
    )
  );

-- ── AI JOBS ───────────────────────────────────────────────────────────────────
CREATE POLICY "ai_jobs_select_artist"
  ON public.ai_jobs FOR SELECT
  TO authenticated
  USING (
    artwork_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.artworks
      WHERE id = artwork_id AND artist_id = (SELECT auth.uid())
    )
  );

-- ── IDEMPOTENCY KEYS ──────────────────────────────────────────────────────────
-- RLS enabled with no policies = anon/authenticated get 0 rows (admin client only).

-- ── WATCHLIST ─────────────────────────────────────────────────────────────────
CREATE POLICY "watchlist_crud_own"
  ON public.watchlist FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
