# Pitfalls Research

**Domain:** Art e-commerce + real-time auction + AI image composition marketplace
**Researched:** 2026-05-10
**Confidence:** HIGH (verified across multiple official sources and post-mortems)

---

## Critical Pitfalls

### Pitfall 1: Concurrent Bid Lost-Update (Race Condition)

**What goes wrong:**
Two bidders submit bids within milliseconds. Both requests read `current_bid = 50000` simultaneously. Both pass validation (their bids are higher). Both write back — one overwrites the other. The auction records the lower of the two winning bids, or worse, the losing bid wins. The item appears sold to the wrong person.

**Why it happens:**
Developers use a simple `UPDATE auctions SET current_bid = $1, bidder_id = $2 WHERE id = $3` without row-level locking. At normal traffic this never surfaces in development. It emerges in production during popular auctions when concurrent bidders spike.

**How to avoid:**
Use PostgreSQL `SELECT ... FOR UPDATE` inside a transaction to pessimistically lock the auction row before reading and updating it. Alternatively, use an optimistic locking `version` column:
```sql
UPDATE auctions
SET current_bid = $new_bid, bidder_id = $user_id, version = version + 1
WHERE id = $auction_id
  AND version = $expected_version
  AND current_bid < $new_bid;
```
If 0 rows are updated, the bid was rejected due to a concurrent write — return an error and let the client retry. Never use application-layer checks alone.

**Warning signs:**
- Two users claim to have the highest bid in your UI simultaneously
- `bids` table shows sequential timestamps that are identical to the millisecond
- Auction `winner_id` does not match the actual highest bid in the `bids` log

**Phase to address:** Auction / Real-Time Bidding phase (before any public auction goes live)

---

### Pitfall 2: Single-Item Checkout Race (Two Buyers Purchase the Same Artwork)

**What goes wrong:**
User A and User B both view a fixed-price artwork with `status = available`. Both click "Buy Now" within seconds. Both pass the status check. Both proceed to payment. Both payments succeed. The artwork is sold twice — but it's a unique piece. You now owe a refund to one buyer and have destroyed their trust.

**Why it happens:**
The status check and the status update are two separate operations without a transaction. In a serverless environment (Next.js API Routes), two requests can interleave between the check and the update.

**How to avoid:**
Use an atomic `UPDATE ... WHERE status = 'available' RETURNING id` inside a transaction. If no row is returned, the item was already taken. Never do a SELECT then a conditional UPDATE — only one of the two concurrent writers will win the atomic update.

```sql
BEGIN;
UPDATE artworks
SET status = 'sold', buyer_id = $user_id
WHERE id = $artwork_id AND status = 'available'
RETURNING id;
-- If no row returned: abort and return 409 Conflict
COMMIT;
```

**Warning signs:**
- Two order records exist for the same `artwork_id`
- A payment was captured but no corresponding `sold` status on the artwork
- Customer support receives duplicate purchase complaints

**Phase to address:** Checkout / Payment phase

---

### Pitfall 3: Payment Authorized but Never Captured (or Captured but Auction Cancelled)

**What goes wrong:**
For auctions: the winner's payment is immediately charged at auction close. But if the artwork has a dispute, or the artist cancels, you must issue a refund — which takes 5-10 business days and creates user fury. Alternatively, an authorization hold expires (Stripe holds expire after 7 days) before capture, meaning the winner's payment silently fails and the artist is not paid.

**Why it happens:**
Teams implement a simple `charge` instead of a two-step `authorize → capture` flow. This works fine for instant purchases, but auctions need a window between "auction ends" and "both parties confirm."

**How to avoid:**
Use Stripe (or Toss Payments) `authorize` at auction close, `capture` only after the artist confirms readiness to ship. Toss Payments auto-captures daily at midnight — override this if you need a manual capture window. Set a capture deadline (e.g., 5 days) and notify both parties. If capture fails (card declined), fall back to the second-highest bidder.

**Warning signs:**
- PaymentIntent status is `requires_capture` but no job is polling for it
- Authorization hold expiry not tracked — no job will fail gracefully
- No second-bidder fallback logic exists in your auction close handler

**Phase to address:** Auction close + Payment integration phase

---

### Pitfall 4: Bid Sniping Destroys Seller Trust

**What goes wrong:**
A bidder places a bid 3 seconds before auction close, winning at a price far below what the item could have fetched. Sellers see this as the platform failing them. Artists leave.

**Why it happens:**
Teams ship a fixed `end_at` timestamp with no anti-sniping mechanism, copying the eBay model without realizing eBay's seller community has been complaining about this for 20 years.

**How to avoid:**
Implement time extension: if a bid arrives within the last N minutes (e.g., 5 minutes) of auction close, automatically extend `end_at` by N minutes. Store this in the `auctions` table as a server-side update. The extension count can be capped (e.g., maximum 3 extensions) to prevent infinite auctions. Broadcast the new `end_at` via Supabase Realtime so all clients update their countdown.

**Warning signs:**
- Artists complain about "last second" wins at low prices
- Auction close timestamps cluster at the exact original `end_at` rather than being distributed
- No `extended_count` or `last_bid_at` column exists in your auctions schema

**Phase to address:** Auction / Real-Time Bidding phase (design decision, must be in schema from day one)

---

### Pitfall 5: AI Composition Scale Math Is Wrong — Artwork Appears Wrong Size

**What goes wrong:**
The core value proposition of ArtBridge is "see the artwork at its real size in your room." If the physics is wrong — the artwork appears 2x or 0.5x its actual size relative to room objects — the user loses trust permanently. This is not a minor bug; it is the product's existential risk.

**Why it happens:**
Developers compute pixel size from artwork cm without knowing the room's physical scale. A room photo has no inherent pixels-per-cm ratio. Teams either ignore this (bad) or assume a fixed DPI (worse). The correct approach requires a reference object in the room image or a user-provided room dimension.

**How to avoid:**
Require the user to provide at least one room dimension (e.g., "the wall in this photo is approximately X meters wide") or use a reference object (standard door is 2m × 0.9m). From the reference, calculate a pixels-per-cm ratio for that image. Apply that ratio to compute artwork pixel dimensions. Validate by showing a labeled ruler overlay before final composition. For AI inpainting pipelines, pass exact pixel bounding boxes to ControlNet — do not let the model "guess" scale.

**Warning signs:**
- Users describe artwork as "way too small" or "huge" compared to expectations
- The composition logic does not ask for any room measurement input
- Artwork pixel size is computed from artwork cm alone without a room reference

**Phase to address:** AI Composition (Consumer) phase — must be designed correctly from first implementation. A retrofit is expensive.

---

### Pitfall 6: Supabase RLS Not Enabled on Artwork / Bid Tables

**What goes wrong:**
Private artworks (draft status, not yet published), artist personal data, bid amounts, and bidder identities are accessible to any authenticated — or even anonymous — client hitting the Supabase REST API directly. Any user who inspects network traffic and crafts a direct Supabase API call can read all rows.

**Why it happens:**
Supabase creates tables with RLS disabled by default. Developers build the frontend, it works, they ship. They never test what an API call with only the `anon` key can access. 83% of exposed Supabase databases involve RLS misconfigurations (source: vibeappscanner.com).

**How to avoid:**
Enable RLS on every table at creation time — make it a migration template rule. Write explicit policies:
- `artworks`: public can read `status = 'available'`; artist can read/write own rows
- `bids`: bidder can read own bids; public can read `current_bid` on auction row only — **never expose other bidders' identities or amounts to competitors**
- `users`: each user reads own row only
Test policies with the Supabase client using an actual anon/user JWT, not the SQL editor (which bypasses RLS). Also apply Storage bucket policies: artwork original files should be private; only processed/watermarked versions are public.

**Warning signs:**
- You have never run `SELECT * FROM artworks` with only the anon key to verify what it returns
- Tables were created without an explicit RLS migration
- Views exist that join sensitive tables (views bypass RLS by default)

**Phase to address:** Foundation / Database schema phase — set up before any data is created. Retrofitting RLS on existing tables with data is error-prone.

---

### Pitfall 7: AI Inference Cost Runaway

**What goes wrong:**
Every artwork upload triggers a Stable Diffusion promotional mockup generation. Every consumer room upload triggers a ControlNet composition. Without rate limiting, a single artist can upload 100 artworks in a session, generating 100 SD inference jobs at ~$0.05-$0.20 each. During a product launch spike, 1,000 users each triggering 2-3 inference calls generates a $200-$600 surprise invoice in hours.

**Why it happens:**
Teams add AI generation as a "fire and trigger" webhook with no per-user quota, no job queue, and no spend cap. They test with 5 images and never model abuse scenarios.

**How to avoid:**
- Implement per-user daily inference quotas (e.g., 5 promotional mockups per artist per day for MVP)
- Queue all inference jobs (use Supabase Edge Functions with a `jobs` table, or a simple queue service) — never call SD API inline in a request handler
- Set hard spend caps in the inference provider's dashboard (Replicate, Modal, Runware all support this)
- Store generated images in Supabase Storage and reuse — never regenerate if the source image and parameters haven't changed
- For the consumer room visualization: run on-demand only (user clicks a button), not automatically on every page view

**Warning signs:**
- AI generation is triggered in a Next.js API route with `await inferenceCall()` with no queue
- No `ai_jobs` or equivalent rate-limiting table exists
- No spend alert is configured in your inference provider's billing dashboard

**Phase to address:** AI Integration phase (both promotional and consumer visualization) — quota design must precede any production traffic

---

### Pitfall 8: Supabase Realtime Bid Loss During WebSocket Reconnection

**What goes wrong:**
A bidder's WebSocket drops for 2 seconds (mobile network jitter, background tab throttling). Supabase Realtime auto-reconnects. During those 2 seconds, 3 new bids arrived. The client never receives them. The bidder sees a stale bid price, believes they are still winning, and does not re-bid. Another user wins at a price the first bidder would have topped. The bidder is angry — the UI "lied" to them.

**Why it happens:**
Supabase Realtime Broadcast has fire-and-forget semantics — it does not guarantee delivery. Teams use Broadcast for bids because it's simpler, without realizing it provides no persistence or replay on reconnect. Even Postgres Changes subscription can miss events if the client was disconnected when the change occurred.

**How to avoid:**
- Use Postgres Changes (not Broadcast) for bids — at least writes are guaranteed to the database
- On reconnect, always fetch the current auction state via a REST call before resuming subscription: `GET /auctions/:id` to get the latest `current_bid` and `end_at`
- Show a "reconnecting..." UI state so bidders know to wait
- Use `worker: true` option in Supabase Realtime client to prevent heartbeat throttling in background tabs

**Warning signs:**
- You use `supabase.channel().on('broadcast', ...)` for bid price updates
- There is no HTTP fallback fetch after a reconnection event
- The UI shows a static countdown timer with no re-sync after visibility change

**Phase to address:** Auction / Real-Time Bidding phase

---

### Pitfall 9: Artwork Image Storage Cost Explosion (High-Resolution Originals)

**What goes wrong:**
Artists upload 50MB raw scans of paintings. Over 500 artworks, that's 25GB of storage plus egress every time a page loads the image. Supabase Storage egress costs $0.021/GB — a single viral gallery page serving original files to 10,000 visitors costs hundreds of dollars in bandwidth alone.

**Why it happens:**
Teams store and serve the original upload URL directly in `<img>` tags. No resizing pipeline. No CDN optimization. The original file is served for every request including thumbnails.

**How to avoid:**
- On upload, generate multiple sizes: thumbnail (400px), display (1200px), original (stored privately). Never serve original to public pages.
- Use Supabase Storage Image Transformations (`?width=1200&format=webp`) for on-the-fly resizing — the Smart CDN caches transformed variants.
- Set a file size limit at upload (e.g., max 15MB per artwork image) with client-side and server-side validation.
- Store originals in a private bucket; serve only watermarked/transformed public variants.

**Warning signs:**
- Image `src` attributes point to signed Supabase URLs with no `?width=` transform parameters
- No file size validation on the artwork upload form
- Storage bucket containing original artwork files is set to public

**Phase to address:** Artwork Upload / Artist Registration phase (upload pipeline must handle this from day one)

---

### Pitfall 10: Auction Winner Non-Payment — No Fallback

**What goes wrong:**
Auction closes. Winner is notified. Winner's card declines on capture (expired card, insufficient funds). The artwork is now in limbo: not available for sale, winner hasn't paid, artist is waiting. No automated resolution exists. Manual customer support intervention is needed for every failure.

**Why it happens:**
Teams implement the happy path: auction ends → charge winner → done. They don't model payment failure, winner abandonment, or the 48-hour window where the winner simply doesn't respond.

**How to avoid:**
- At auction close, attempt authorization (not capture) immediately. If authorization fails, immediately fall back to the second-highest bidder.
- If authorization succeeds, give the winner a payment window (e.g., 48 hours) to confirm. Capture at confirmation.
- After the payment window, if not captured, void the authorization and contact the second-highest bidder.
- Store all bidder history — not just the winner — so fallback is possible.
- Send automated follow-up emails at: close, +24h warning, +48h expiry.

**Warning signs:**
- `bids` table stores only `winner_id` — no full bid history with bidder contact info
- Auction close handler fires a single charge and has no catch/fallback branch
- No `payment_deadline_at` column exists on the `auctions` table

**Phase to address:** Auction close + Payment integration phase

---

### Pitfall 11: Artist Identity / Artwork Copyright Not Verified

**What goes wrong:**
Anyone registers as an artist and uploads other artists' works. Fraudulent "originals" are sold. Real artists find their work being auctioned without their consent. Buyers purchase "originals" that are copies. When discovered, the platform faces legal liability and severe reputation damage.

**Why it happens:**
Copyright verification is invisible until it fails. MVP teams defer it indefinitely. The problem is low-frequency but high-severity — one public fraud incident can kill a platform.

**How to avoid:**
For MVP, implement minimum viable verification:
- Require artist phone/ID verification at registration (e.g., Toss Certification / NICE 본인인증)
- Artists sign a declaration of ownership at upload (stored, timestamped)
- Add a DMCA-style "report this artwork" mechanism for the public
- Watermark all publicly displayed images so unauthorized copies are traceable

Full blockchain provenance is out of scope for v1 but the above provides defensible due diligence.

**Warning signs:**
- Artist registration requires only email + password — no identity verification
- No ownership declaration checkbox on the artwork upload form
- No report/flag mechanism exists for artworks

**Phase to address:** Artist Registration phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Direct SD API call in request handler (no queue) | Faster to build | Timeouts, cost runaway, no retry | Never in production |
| Serve original artwork files publicly | No resizing pipeline needed | Storage egress costs, no watermarking | Never |
| Skip RLS for MVP speed | Faster table creation | Any user can read all data | Never |
| No bid history, only winner | Simpler schema | No fallback buyer, no dispute resolution | Never |
| Fixed auction `end_at` with no anti-snipe | Simpler timer | Seller distrust, artist churn | Only if you accept this as a product decision |
| Status check + update as separate queries | Easy to read code | Single-item race conditions | Never for unique inventory |
| Optimistic UI bid update (show bid before server confirms) | Snappier UX | Can display wrong price if bid is rejected | Acceptable only if rollback on rejection is implemented |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Toss Payments / Stripe | Immediately capture payment at auction close | Authorize at close, capture after winner confirms; handle card decline with second-bidder fallback |
| Supabase Realtime | Using Broadcast channel for bid price | Use Postgres Changes subscription; always re-fetch on reconnect |
| Supabase Storage | Serving original upload URL in `<img>` | Use Image Transformation API with `?width=N&format=webp`; private bucket for originals |
| Supabase RLS | Testing policies in SQL editor (bypasses RLS) | Test with client SDK using anon/user JWT token |
| Stable Diffusion / Replicate | Inline `await` inference in API route | Queue jobs via a `jobs` table; poll status; never block HTTP response on inference |
| Resend / SendGrid | Fire-and-forget email with no delivery tracking | Log email events; retry on soft bounce; do not silently swallow send errors |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No index on `artworks.status` | Gallery page query times out during browse | Add `CREATE INDEX ON artworks(status)` | ~500+ artworks |
| No index on RLS policy columns (`artist_id`, `bidder_id`) | All queries slow after RLS enabled | Index every column referenced in policy `USING` clauses | From day one with RLS |
| Realtime subscription on the entire `bids` table | All clients receive every bid on every auction | Filter subscription with `filter: 'auction_id=eq.X'` | ~10 concurrent auctions |
| AI inference blocking HTTP response | Request times out at 30s; Vercel kills the function | Queue inference async; return job ID immediately; client polls for result | First inference call over 30s |
| No pagination on artwork gallery | Page load time grows linearly with catalog size | Implement cursor-based pagination from day one | ~100+ artworks |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Supabase `service_role` key in client-side code | Full database access bypassing all RLS | Never expose `service_role` key; use only in server-side Edge Functions |
| Bid amount validation only on client | Users submit negative bids or bids below current price | Validate all bid constraints in a Postgres function or Edge Function, not in the browser |
| No auction ownership check on "cancel auction" endpoint | Any user can cancel any artist's auction | RLS policy: `artist_id = auth.uid()` on all mutation operations |
| Serving signed URLs with long TTL for private artworks | Private draft artworks accessible via shared link indefinitely | Use short-lived signed URLs (< 1 hour) for private content |
| No rate limit on AI generation endpoints | Cost runaway via automated abuse | Per-user daily quota enforced server-side; 429 on excess |
| Bidder identities visible via API | Bid snipers can target specific users | Never expose `bidder_id` on public-facing auction queries; return only `current_bid` amount |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Scale visualization with no room reference input | Users see artwork at wrong physical size; loses trust | Prompt for at least one room dimension or reference object identification |
| Auction countdown timer not synced with server | Client clock drift causes "auction closed" to appear at wrong time | Compute countdown from server `end_at` timestamp, not client-side duration |
| No "reconnecting" state during WebSocket drop | Users think bid prices are live when they're stale | Show explicit connection status indicator with timestamp of last update |
| Immediate payment required after auction close | Winners feel pressured; card declines create chaos | Show a 48-hour payment window with clear instructions |
| AI promotional mockup generation blocks upload flow | Artists wait 30+ seconds staring at a spinner | Generate mockup async; show placeholder; notify when ready |
| No bid confirmation step | Fat-finger bids on mobile; disputes over accidental bids | Require explicit confirmation dialog before submitting bid with amount shown |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auction system:** Concurrent bid protection — verify with two browser sessions placing simultaneous bids and check that exactly one wins
- [ ] **Fixed-price checkout:** Single-item race — verify two users checking out the same artwork simultaneously results in exactly one sale
- [ ] **RLS policies:** Verify anon key returns no private rows — run `supabase.from('artworks').select('*')` with only the anon key
- [ ] **AI composition:** Scale accuracy — verify with a known-size reference object in a photo that artwork renders at correct cm ratio
- [ ] **Auction anti-snipe:** Place a bid within the final 5 minutes — verify `end_at` is extended
- [ ] **Payment capture:** Simulate card decline after authorization — verify fallback to second bidder is triggered
- [ ] **Storage:** Verify original artwork files are in a private bucket and not accessible via public URL
- [ ] **Realtime reconnect:** Disconnect network mid-auction — verify UI shows stale state indicator and re-fetches on reconnect
- [ ] **AI rate limiting:** Trigger 10+ image generation requests in rapid succession — verify 429 response after quota exceeded
- [ ] **Email delivery:** Verify auction close emails send to both artist and winner with correct data

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Concurrent bid race discovered in production | HIGH | Audit bid log for anomalies; issue refund to affected party; deploy `SELECT FOR UPDATE` fix in emergency release; manually resolve disputed auction |
| Double-sold artwork | HIGH | Refund one buyer immediately; compensate with credit; artist decision on who receives the piece; audit all checkout transactions |
| AI cost runaway | MEDIUM | Disable AI endpoint immediately; review invoice; negotiate with provider; deploy rate limiting before re-enabling |
| RLS misconfiguration exposed data | HIGH | Audit Supabase logs for unauthorized access; notify affected users per data breach requirements; fix RLS immediately; consider legal consultation |
| Payment captured but artist cannot ship | MEDIUM | Refund buyer; platform covers transaction fees; flag artist account |
| Auction end_at manipulation bug | MEDIUM | Extend auction manually; notify all bidders of corrected close time; deploy fix |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Concurrent bid lost-update | Phase: Auction / Realtime Bidding | Two simultaneous bid test returns exactly one winner |
| Single-item checkout race | Phase: Checkout / Payment | Two simultaneous checkouts return one sale, one 409 |
| Payment authorize/capture flow | Phase: Payment Integration | Simulate card decline; verify second-bidder fallback triggers |
| Bid sniping (no anti-snipe) | Phase: Auction Design (schema must include `end_at` extensibility) | Bid in final 5 min; verify end_at extends |
| AI scale math error | Phase: AI Composition (Consumer) | Known-size reference object renders at correct cm in test image |
| Supabase RLS not enabled | Phase: Foundation / Database Schema | Anon key REST call returns 0 private rows |
| AI inference cost runaway | Phase: AI Integration | >5 requests/user/day returns 429; spend cap set in provider |
| Realtime bid loss on reconnect | Phase: Auction / Realtime Bidding | Disconnect + reconnect mid-auction; verify UI re-syncs to correct price |
| Storage egress cost (high-res originals) | Phase: Artwork Upload | Original files inaccessible via public URL; transformed URLs used in all img tags |
| Auction winner non-payment | Phase: Auction Close + Payment | Card decline simulation triggers second-bidder flow within 48h |
| Artist copyright / identity fraud | Phase: Artist Registration | Artist cannot complete registration without identity verification step |

---

## Sources

- [PostgreSQL Explicit Locking — SELECT FOR UPDATE](https://www.postgresql.org/docs/current/explicit-locking.html) — HIGH confidence
- [Supabase RLS Common Pitfalls — ProsperaSoft](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/) — MEDIUM confidence
- [Supabase RLS Misconfiguration Risks — Stingrai](https://www.stingrai.io/blog/supabase-powerful-but-one-misconfiguration-away-from-disaster) — MEDIUM confidence
- [Supabase Realtime Reconnection Strategies — EastonDev](https://eastondev.com/blog/en/posts/dev/supabase-realtime-practice/) — HIGH confidence (official Supabase documentation referenced)
- [Supabase Realtime Silent Disconnections](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) — HIGH confidence (official)
- [Supabase Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) — HIGH confidence (official)
- [Stripe Place a Hold — Authorize and Capture](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) — HIGH confidence (official)
- [Vendure Race Condition — Limited Stock Checkout](https://github.com/vendure-ecommerce/vendure/issues/3065) — HIGH confidence (real-world documented issue)
- [Toss Payments Authorization and Capture Flow](https://docs.tosspayments.com/en/overview) — HIGH confidence (official)
- [eBay Auction Bidding Race Conditions and Fraud Prevention](https://www.frugaltesting.com/blog/inside-ebays-real-time-auction-system-bidding-logic-algorithms-fraud-prevention-techniques) — MEDIUM confidence
- [Auction Sniping Prevention — InfiSecure](https://www.infisecure.com/resources/knowledge-hub/auction-sniping-prevention) — MEDIUM confidence
- [Rate Limiting AI API Routes in Next.js](https://dev.to/whoffagents/how-to-rate-limit-your-ai-api-routes-in-nextjs-2d3) — MEDIUM confidence
- [Securing AI Apps with Rate Limiting — Vercel](https://vercel.com/kb/guide/securing-ai-app-rate-limiting) — HIGH confidence (official)
- [Stable Diffusion API Pricing — AI Image Detector](https://www.aiimagedetector.com/blog/stable-diffusion-api) — LOW confidence (third-party, pricing changes)
- [AR Scale Accuracy — Happy Measure Research](https://www.researchgate.net/publication/261444060_Happy_Measure_Augmented_Reality_for_Mobile_Virtual_Furnishing) — MEDIUM confidence

---

*Pitfalls research for: Art e-commerce + real-time auction + AI image composition (ArtBridge)*
*Researched: 2026-05-10*
