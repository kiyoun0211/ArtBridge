# Architecture Research

**Domain:** Art E-commerce + Real-time Auction + AI Image Composition Platform
**Researched:** 2026-05-10
**Confidence:** HIGH (core patterns) / MEDIUM (AI inference layer specifics)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   Next.js App Router (RSC + Client Components)               │   │
│  │   ┌─────────────┐  ┌────────────┐  ┌──────────────────────┐ │   │
│  │   │ Artist Pages │  │ Buyer Pages│  │ Real-time Bid UI     │ │   │
│  │   │ (artwork mgmt│  │(gallery,   │  │(Supabase Realtime    │ │   │
│  │   │  upload flow)│  │ auction)   │  │ WS subscription)     │ │   │
│  │   └─────────────┘  └────────────┘  └──────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                      API / MUTATION LAYER                           │
│  ┌────────────────────────┐  ┌──────────────────────────────────┐   │
│  │  Next.js Server Actions │  │  Next.js Route Handlers          │   │
│  │  - artwork CRUD         │  │  POST /api/webhooks/payment      │   │
│  │  - trigger AI job       │  │  POST /api/webhooks/ai-complete  │   │
│  │  - user profile         │  │  (external-facing endpoints only)│   │
│  └────────────────────────┘  └──────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Supabase                                    │ │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────┐ │ │
│  │  │ Postgres │ │ Auth     │ │ Realtime  │ │ Storage         │ │ │
│  │  │ + RLS    │ │ (JWT)    │ │ (WS/WAL)  │ │ (artwork images)│ │ │
│  │  │ + pg_cron│ │          │ │           │ │                 │ │ │
│  │  └──────────┘ └──────────┘ └───────────┘ └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                       ASYNC WORKER LAYER                            │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐ │
│  │  AI Inference Worker          │  │  Email Worker                │ │
│  │  (Supabase Edge Function OR   │  │  (Supabase Edge Function)    │ │
│  │   dedicated GPU service)      │  │  Triggered by:               │ │
│  │  - Receives job from DB queue │  │  - DB trigger on sale        │ │
│  │  - Calls fal.ai / Replicate   │  │  - Auction close function    │ │
│  │  - Writes result back to DB   │  │  Sends via Resend            │ │
│  └──────────────────────────────┘  └──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SERVICES                               │
│  ┌───────────┐  ┌────────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ fal.ai OR │  │ Toss Payments  │  │  Resend  │  │ pg_cron     │  │
│  │ Replicate │  │ (PG webhook)   │  │ (email)  │  │ (scheduler) │  │
│  └───────────┘  └────────────────┘  └──────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Next.js RSC pages | Page rendering, data fetching via Supabase server client | App Router page.tsx with async data fetch |
| Server Actions | User-initiated mutations (artwork create, bid trigger, profile update) | `'use server'` functions called from forms/buttons |
| Route Handlers | Inbound webhooks from external services only | `app/api/webhooks/[provider]/route.ts` |
| Supabase Postgres | Single source of truth, RLS enforces authorization, functions handle atomic ops | `artworks`, `auctions`, `bids`, `ai_jobs`, `orders` tables |
| Supabase Realtime | Broadcasts bid-table WAL changes to subscribed clients | Postgres Changes subscription on `bids` filtered by `auction_id` |
| Supabase Storage | Stores raw artwork images + AI-generated mockups | Two buckets: `artwork-originals` (private) and `artwork-mockups` (public) |
| pg_cron job | Closes expired auctions on schedule | Runs every minute, calls `close_expired_auctions()` DB function |
| AI Worker (Edge Function) | Reads pending `ai_jobs` rows, calls inference API, writes result | Triggered by pg_cron or DB webhook; polls fal.ai queue |
| Email Worker (Edge Function) | Sends transactional emails on sale/auction-close events | Triggered by Postgres trigger → `pg_net` HTTP call to Edge Function |
| fal.ai / Replicate | Executes Stable Diffusion / ControlNet inference | Async queue API; returns via webhook to `POST /api/webhooks/ai-complete` |
| Toss Payments | Handles payment flow; notifies outcome via webhook | Redirect + webhook to `POST /api/webhooks/payment` |

## Recommended Project Structure

```
artbridge/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (login, signup)
│   ├── (artist)/                 # Artist-only routes (middleware-guarded)
│   │   ├── dashboard/
│   │   ├── artworks/
│   │   │   ├── new/              # Artwork upload + AI job trigger
│   │   │   └── [id]/edit/
│   ├── (buyer)/                  # Buyer routes
│   │   ├── gallery/
│   │   └── auction/[id]/         # Real-time bid page
│   ├── api/
│   │   └── webhooks/
│   │       ├── payment/route.ts  # Toss Payments webhook
│   │       └── ai/route.ts       # fal.ai / Replicate result webhook
│   └── layout.tsx
├── components/
│   ├── artwork/
│   ├── auction/
│   │   └── BidStream.tsx         # Client component, Supabase Realtime
│   └── visualization/            # AR/space mockup viewer
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Server-side client (cookies)
│   │   ├── client.ts             # Browser client (singleton)
│   │   └── admin.ts              # Service-role client (webhooks only)
│   ├── ai/
│   │   ├── jobs.ts               # Enqueue AI job to DB
│   │   └── providers/
│   │       └── fal.ts            # fal.ai client wrapper
│   ├── payments/
│   │   └── toss.ts               # Toss Payments SDK wrapper
│   └── email/
│       └── resend.ts             # Resend client + templates
├── actions/                      # Server Actions (all mutations)
│   ├── artwork.ts
│   ├── bid.ts
│   └── visualization.ts
├── supabase/
│   ├── migrations/               # SQL migration files
│   │   ├── 001_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_functions.sql     # place_bid(), close_expired_auctions()
│   │   └── 004_cron_jobs.sql
│   └── functions/                # Supabase Edge Functions
│       ├── ai-worker/            # Polls AI jobs queue
│       └── email-sender/         # Sends emails via Resend
└── types/
    └── database.ts               # Generated Supabase types
```

### Structure Rationale

- **actions/:** All Server Actions in one place prevents scattering mutations across page files; co-locates authorization and validation logic
- **lib/supabase/:** Three clients (server, client, admin) serve distinct auth contexts — never use admin client in browser or Server Actions that run under user JWT
- **supabase/migrations/:** SQL-first approach means DB schema, functions, and RLS policies are version-controlled and reproducible
- **supabase/functions/:** Edge Functions live in the repo but deploy to Supabase infrastructure — keeps AI and email workers close to the DB, reducing network hops

## Architectural Patterns

### Pattern 1: Atomic Bid Placement via Postgres Function with Row Lock

**What:** All bid validation and insertion happens inside a single Postgres function called via RPC. No application-level check-then-insert.

**When to use:** Any time two users might race to place the winning bid, or when bid amount must be validated against current highest before insertion.

**Trade-offs:** Slightly less flexible than application-layer logic, but eliminates the TOCTOU (time-of-check to time-of-use) race condition entirely. Postgres holds the row lock for the duration of the function.

**Example:**
```sql
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_bidder_id  UUID,
  p_amount     NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as owner, bypasses RLS for the write
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
BEGIN
  -- Row lock: only one concurrent call can hold this per auction
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id
    AND status = 'active'
    AND end_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auction_not_active');
  END IF;

  IF p_amount <= v_auction.current_bid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bid_too_low',
                              'current_bid', v_auction.current_bid);
  END IF;

  UPDATE auctions SET current_bid = p_amount, winner_id = p_bidder_id
  WHERE id = p_auction_id;

  INSERT INTO bids (auction_id, bidder_id, amount)
  VALUES (p_auction_id, p_bidder_id, p_amount);

  RETURN jsonb_build_object('ok', true, 'new_bid', p_amount);
END;
$$;
```

Called from a Server Action: `supabase.rpc('place_bid', { p_auction_id, p_bidder_id, p_amount })`

### Pattern 2: Real-time Bid Stream via Supabase Postgres Changes

**What:** Client components subscribe to the `bids` table WAL stream, filtered by `auction_id`. Each INSERT on `bids` is pushed via WebSocket to all subscribed clients without polling.

**When to use:** The auction detail page; every visitor on that page needs the same current-bid state.

**Trade-offs:** Supabase runs RLS checks per subscriber per change event — at high bid volume (unlikely for art auctions) this can stress the DB. For ArtBridge's expected scale this is not a concern. Prefer Postgres Changes over Broadcast because the bid record is the authoritative source; clients should see what was committed, not what was attempted.

**Example:**
```typescript
// components/auction/BidStream.tsx — 'use client'
useEffect(() => {
  const channel = supabase
    .channel(`auction-bids-${auctionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'bids',
      filter: `auction_id=eq.${auctionId}`,
    }, (payload) => {
      setCurrentBid(payload.new.amount)
      setBidHistory(prev => [payload.new, ...prev])
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [auctionId])
```

RLS on `bids` table: anyone can SELECT bids (public auction visibility), only authenticated users can INSERT (via `place_bid` RPC which uses SECURITY DEFINER).

### Pattern 3: AI Job Queue via DB-Backed Jobs Table + Async Inference

**What:** When artwork is uploaded, a row is inserted into `ai_jobs` with `status = 'pending'`. A pg_cron job (every 30s) or a Postgres trigger fires an Edge Function that picks up pending jobs, calls fal.ai's async queue, stores the `request_id`, and sets status to `processing`. fal.ai POSTs the result to `/api/webhooks/ai`, which writes the image URL back and sets status to `completed`.

**When to use:** Any inference call expected to take >5 seconds. Stable Diffusion typically takes 15-90 seconds. Direct synchronous calls from Server Actions will timeout.

**Trade-offs:** Two round-trips (enqueue → webhook) add complexity but are the only production-viable pattern for slow inference. Status polling from the UI (every 3s) gives the user progress feedback without holding a server connection open.

**Example:**
```typescript
// lib/ai/jobs.ts
export async function enqueueAiJob(artworkId: string, type: 'mockup' | 'composition', payload: object) {
  const { data, error } = await supabase
    .from('ai_jobs')
    .insert({ artwork_id: artworkId, type, payload, status: 'pending' })
    .select('id')
    .single()
  return data?.id
}

// app/api/webhooks/ai/route.ts — Route Handler (external webhook receiver)
export async function POST(request: Request) {
  const body = await request.json()
  // Verify fal.ai webhook signature
  const { request_id, status, output } = body

  if (status === 'OK') {
    await supabaseAdmin.from('ai_jobs')
      .update({ status: 'completed', result_url: output.images[0].url })
      .eq('fal_request_id', request_id)
  }
  return new Response('ok')
}
```

### Pattern 4: Auction Close via pg_cron Scheduled Function

**What:** A Postgres function `close_expired_auctions()` runs every minute via pg_cron. It selects all auctions where `end_at < now() AND status = 'active'`, sets status to `closed`, locks in the winner, then triggers the email worker via `pg_net` HTTP call to the email Edge Function.

**When to use:** Auction close must be precise, automated, and not dependent on user activity. pg_cron running inside Postgres is the most reliable option — it runs even when no web request is in flight.

**Trade-offs:** pg_cron resolution is 1 minute (can be set to every 30s). For auctions this is acceptable — a 60-second window after `end_at` is fine for art sales. If sub-minute precision is required, use Supabase Edge Function on a cron schedule with a shorter interval.

**Example:**
```sql
-- Migration: 004_cron_jobs.sql
SELECT cron.schedule(
  'close-expired-auctions',
  '* * * * *',  -- every minute
  $$
    SELECT close_expired_auctions();
  $$
);

CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_auction RECORD;
BEGIN
  FOR v_auction IN
    SELECT id, winner_id, current_bid
    FROM auctions
    WHERE status = 'active' AND end_at < now()
    FOR UPDATE SKIP LOCKED  -- safe for concurrent runs
  LOOP
    UPDATE auctions SET status = 'closed' WHERE id = v_auction.id;
    UPDATE artworks SET status = 'auctioning_closed' WHERE auction_id = v_auction.id;

    -- Notify email worker (pg_net extension)
    PERFORM net.http_post(
      url := current_setting('app.email_worker_url'),
      body := jsonb_build_object('auction_id', v_auction.id, 'event', 'auction_closed')
    );
  END LOOP;
END;
$$;
```

### Pattern 5: Payment Webhook with Idempotency

**What:** Payment provider (Toss Payments) POSTs to `/api/webhooks/payment`. Handler verifies signature, checks if `payment_event_id` was already processed (idempotency), then updates order status and triggers fulfillment email. Never processes business logic synchronously in the webhook — respond 200 immediately, enqueue work.

**When to use:** All inbound payment webhooks. Toss/Stripe retry on non-2xx; without idempotency this causes double-fulfillment.

**Trade-offs:** Requires an `idempotency_keys` table or storing `provider_event_id` on orders. Minimal overhead, high correctness guarantee.

**Example:**
```typescript
// app/api/webhooks/payment/route.ts
export async function POST(request: Request) {
  const raw = await request.text()
  verifyTossSignature(raw, request.headers.get('toss-signature')!)

  const event = JSON.parse(raw)
  const { orderId, paymentKey, status } = event

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id, payment_status')
    .eq('payment_key', paymentKey)
    .single()

  if (existing?.payment_status === 'paid') {
    return new Response('already processed', { status: 200 })
  }

  await supabaseAdmin.from('orders').update({
    payment_status: status === 'DONE' ? 'paid' : 'failed',
    payment_key: paymentKey,
  }).eq('id', orderId)

  // Email notification is async — do not await here
  enqueueEmailJob(orderId, 'payment_confirmed')

  return new Response('ok', { status: 200 })
}
```

## Data Flow

### Primary Flow: Artwork Upload → AI Mockup → Listing

```
Artist uploads artwork image + dimensions
    ↓
Server Action: validate, upload to Supabase Storage (artwork-originals bucket)
    ↓
Insert artwork row (status: 'draft') + Insert ai_jobs row (type: 'mockup', status: 'pending')
    ↓
pg_cron (every 30s) → triggers AI Edge Function → picks up pending ai_jobs row
    ↓
AI Edge Function calls fal.ai queue API → returns request_id immediately
    ↓
Update ai_jobs row (status: 'processing', fal_request_id: '...')
    ↓
[15-90 seconds later]
fal.ai POSTs result to POST /api/webhooks/ai
    ↓
Route Handler: verify signature → write mockup image to Storage (artwork-mockups bucket)
             → update ai_jobs (status: 'completed', result_url: '...')
             → update artwork (mockup_url: '...')
    ↓
Frontend polls ai_jobs.status every 3s (or subscribes via Realtime)
    ↓
Artist reviews mockup, selects sale type, publishes artwork (status: 'listed')
```

### Primary Flow: Buyer Bid → Auction Close → Payment → Fulfillment

```
Buyer views auction page
    ↓
Client subscribes: supabase.channel('auction-bids-{id}')
    ↓ [Realtime WebSocket open]
Buyer submits bid amount
    ↓
Server Action → supabase.rpc('place_bid', { auction_id, bidder_id, amount })
    ↓
Postgres: SELECT FOR UPDATE (auction row lock) → validate amount > current_bid
         → UPDATE auctions.current_bid → INSERT bids row
    ↓
WAL change on bids table → Supabase Realtime broadcasts INSERT event
    ↓
All subscribed clients receive new bid amount via WebSocket → UI updates
    ↓
[Auction end_at passes]
pg_cron runs close_expired_auctions() every minute
    ↓
UPDATE auctions SET status='closed', winner = winner_id
    ↓
pg_net HTTP call → Email Edge Function → Resend API → emails to winner + artist
    ↓
Winner receives email with payment link → visits order page
    ↓
Server Action initiates Toss Payments checkout → redirect to payment page
    ↓
Buyer completes payment → Toss POSTs to POST /api/webhooks/payment
    ↓
Route Handler: verify sig → idempotency check → update order.payment_status='paid'
    ↓
Email Edge Function → Resend → fulfillment emails to buyer + artist
```

### Secondary Flow: Buyer Space Visualization

```
Buyer uploads room photo on artwork detail page
    ↓
Server Action: upload to Storage (space-uploads bucket, private, user-scoped)
    ↓
Insert ai_jobs row (type: 'composition', payload: { artwork_id, space_image_url, artwork_width_cm, artwork_height_cm })
    ↓
AI Edge Function: scale calculation (artwork cm → pixel ratio relative to room reference object)
               → call fal.ai ControlNet inpainting with masked region
    ↓
Result webhook → write composite image to Storage (space-mockups bucket, user-private)
    ↓
Frontend displays simulation; buyer proceeds to purchase or bid
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–500 users | Current architecture is correct. Single Supabase project. fal.ai handles AI scaling. No queue infrastructure beyond DB table needed. |
| 500–10K users | Monitor Realtime subscriber count per auction. If concurrent viewers per auction exceed 200, switch from Postgres Changes to Broadcast (server re-broadcasts after commit). Add connection pooler (Supabase Pooler is built-in via PgBouncer). |
| 10K+ users | Separate AI job runner into dedicated worker service (not Edge Function) if fal.ai latency becomes unpredictable. Consider read replica for gallery/listing queries. Realtime may need regional distribution. |

### Scaling Priorities

1. **First bottleneck:** Realtime WebSocket connections — Supabase free/pro tier has limits. Monitor concurrent connections per auction. Mitigation: use Broadcast mode instead of Postgres Changes at scale.
2. **Second bottleneck:** AI job throughput — fal.ai rate limits may queue jobs during peak uploads. Mitigation: show estimated wait time to artist; use fal.ai priority queue for paid tier.

## Anti-Patterns

### Anti-Pattern 1: Bid Validation in Application Layer

**What people do:** Read current bid from DB in Server Action, compare in TypeScript, then insert new bid if valid.

**Why it's wrong:** Two concurrent bids can both read the same `current_bid`, both pass the check, and both insert — resulting in the lower bid winning or duplicate bid records.

**Do this instead:** All bid logic inside `place_bid()` Postgres function with `SELECT FOR UPDATE`. The DB lock serializes concurrent bids. Call via `supabase.rpc('place_bid', ...)`.

### Anti-Pattern 2: Calling AI Inference Synchronously from Server Action

**What people do:** `await falai.run('sd-model', { prompt })` directly in a Server Action or Route Handler, waiting for the response.

**Why it's wrong:** Stable Diffusion calls take 15-90 seconds. Vercel serverless functions timeout at 60s (or 300s on Pro). User sees a hanging request. If Vercel kills the function, the result is lost.

**Do this instead:** Enqueue an `ai_jobs` row and return immediately. Poll status client-side. Use fal.ai's async queue API with a webhook for result delivery.

### Anti-Pattern 3: Using Service-Role Supabase Client in Server Actions

**What people do:** Import the admin client (service role key) in Server Actions to bypass RLS for convenience.

**Why it's wrong:** Server Actions run under the authenticated user's JWT. Using admin bypasses RLS, meaning any user who can invoke the action can modify any row. RLS is the last line of defense.

**Do this instead:** Use the user-context server client (`createServerClient(cookies())`) in Server Actions. Reserve the admin client exclusively for webhook Route Handlers where you need to write on behalf of an external system (payment provider, AI provider). Never expose the service role key to the browser.

### Anti-Pattern 4: Polling Bids from the Client Instead of Using Realtime

**What people do:** `setInterval(() => fetchCurrentBid(), 3000)` on the auction page.

**Why it's wrong:** Each user on the page fires a query every 3 seconds. 100 concurrent viewers = 2,000 queries/minute on a single auction. Latency is also perceptibly delayed (up to 3s lag on bids).

**Do this instead:** One Supabase Realtime WebSocket subscription per client. Bid updates are pushed within ~100ms of commit. Zero polling queries.

### Anti-Pattern 5: Processing Payment Webhooks Without Idempotency

**What people do:** On payment success webhook: mark order paid, send email, notify artist — all in one synchronous handler with no deduplication.

**Why it's wrong:** Payment providers retry webhooks on non-2xx or timeout. Without idempotency, duplicate events cause double-fulfillment emails and potential double-shipping.

**Do this instead:** Check `payment_key` (or provider event ID) against already-processed orders before acting. Return 200 immediately after recording the event, process side effects (email) asynchronously.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| fal.ai | Async queue submit → store `request_id` → receive webhook | Use `fal.queue.submit()` not `fal.run()`. Verify ED25519 webhook signature. |
| Replicate | Prediction create → store prediction ID → webhook or poll | Alternative to fal.ai. Same async pattern. |
| Toss Payments | Server-side payment key confirm → webhook for final status | Never trust client-side redirect status; only trust the signed webhook. |
| Resend | HTTP API call from Edge Function | Triggered by pg_net from Postgres or directly from Edge Function. Use template-based emails. |
| Supabase pg_cron | SQL cron job inside Postgres | Enable via Dashboard extension manager. Max 8 concurrent jobs, 10 min runtime each. |
| Supabase pg_net | HTTP calls from Postgres to Edge Functions | Used by `close_expired_auctions()` to trigger email worker. Must enable extension. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client Components ↔ Server Actions | Direct function call (RSC model) | Type-safe; no manual fetch needed |
| Server Actions ↔ Supabase | Supabase server client (user JWT context) | Never admin client in Server Actions |
| Route Handlers ↔ Supabase | Supabase admin client | Webhooks act on behalf of external system, not user |
| Postgres function ↔ bids table | Internal SQL with row lock | Atomic; no application layer in the loop |
| pg_cron ↔ Edge Functions | HTTP via pg_net | Edge Function URL stored in Postgres config setting |
| AI Worker Edge Function ↔ fal.ai | HTTPS async queue API | Worker runs on Supabase edge, close to DB |

## Suggested Build Order

Build in dependency order — each phase produces a working vertical slice before the next:

1. **Foundation: Auth + Schema + RLS**
   - Supabase project, tables (artworks, auctions, bids, ai_jobs, orders), RLS policies
   - Next.js project with App Router, Supabase server/client setup, auth routes
   - Role-based middleware (artist vs buyer route guards)
   - _Dependency: Everything else depends on this_

2. **Artwork CRUD + Storage**
   - Artist artwork upload (image + dimensions), Supabase Storage buckets
   - Gallery listing page (buyer-facing, RSC, no Realtime yet)
   - _Dependency: Auth must be complete_

3. **AI Mockup Generation Pipeline**
   - `ai_jobs` table + `enqueueAiJob()` helper
   - fal.ai async integration: submit → store request_id → webhook receiver
   - AI Edge Function worker + pg_cron trigger
   - UI: status polling (or Realtime on `ai_jobs`) during generation
   - _Dependency: Artwork upload must be complete_

4. **Buyer Space Visualization**
   - Space photo upload flow
   - Scale calculation logic (cm-to-pixel ratio)
   - ControlNet composition job via same AI pipeline
   - _Dependency: AI pipeline must be complete_

5. **Fixed-Price Purchase + Payment**
   - Order creation, Toss Payments checkout integration
   - Payment webhook handler with idempotency
   - Order status pages
   - _Dependency: Artwork CRUD must be complete_

6. **Real-time Auction System**
   - `place_bid()` Postgres function with row lock
   - Auction detail page with Realtime bid subscription
   - Bid submission Server Action via RPC
   - pg_cron auction close job + `close_expired_auctions()` function
   - _Dependency: Auth, schema, payment webhook must be complete_

7. **Email Notifications**
   - Resend integration + email templates
   - Email Edge Function
   - pg_net calls from `close_expired_auctions()` and payment webhook
   - _Dependency: Auction close + payment webhook must be complete_

## Sources

- [Supabase Postgres Changes — Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts)
- [Supabase Cron Guide](https://supabase.com/docs/guides/cron)
- [Supabase pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [How to Handle Race Conditions in PostgreSQL Functions](https://oneuptime.com/blog/post/2026-01-25-postgresql-race-conditions/view)
- [Supabase Transactions and RLS in Edge Functions](https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html)
- [Server Actions vs Route Handlers in Next.js](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)
- [fal.ai Asynchronous Inference Queue](https://fal.ai/docs/documentation/model-apis/inference/queue)
- [fal.ai Webhooks Guide](https://docs.fal.ai/model-apis/model-endpoints/webhooks)
- [Building a Production AI Image Generation Pipeline with fal.ai and Inngest](https://www.inngest.com/blog/how-to-build-a-production-ai-image-generation-pipeline-with-fal-ai-and-inngest)
- [Payment Webhook Idempotency Pattern](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)

---
*Architecture research for: ArtBridge — Art E-commerce + Real-time Auction + AI Image Composition*
*Researched: 2026-05-10*
