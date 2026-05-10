---
phase: 1
plan: ui-deploy
type: notes
created: 2026-05-10
---

# Phase 1 — UI-Only Deploy Notes

These notes document the UI-shell build that was created as a Vercel deploy preview
before Supabase Cloud was available. PLAN-03 and PLAN-04 are NOT executed — they will
run later when a Supabase Cloud project exists.

---

## What Was Built (UI Shells)

| Route | File | Description |
|-------|------|-------------|
| `/signup` | `src/app/signup/page.tsx` | Card-centered form with email, password, role toggle (작가/구매자). Client-side Zod validation. Demo alert on submit. |
| `/login` | `src/app/login/page.tsx` | Card-centered form with email and password. Demo alert on submit. Link to /signup. |
| `/auth/callback` | `src/app/auth/callback/page.tsx` | Static placeholder — prevents 404 on email verification links. |
| `/artist` | `src/app/artist/page.tsx` | Stub page with Header + welcome card ("반갑습니다, 작가님"). |
| `/buyer` | `src/app/buyer/page.tsx` | Stub page with Header + welcome card ("반갑습니다, 구매자님"). |
| Header | `src/components/layout/Header.tsx` | ArtBridge wordmark (links to /) + 로그아웃 ghost button (links to /). |

All copy is verbatim from `01-UI-SPEC.md` Copywriting Contract section.

---

## What Was Deferred (Supabase-Dependent)

These items are intentionally NOT built in this UI-shell pass:

| Item | Deferred To |
|------|------------|
| Supabase Auth signup Server Action | PLAN-03 |
| Supabase Auth login Server Action | PLAN-03 |
| Email verification handler at `/auth/callback` | PLAN-03 |
| Session cookie refresh in `proxy.ts` | PLAN-03 |
| Role-based route guards (artist → /login, buyer → /login) | PLAN-04 |
| Cross-role redirects (buyer visiting /artist, vice versa) | PLAN-04 |
| Profiles table read for role detection | PLAN-04 |
| Real logout Server Action | PLAN-04 |
| User name display in welcome cards (currently hardcoded "작가님" / "구매자님") | PLAN-04 |

---

## The proxy.ts Guard

`src/lib/supabase/proxy.ts` has a guard added at the top of `updateSession()`:

```ts
// TODO(plan-03): remove guard once Supabase Cloud is wired.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl || supabaseUrl.startsWith('http://127.0.0.1')) {
  return NextResponse.next()
}
```

**Purpose:** When `NEXT_PUBLIC_SUPABASE_URL` is missing (Vercel UI-only deploy) or points
to local dev (`http://127.0.0.1:...`), `updateSession()` returns early as a no-op instead
of crashing because `createServerClient` would throw on a missing URL.

**How to remove it:** Once Supabase Cloud is configured and PLAN-03 runs, delete the
guard block (the `const supabaseUrl = ...` through `return NextResponse.next()` lines)
and verify `updateSession()` works end-to-end with real credentials.

---

## Vercel Deploy Steps

> Do NOT run these commands — this section is documentation for the orchestrator.

1. Push the branch to GitHub (or connect the repo if not already connected).
2. In the Vercel dashboard, import the `artbridge` project.
3. Framework preset: Next.js (auto-detected).
4. Build command: `npm run build` (default).
5. Output directory: `.next` (default).
6. Environment variables: NONE required for UI-only deploy. The proxy.ts guard
   handles the missing `NEXT_PUBLIC_SUPABASE_URL`.
7. Deploy. All routes (`/`, `/signup`, `/login`, `/artist`, `/buyer`, `/auth/callback`)
   will be statically prerendered and serve without errors.

When Supabase Cloud is ready (PLAN-03/PLAN-04), add these env vars to Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

---

## Commit Log (UI Shells)

| Commit | Message |
|--------|---------|
| `04c7efe` | feat(01-ui): add proxy.ts no-supabase guard for UI-only deploy |
| `ebd7803` | feat(01-ui): add /signup page with mock submit |
| `422c9bf` | feat(01-ui): add /login page with mock submit |
| `a198bb1` | feat(01-ui): add /artist and /buyer stub pages with Header |
| `e4f996f` | feat(01-ui): add /auth/callback placeholder page |

---

## Build Status

All routes pass `npm run build` (Next.js 16.2.6, Turbopack):

```
Route (app)
├ ○ /
├ ○ /_not-found
├ ○ /artist
├ ○ /auth/callback
├ ○ /buyer
├ ○ /login
└ ○ /signup
```

All pages are statically prerendered (○ = Static).
