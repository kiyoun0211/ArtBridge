-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('artist', 'buyer')),
  email       TEXT NOT NULL,
  display_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── ARTWORKS ──────────────────────────────────────────────────────────────────
CREATE TABLE public.artworks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  width_cm        NUMERIC(8,2) NOT NULL CHECK (width_cm > 0),
  height_cm       NUMERIC(8,2) NOT NULL CHECK (height_cm > 0),
  sale_type       TEXT NOT NULL CHECK (sale_type IN ('fixed', 'auction')),
  price           NUMERIC(12,2),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'available', 'auctioning', 'sold', 'cancelled')),
  storage_path    TEXT,
  mockup_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.artworks(artist_id);
CREATE INDEX ON public.artworks(status);

-- ── AUCTIONS ──────────────────────────────────────────────────────────────────
CREATE TABLE public.auctions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id      UUID NOT NULL UNIQUE REFERENCES public.artworks(id) ON DELETE CASCADE,
  start_bid       NUMERIC(12,2) NOT NULL,
  current_bid     NUMERIC(12,2),
  winner_id       UUID REFERENCES public.profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'closed', 'cancelled')),
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  extended_count  INT NOT NULL DEFAULT 0,
  payment_deadline_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.auctions(status);
CREATE INDEX ON public.auctions(end_at) WHERE status = 'active';

-- ── BIDS ──────────────────────────────────────────────────────────────────────
CREATE TABLE public.bids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id   UUID NOT NULL REFERENCES public.profiles(id),
  amount      NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.bids(auction_id, amount DESC);
CREATE INDEX ON public.bids(bidder_id);

-- ── ORDERS ────────────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id      UUID NOT NULL REFERENCES public.artworks(id),
  buyer_id        UUID NOT NULL REFERENCES public.profiles(id),
  auction_id      UUID REFERENCES public.auctions(id),
  amount          NUMERIC(12,2) NOT NULL,
  payment_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed', 'refunded')),
  payment_key     TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.orders(buyer_id);
CREATE INDEX ON public.orders(payment_key) WHERE payment_key IS NOT NULL;

-- ── AI JOBS ───────────────────────────────────────────────────────────────────
CREATE TABLE public.ai_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id      UUID REFERENCES public.artworks(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('mockup', 'composition')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload         JSONB NOT NULL DEFAULT '{}',
  result_url      TEXT,
  provider_job_id TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.ai_jobs(status) WHERE status IN ('pending', 'processing');

-- ── IDEMPOTENCY KEYS ──────────────────────────────────────────────────────────
CREATE TABLE public.idempotency_keys (
  key         TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ── WATCHLIST ─────────────────────────────────────────────────────────────────
CREATE TABLE public.watchlist (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artwork_id  UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artwork_id)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- ── updated_at TRIGGER ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
