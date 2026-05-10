# Feature Research

**Domain:** Art e-commerce + real-time auction + AI space visualization marketplace
**Researched:** 2026-05-10
**Confidence:** HIGH (table stakes verified against Saatchi Art, Artsy, LiveAuctioneers, Catawiki, Wayfair, IKEA Place; differentiators verified against AI mockup tool ecosystem)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Role-based auth (artist / buyer) | Every marketplace has separate seller and buyer flows | LOW | Supabase Auth with role column (`artist` / `consumer`) on `users`. Email+password at minimum; OAuth optional for v1 |
| Artist artwork listing (photo + dimensions) | Core supply-side function; without it there is nothing to buy | LOW | Must capture width + height in cm — these feed scale calculation. Status: `available / auctioning / sold` |
| Artwork detail page (image, size, price, artist) | Buyers decide here; sparse detail pages drive abandonment | LOW | Must show physical dimensions prominently — buyers care if it fits their wall |
| Artwork search & filter | Users expect to find things by style, size, price, medium | MEDIUM | Postgres full-text search is sufficient for v1; faceted filters on price range, dimensions, sale type |
| Fixed-price (정찰제) immediate purchase | Half the catalog uses this model; missing it limits supply | LOW | Single-unit stock model means no cart needed — each artwork is unique, direct checkout |
| Checkout and payment | Users expect to pay online safely | MEDIUM | Toss Payments (Korea-first) or Stripe; no custom PG. Redirect flow acceptable for v1 |
| Real-time auction bidding with live current price | Core auction UX; static page bidding feels broken | HIGH | Supabase Realtime subscriptions on `auctions.current_bid`. Optimistic UI for bid placement |
| Outbid notification (email + in-app) | Buyers leave the page; they expect to be called back | MEDIUM | Email via Resend; in-app via Supabase Realtime channel. Required or bidders disengage |
| Anti-sniping time extension | Standard on Catawiki, TradeMe, most curated auction platforms; absence feels unfair | MEDIUM | Extend auction end_at by N minutes (suggest 3–5 min) on any bid placed in final window. Pure DB logic — no external service needed |
| Auction end → winner auto-determination | Without this, staff must manually close auctions | LOW | Scheduled function (Supabase Edge Function + pg_cron) reads `auctions` where `end_at < now()` and `winner_id IS NULL`, sets winner |
| Winner payment flow trigger | Winning bidder must pay; no friction = no revenue | MEDIUM | On auction close, email winner with payment link. Payment same gateway as fixed-price |
| Watchlist / saved artworks | Artsy, Saatchi Art, LiveAuctioneers all have this; absence is jarring | LOW | Simple join table `watchlist(user_id, product_id)`. UI: heart icon on listing cards |
| Transactional email notifications | Artsy, Saatchi Art: sale confirmed, auction won, outbid alerts | LOW | Resend or SendGrid. Events: purchase complete, auction won (artist + buyer), outbid, auction ending soon |
| Order history / status tracking | Buyers want to know what happens after payment | LOW | `orders` table with status (`paid / shipped / delivered`). Artist manually marks shipped for v1 |
| Artist sales dashboard | Artists need to know what sold, pending shipment, earnings | LOW | Simple list view of their products with status. Revenue summary optional for v1 |
| Basic dispute / return contact path | Art buyers expect some recourse on wrong/damaged item | LOW | Not a full dispute system for v1 — a contact form or email to support is sufficient. Full resolution workflow is v2 |

---

### Differentiators (Competitive Advantage)

These align directly with ArtBridge's core value proposition. Build these well or the platform has no reason to exist over Saatchi Art.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Consumer space mockup — scale-accurate compositing | No mainstream art marketplace does this. Wayfair/IKEA do it for furniture, not original art. Reduces purchase anxiety and increases conversion. AR return-rate reduction documented at 22–40% (Wayfair internal data) | HIGH | User uploads room photo. System places artwork at correct physical scale derived from artwork cm + room reference point. Scale calculation: estimate wall depth from photo or require user to tap a reference object. Stable Diffusion inpainting for blending. This is the platform's single most important feature |
| AI promotional mockup for artists (홍보용 목업) | Artists lack professional photography. Auto-generating a styled background image turns every submission into gallery-quality marketing material instantly | HIGH | Triggered on artwork upload. Input: flat artwork photo. Output: artwork composited on styled interior scene (neutral wall, gallery light). ControlNet for depth/lighting preservation. Claid.ai / Mokker.ai patterns are the reference — but this is done in-product, not outsourced |
| Physical scale accuracy engine | Most visualization tools are approximate. ArtBridge must be exact because art size on a wall is a purchase decision factor | HIGH | Core math: artwork physical cm → pixel size given estimated room scale. Requires either (a) user provides room reference object with known size, or (b) ML-based depth estimation. Approach A is simpler and more reliable for v1 |
| Unique-artwork auction model (1 work = 1 lot) | Creates genuine scarcity and collector urgency. Saatchi Art sells editions; ArtBridge sells originals only. This positions every auction as a true collector event | LOW (policy, not engineering) | Enforced by schema: no `quantity` field, status transitions are one-way. Communicate clearly on listing pages |
| Real-time bid counter with seat-of-your-pants UX | Artsy's auction UI feels slow; LiveAuctioneers is desktop-only. A mobile-first, live-updating bid screen with countdown timer creates genuine excitement | MEDIUM | Supabase Realtime on `auctions` row. Countdown timer in client. Optimistic bid placement with rollback on conflict |
| Recommendation: "You might also like" by style/medium | Artsy uses this. For art, browsing → discovering is a core behavior | MEDIUM | For v1: simple similarity by tags/medium/artist. Full embedding-based similarity (ResNet/CLIP) is v2. Tag-based is good enough to validate the pattern |

---

### Anti-Features (Deliberately NOT Building)

These are features that seem sensible but contradict ArtBridge v1's constraints or dilute focus.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-edition / print sales | Artists want more revenue; buyers want affordable entry points | Contradicts the unique-artwork model that makes auctions meaningful. Inventory/SKU complexity explodes the schema. Saatchi Art already owns this market | Keep editions out of scope. Artists can price originals lower instead |
| Social feed (follow, like, comment) | "Instagram for art" sounds appealing | Requires moderation, content ranking, retention loops — none of which are the core value. Diverts engineering from visualization + auction quality | Surface artist portfolio page as a lightweight profile. No feed |
| NFT minting / blockchain provenance | Buyers ask about it; sounds modern | NFT market is collapsed. Blockchain adds no verified benefit over a simple provenance record in Postgres. Regulatory/legal complexity in Korea | Simple text provenance field on artwork listing is sufficient |
| KYC / AML identity verification at signup | Required by EU AML directive above €10,000; referenced in art market compliance literature | Korean domestic market + MVP scale: not triggered unless transaction values exceed regulatory thresholds. Premature compliance blocks signup conversion | Add a flag field to trigger KYC workflow at high-value thresholds in v2. For v1, email verification is sufficient |
| Automated shipping / logistics integration | Buyers want tracking numbers | Art shipping is highly irregular (size, fragility, custom crating). Integration with couriers adds ops complexity disproportionate to v1 scale | Artist enters tracking number manually; system emails it to buyer |
| In-app messaging between artist and buyer | Looks helpful for negotiation | Negotiation undermines fixed-price and auction integrity. Off-platform comms also create support blind spots | Contact path via email only. No in-app chat |
| Reserve price (비공개 최저가) | Common on Catawiki and Artsy auctions | Adds bidding complexity and can result in no-sale outcomes that damage trust. Artsy reserve handling requires conditional bid logic | Artists set a starting bid that is their minimum. No hidden reserve in v1 |
| Proxy / automatic bidding (최대 입찰가 설정) | eBay and Artsy offer max-bid proxy; bidders expect it | Proxy bidding requires bid increment logic, conflict resolution when two proxies clash, and UI to explain current vs max bid. Significant added complexity for v1 | Manual re-bid flow with real-time outbid alerts is simpler and still functional |

---

## Feature Dependencies

```
[Role-based auth]
    └──required by──> [Artist listing]
    └──required by──> [Consumer purchase / bid]
    └──required by──> [Watchlist]
    └──required by──> [Artist dashboard]
    └──required by──> [Order history]

[Artist listing (photo + dimensions)]
    └──required by──> [Consumer space mockup]        ← dimensions are the input
    └──required by──> [AI promotional mockup]        ← artwork photo is the input
    └──required by──> [Auction bidding]
    └──required by──> [Fixed-price checkout]

[Checkout + payment gateway]
    └──required by──> [Fixed-price purchase]
    └──required by──> [Auction winner payment]

[Auction bidding (Supabase Realtime)]
    └──required by──> [Anti-sniping extension]       ← extension fires on bid event
    └──required by──> [Outbid notification]
    └──required by──> [Auction end / winner auto-determination]

[Auction end / winner auto-determination]
    └──required by──> [Winner payment flow trigger]
    └──required by──> [Transactional email: auction won]

[Scale accuracy engine]
    └──required by──> [Consumer space mockup]        ← core math

[AI promotional mockup]
    └──enhances──> [Artist listing]                  ← auto-generates marketing image on upload

[Consumer space mockup]
    └──enhances──> [Artwork detail page]             ← "See it in your space" CTA
    └──enhances──> [Fixed-price checkout]            ← conversion at decision point
    └──enhances──> [Auction bidding]                 ← emotional investment before bidding

[Recommendation engine]
    └──requires──> [Artist listing] (content exists to recommend)
    └──enhances──> [Artwork detail page]

[Watchlist]
    └──enhances──> [Outbid notification]             ← watched items trigger auction alerts
    └──requires──> [Role-based auth]

[Order history]
    └──requires──> [Checkout + payment]

[Artist dashboard]
    └──requires──> [Artist listing]
    └──requires──> [Order history]
```

### Dependency Notes

- **Consumer space mockup requires Artist listing with dimensions:** Without cm values there is no scale calculation. The listing form must enforce width + height before publish.
- **Anti-sniping requires Supabase Realtime bid events:** The extension logic hooks into the same bid insertion trigger that powers live bidding — no separate system needed.
- **AI promotional mockup enhances listing:** It fires automatically post-upload; artists do not initiate it. Must be async (queue) so listing publish is not blocked.
- **Scale accuracy engine is a prerequisite, not a separate phase:** Space mockup cannot ship without it. They are the same deliverable.
- **KYC (deferred) conflicts with frictionless signup:** If added later, gate it only at payment for high-value lots, not at registration.

---

## MVP Definition

### Launch With (v1)

Minimum viable set to validate the core thesis: "see it in your space before you buy it."

- [ ] Role-based auth (artist / consumer) — without this nothing is personalized
- [ ] Artist artwork listing with photo + physical dimensions — the supply side
- [ ] Artwork search and filter — buyers must be able to discover works
- [ ] Artwork detail page — the decision moment
- [ ] Consumer space mockup (scale-accurate AI compositing) — THE differentiator; skip this and the product is just another Saatchi Art clone
- [ ] Physical scale accuracy engine — prerequisite for space mockup
- [ ] AI promotional mockup for artists — generated on upload, no artist action required
- [ ] Fixed-price purchase + checkout (Toss/Stripe) — half the catalog
- [ ] Real-time auction bidding with live current price — the other half
- [ ] Anti-sniping time extension — fairness is a trust signal
- [ ] Outbid notification (email) — keeps bidders engaged off-page
- [ ] Auction end → winner auto-determination — no manual ops
- [ ] Winner payment flow — revenue completes here
- [ ] Transactional emails (sale, auction won, outbid) — ops backbone
- [ ] Watchlist (heart icon) — low cost, high perceived value

### Add After Validation (v1.x)

Add when v1 usage reveals these are blocking growth.

- [ ] Order status tracking (artist manually marks shipped) — trigger: buyers emailing support asking "where is my order?"
- [ ] Artist sales dashboard with revenue summary — trigger: artists request earnings visibility
- [ ] Tag-based recommendation ("you might also like") — trigger: session depth data shows low browse-to-detail conversion
- [ ] Artist portfolio page (lightweight profile) — trigger: buyers want to see more from an artist they like
- [ ] Dispute contact flow — trigger: first damaged-in-transit complaint

### Future Consideration (v2+)

Defer until product-market fit is confirmed.

- [ ] KYC / AML workflow at high-value thresholds — required if avg transaction grows past regulatory floor
- [ ] Proxy / automatic bidding — only if manual rebid UX proves to be a dropout reason
- [ ] Embedding-based artwork recommendation (CLIP/ResNet) — only if tag-based version shows engagement but poor quality
- [ ] Full dispute resolution system — only at scale where support volume justifies it
- [ ] Mobile app (iOS/Android) — Next.js PWA is sufficient for v1 validation

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Consumer space mockup (scale-accurate) | HIGH | HIGH | P1 — core value, cannot defer |
| Physical scale accuracy engine | HIGH | HIGH | P1 — prerequisite for above |
| Real-time auction bidding | HIGH | HIGH | P1 — half the product |
| Artist artwork listing | HIGH | LOW | P1 — supply side |
| Role-based auth | HIGH | LOW | P1 — everything depends on this |
| Fixed-price checkout | HIGH | MEDIUM | P1 — other half of revenue |
| AI promotional mockup for artists | HIGH | HIGH | P1 — key artist incentive to list |
| Outbid notification | HIGH | MEDIUM | P1 — auction retention |
| Anti-sniping extension | HIGH | LOW | P1 — trust and fairness |
| Auction end auto-determination | HIGH | MEDIUM | P1 — no manual ops |
| Transactional email | HIGH | LOW | P1 — ops backbone |
| Watchlist | MEDIUM | LOW | P1 — low cost, high expectation |
| Artwork search + filter | HIGH | MEDIUM | P1 — discovery |
| Order tracking (manual) | MEDIUM | LOW | P2 — add post-launch |
| Artist dashboard | MEDIUM | LOW | P2 — add post-launch |
| Tag-based recommendation | MEDIUM | MEDIUM | P2 — validate with real usage |
| Dispute contact flow | LOW | LOW | P2 — add on first complaint |
| KYC / AML | LOW | HIGH | P3 — regulatory trigger only |
| Proxy bidding | LOW | HIGH | P3 — complexity not justified for v1 |
| Social feed | LOW | HIGH | P3 — out of scope |
| NFT minting | LOW | HIGH | P3 — out of scope |

---

## Competitor Feature Analysis

| Feature | Saatchi Art | Artsy | LiveAuctioneers / Catawiki | ArtBridge v1 Approach |
|---------|-------------|-------|---------------------------|----------------------|
| Fixed-price sales | Yes | Yes | No (auction-only) | Yes |
| Real-time auction | No | Yes (partner auctions) | Yes (core feature) | Yes — Supabase Realtime |
| Anti-sniping | No | No | Yes (Catawiki: 1-min extension) | Yes — 3–5 min extension |
| Outbid notification | Yes (email) | Yes (SMS + email) | Yes | Yes — email (Resend), in-app via Realtime |
| Watchlist | Yes | Yes ("Watch lot") | Yes | Yes |
| Space visualization (AR/AI) | No | No | No | YES — core differentiator |
| Artist promo mockup | No | No | No | YES — auto-generated on upload |
| Physical scale accuracy | No | No | No | YES — scale engine with cm input |
| Recommendation engine | Basic | Yes (personalized) | No | v1: tag-based; v2: embedding |
| KYC at high value | Light | Yes (for high lots) | Yes | Deferred to v2 |
| Multi-edition / prints | Yes (major feature) | Yes | Yes | Explicitly excluded |
| Social feed | Light (follow artist) | Yes | No | Excluded |
| NFT / blockchain | No | Light | No | Excluded |
| Reserve price | No | Yes | Yes (Catawiki) | Excluded from v1 |
| Proxy bidding | No | Yes | Yes (LiveAuctioneers) | Excluded from v1 |

---

## Sources

- Saatchi Art platform review: [topbubbleindex.com overview](https://www.topbubbleindex.com/blog/saatchi-art-overview/) / [Harvard Digital Innovation case study](https://d3.harvard.edu/platform-digit/submission/saatchi-art-equal-opportunity-to-sell-and-own-original-art/)
- Artsy auction bidding guide: [artsy.net/article/complete-guide-bidding-artsy-auctions](https://www.artsy.net/article/artsy-specialist-complete-guide-bidding-artsy-auctions)
- Artsy watch lot and outbid notifications: [artsy.net/auction-info](https://www.artsy.net/auction-info)
- LiveAuctioneers feature set: [liveauctioneers.com/features](https://www.liveauctioneers.com/features)
- Catawiki anti-sniping (1-min extension): [brickset.com Catawiki auctioneer interview](https://brickset.com/article/22302/interview-with-catawiki-auctioneer)
- IKEA Place 98% scale accuracy: [space10.com IKEA Place](https://space10.com/projects/ikea-place) / [datanext.ai case study](https://www.datanext.ai/case-study/ikea-augmented-reality-furniture/)
- Wayfair View in Room AR: [aboutwayfair.com/augmented-reality](https://www.aboutwayfair.com/augmented-reality-with-a-purpose) / [Engadget coverage](https://www.engadget.com/2019-11-14-wayfair-shopping-app-ar.html)
- AR return-rate reduction 22–40%: [newroom.io virtual try-on guide](https://www.newroom.io/blog/virtual-furniture-try-on-complete-guide-2024)
- KYC / AML in art market: [idenfy.com art market KYC](https://www.idenfy.com/blog/identity-verification-art-market/) / [artlogic.net AML compliance](https://artlogic.net/blog/64-navigating-compliance-in-the-evolving-art-market-how-aml-and-kyc-regulations-are-reshaping-transparency/)
- AI promotional mockup tooling reference: [Mokker.ai](https://mokker.ai/) / [Claid.ai](https://claid.ai/)
- Artsy recommendation personalization: [entrythingy.com best art websites](https://www.entrythingy.com/blog/best-websites-to-sell-your-art-online)
- eBay sniping policy (no anti-sniping): [ebay.com/help/buying/bidding/bid-sniping](https://www.ebay.com/help/buying/bidding/bid-sniping?id=4224)

---

*Feature research for: Art e-commerce + real-time auction + AI space visualization (ArtBridge)*
*Researched: 2026-05-10*
