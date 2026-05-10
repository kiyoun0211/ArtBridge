# ArtBridge — Roadmap

> Generated: 2026-05-10 | Granularity: coarse | Mode: mvp | Milestone: 1

## Phases

- [ ] **Phase 1: Foundation** — Auth, role-based routing, full DB schema with RLS, security baseline
- [ ] **Phase 2: Artwork Listing** — Artist CRUD + Storage, public gallery, search
- [ ] **Phase 3: AI Pipelines** — Promotional mockup (fal.ai) + consumer space visualization (RunPod), shared async queue
- [ ] **Phase 4: Fixed-Price Purchase** — Immediate buy flow with Toss Payments, idempotent webhook, order history
- [ ] **Phase 5: Real-Time Auction** — Live bidding, anti-sniping, pg_cron close, authorize→capture payment window
- [ ] **Phase 6: Notifications & Watchlist** — Transactional emails (Resend) for all sale/auction events, wishlist

## Phase Details

### Phase 1: Foundation
**Goal**: Users can sign up, log in, and be routed to role-appropriate areas of the application. The entire database schema—with RLS enforced on every table—is in place and verified secure before any feature data is written.
**Mode:** mvp
**Depends on**: Nothing
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. A new user can register as an artist or buyer with email/password and immediately access their role's area
  2. A logged-in session persists across page reloads and browser restarts; logout is accessible from any page
  3. Visiting an artist-only route as a buyer (or while logged out) results in a redirect, not a 403 error page
  4. Querying any table with only the Supabase anon key returns zero private rows, confirming RLS is active
  5. Original artwork files in the private bucket return a 403 for any public URL access attempt
**Plans:** 5 plans
Plans:
- [ ] 01-01-PLAN.md — Project bootstrap & dev environment (Next.js 16, Tailwind v4, Biome, Supabase clients, shadcn/ui, local Supabase stack)
- [ ] 01-02-PLAN.md — Database schema with RLS (8 tables, policies, storage buckets, signup trigger; includes [BLOCKING] schema push)
- [ ] 01-03-PLAN.md — Auth flow: signup/login/logout (RHF + Zod, Korean UI from UI-SPEC, header logout)
- [ ] 01-04-PLAN.md — Role-gated routing (artist/buyer route groups, proxy.ts unauth redirect, no 403)
- [ ] 01-05-PLAN.md — Verification: RLS leak tests + Playwright E2E (covers all 5 Success Criteria)

### Phase 2: Artwork Listing
**Goal**: Artists can upload artworks with physical dimensions and manage their catalog; buyers can browse a public gallery and search by keyword.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: ART-01, ART-02, ART-03, ART-04, ART-05, ART-06
**Success Criteria** (what must be TRUE):
  1. An artist can upload an artwork photo with required cm dimensions and choose fixed-price or auction as the sale type; the form rejects missing or invalid dimensions
  2. An artist can view, edit, and delete their own unpurchased artworks from a management page
  3. Any visitor (logged in or not) can browse the public gallery and open an artwork detail page
  4. A buyer searching by keyword sees only matching artworks, with results updating as the query changes
  5. Artwork images in the gallery use transformed/resized URLs (not original bucket URLs), and originals remain inaccessible via any public link
**Plans**: TBD
**UI hint**: yes

### Phase 3: AI Pipelines
**Goal**: After uploading, artists automatically receive a styled promotional mockup image. Buyers can upload their room photo and see the artwork composited at its accurate physical size.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: AIPROMO-01, AIPROMO-02, AIPROMO-03, AIPROMO-04, AIVIZ-01, AIVIZ-02, AIVIZ-03, AIVIZ-04, AIVIZ-05
**Success Criteria** (what must be TRUE):
  1. After an artist uploads an artwork, a promotional mockup image appears on the artwork detail page without any manual action required (async; generation may take up to 90 seconds)
  2. The artist's dashboard shows a live progress indicator during mockup generation and displays a clear failure message if the job fails
  3. A buyer can upload a room photo, enter a reference dimension (e.g., wall width in cm), and receive a composite image in which the artwork appears at its correct physical size ratio relative to the room
  4. Attempting to trigger more AI jobs than the daily per-user quota returns an error message; no job is enqueued beyond the limit
  5. Webhook signatures from fal.ai and RunPod are verified before any result is written to the database
**Plans**: TBD
**UI hint**: yes

### Phase 4: Fixed-Price Purchase
**Goal**: Buyers can purchase any fixed-price artwork with a single click, pay via Toss Payments, and the artwork is atomically marked sold—even if two buyers attempt to buy simultaneously.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: BUY-01, BUY-02, BUY-03, BUY-04, BUY-05
**Success Criteria** (what must be TRUE):
  1. A buyer can initiate purchase of a fixed-price artwork and complete payment through the Toss Payments checkout flow
  2. When two buyers attempt to purchase the same artwork at the same time, exactly one succeeds and the other receives a clear "already sold" message—no double-sale occurs
  3. A Toss payment webhook received twice with the same payment key is processed only once (idempotency enforced)
  4. A buyer can view all their past orders and their current status from an order history page
**Plans**: TBD
**UI hint**: yes

### Phase 5: Real-Time Auction
**Goal**: Buyers can bid on auction artworks and see the current highest bid update in real time; the auction closes automatically and the winner enters a payment window.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: AUC-01, AUC-02, AUC-03, AUC-04, AUC-05, AUC-06
**Success Criteria** (what must be TRUE):
  1. A buyer on the auction detail page sees the current highest bid update within one second of any new bid being placed—without refreshing the page
  2. When two buyers bid simultaneously, exactly one bid is accepted and the other is rejected with a "bid too low" or "concurrent bid" error; the auction state is consistent
  3. A bid placed in the final 3–5 minutes of an auction automatically extends the auction end time, and all connected clients see the new countdown
  4. After the auction end time passes, pg_cron closes the auction and the winner's order page with a 48-hour payment window becomes accessible
  5. A buyer whose WebSocket reconnects mid-auction sees the correct current bid after reconnection (REST re-fetch confirmed)
**Plans**: TBD
**UI hint**: yes

### Phase 6: Notifications & Watchlist
**Goal**: All transactional events (fixed-price sale, auction close, outbid) trigger automatic emails to the right parties; buyers can save artworks to a wishlist.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04
**Success Criteria** (what must be TRUE):
  1. When a fixed-price artwork is purchased, both the buyer and the artist receive a confirmation email within 60 seconds
  2. When an auction closes, the winning bidder and the artist each receive a result email with the payment link; outbid bidders receive a separate notification
  3. A buyer can add or remove any artwork to their wishlist, and the wishlist is visible from their profile
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | - |
| 2. Artwork Listing | 0/? | Not started | - |
| 3. AI Pipelines | 0/? | Not started | - |
| 4. Fixed-Price Purchase | 0/? | Not started | - |
| 5. Real-Time Auction | 0/? | Not started | - |
| 6. Notifications & Watchlist | 0/? | Not started | - |
