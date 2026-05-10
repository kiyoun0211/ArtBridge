---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-10T04:36:00.000Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 5
  completed_plans: 0
  percent: 4
---

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
| Active Plan | 01 (01-01 at checkpoint) |
| Phase Status | In Progress |
| Overall Progress | 0/6 phases complete |

```
Progress: [#         ] 4%
Phase: 01 (foundation) — IN PROGRESS
Plan: 1 of 5 — CHECKPOINT (Task 4: supabase start)
```

## Phase Sequence

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | In Progress |
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
| Plans written | 5 |
| Plans completed | 0 (01-01 at checkpoint) |

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
- Used `@fontsource/pretendard` (not variable variant — doesn't exist on npm)
- shadcn Button uses `buttonVariants()` on `<Link>` (asChild not supported in @base-ui/react version)
- `proxy.ts` updateSession: getClaims() only; role redirects deferred to Plan 04

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
- Action: Executed Plan 01-01 Tasks 1-3 (Next.js scaffold, Supabase clients, shadcn/ui); halted at Task 4 checkpoint (supabase start requires Docker + user auth)
- Stopped At: Task 4 checkpoint in 01-01-PLAN.md
- Resume File: .planning/phases/01-foundation/01-01-PLAN.md (Task 4 human-action)

### On Next Session Start

1. Check this file for current position
2. User confirms Docker is running and supabase start completed
3. Fill in `.env.local` with keys from `supabase start` output
4. Run `npm run dev` to verify landing page
5. Reply "approved" to resume execution
6. Continue to Plan 01-02 (Supabase schema migrations + RLS)
