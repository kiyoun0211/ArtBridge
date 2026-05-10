# ArtBridge — Project State

> Last updated: 2026-05-10 | Auto-maintained by GSD workflow

## Project Reference

**Core Value**: 소비자가 구매 전 작품을 자신의 공간에 정확한 실제 크기로 시뮬레이션하고 확신을 갖고 구매(또는 입찰)할 수 있어야 한다. 시각화 경험이 무너지면 플랫폼 가치 전체가 훼손된다.

**Current Focus**: Phase 1 — Foundation (Auth + Schema + RLS)

## Current Position

| Field | Value |
|-------|-------|
| Active Phase | 1 |
| Phase Name | Foundation |
| Active Plan | None (not started) |
| Phase Status | Not started |
| Overall Progress | 0/6 phases complete |

```
Progress: [          ] 0%
Phase:    1 ▓░░░░░░░░░ 6
```

## Phase Sequence

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Not started |
| 2 | Artwork Listing | Not started |
| 3 | AI Pipelines | Not started |
| 4 | Fixed-Price Purchase | Not started |
| 5 | Real-Time Auction | Not started |
| 6 | Notifications & Watchlist | Not started |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 0/6 |
| Requirements covered | 37/37 |
| Plans written | 0 |
| Plans completed | 0 |

## Accumulated Context

### Key Decisions (Locked)
- Next.js 16 App Router + Supabase (Auth/Postgres/Realtime/Storage) — agreed at init
- Toss Payments for Korean market — agreed at init
- fal.ai (artist promo mockup) + RunPod ComfyUI Serverless (consumer space viz) — agreed at init
- Resend + React Email for transactional email (SendGrid excluded: free tier ended 2025-05)
- All artworks are unique (1 item, no SKU/editions) — status: available/auctioning/sold
- AI inference via async `ai_jobs` queue — never inline in request handlers
- Bid logic entirely inside `place_bid()` Postgres function with SELECT FOR UPDATE — no app-layer bid validation
- RLS enabled on every table from the first migration — no exceptions

### Critical Implementation Constraints
- SEC-01..03 embedded in Phase 1: RLS active before any feature data is written
- AI quota (AIPROMO-04) must be enforced before any AI endpoint is exposed to production traffic
- Scale calculation (AIVIZ-03) must be validated with known-size reference before Phase 3 ships
- Anti-sniping (AUC-03) schema column (`end_at` extensibility) must be in Phase 1 migration, not retrofitted
- Payment idempotency (BUY-04) pattern established in Phase 4 is reused by Phase 5 auction payments

### Research Flags Requiring Prototype/Verification
- Phase 3: fal.ai async queue + ED25519 webhook signature verification
- Phase 3: RunPod ComfyUI ControlNet inpainting end-to-end prototype (scale accuracy)
- Phase 4/5: Toss Payments authorize-then-capture manual capture API (verify Korean docs)
- General: Supabase pg_net availability on chosen plan

### Deferred to v2
- Artist revenue/stats dashboard
- Order tracking detail
- Recommendation engine (tag/embedding)
- KYC/AML
- Proxy bidding / reserve price
- Mobile app

### Open Questions
- (None at roadmap creation — all resolved by research)

## Session Continuity

### Last Session
- Date: 2026-05-10
- Action: Project initialized; roadmap created with 6 phases covering 37 v1 requirements
- Next: Run `/gsd-plan-phase 1` to decompose Phase 1 into executable plans

### On Next Session Start
1. Check this file for current position
2. Confirm active phase and plan
3. Continue from last incomplete plan node
4. If phase complete, run `/gsd-transition`
