---
phase: 01-foundation
plan: 01
subsystem: bootstrap
tags: [next.js, tailwind, supabase, shadcn, typescript, biome, vitest]
dependency_graph:
  requires: []
  provides:
    - next-js-app-shell
    - supabase-clients
    - tailwind-v4-design-tokens
    - shadcn-ui-components
    - proxy-ts-session-refresh
  affects:
    - all-subsequent-plans
tech_stack:
  added:
    - next@16.2.6
    - react@19
    - "@supabase/supabase-js@2.105.4"
    - "@supabase/ssr@0.10.3"
    - tailwindcss@4.x
    - "@tailwindcss/postcss"
    - "@biomejs/biome@2.4.15"
    - vitest@4.1.5
    - zod@4.4.3
    - "@hookform/resolvers@5.2.2"
    - zustand
    - lucide-react
    - "@fontsource/pretendard"
    - shadcn@4.7.0
    - "@base-ui/react"
    - class-variance-authority
    - tailwind-merge
    - clsx
  patterns:
    - "App Router with proxy.ts (not middleware.ts)"
    - "CSS-first Tailwind v4 config (no tailwind.config.js)"
    - "OKLCH design tokens in globals.css"
    - "Supabase SSR cookie-based auth session"
    - "getClaims() for JWT verification (not getSession)"
key_files:
  created:
    - proxy.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/supabase/proxy.ts
    - src/lib/supabase/database.types.ts
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/card.tsx
    - src/components/ui/form.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/alert.tsx
    - src/lib/utils.ts
    - components.json
    - biome.json
    - vitest.config.ts
    - postcss.config.mjs
    - next.config.ts
    - tsconfig.json
    - package.json
    - .env.local.example
    - .gitignore
  modified: []
decisions:
  - "Used @fontsource/pretendard (not @fontsource-variable/pretendard which does not exist on npm)"
  - "shadcn Button uses @base-ui/react (no asChild support); landing page CTAs use buttonVariants() on <Link> instead"
  - "shadcn@4.7.0 defaulted to base-nova style; components.json updated to new-york per plan requirement"
  - "proxy.ts updateSession returns supabaseResponse unchanged in Plan 01; role-based redirects deferred to Plan 04 with TODO(plan-04) markers"
  - "getClaims() confirmed available in @supabase/auth-js bundled by @supabase/supabase-js@2.105.4"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-10"
  tasks_completed: 3
  tasks_total: 4
  files_created: 25
  files_modified: 0
---

# Phase 1 Plan 01: Bootstrap & Dev Environment Summary

One-liner: Next.js 16 + Tailwind v4 + Supabase SSR clients + shadcn/ui (new-york/neutral) + Pretendard font + OKLCH brand tokens bootstrapped with `proxy.ts` calling `getClaims()` for JWT verification.

## Tasks Completed

| Task | Status | Commit | Description |
|------|--------|--------|-------------|
| 1 | Complete | 4feb970 | Scaffold Next.js 16, install all locked deps, create landing page |
| 2 | Complete | eca762f | Create Supabase clients (browser, server, admin, proxy) + root proxy.ts |
| 3 | Complete | 814ccda | shadcn/ui init + 7 Phase 1 components |
| 4 | CHECKPOINT | — | User runs supabase login + supabase start (requires Docker) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Deviation] @fontsource-variable/pretendard not on npm**
- **Found during:** Task 1
- **Issue:** `@fontsource-variable/pretendard` returns 404 from npm registry — package does not exist
- **Fix:** Used `@fontsource/pretendard` (non-variable version, `@fontsource` scope)
- **Files modified:** `package.json`, `src/app/globals.css`
- **Impact:** Font loads correctly; variable-font weight interpolation unavailable but 400/600 weights specified in UI-SPEC work fine

**2. [Rule 1 - Deviation] shadcn@4.7.0 uses @base-ui/react instead of Radix Slot**
- **Found during:** Task 3
- **Issue:** Newest shadcn version ships Button using `@base-ui/react` (not Radix); `asChild` prop is unsupported, causing TypeScript error
- **Fix:** Landing page CTAs use `buttonVariants()` applied to `<Link>` directly instead of `<Button asChild><Link>` pattern
- **Files modified:** `src/app/page.tsx`
- **Impact:** Visual result identical; `buttonVariants` is the shadcn-idiomatic approach for link-as-button

**3. [Rule 1 - Deviation] shadcn@4.7.0 defaulted to base-nova style**
- **Found during:** Task 3 verification
- **Issue:** shadcn `--defaults` flag selected `base-nova` style (new default in 4.7.0), not `new-york`
- **Fix:** Updated `components.json` `"style"` field to `"new-york"` per plan requirement
- **Files modified:** `components.json`
- **Impact:** Components already installed use the same Radix/CVA patterns; style field is metadata for future `npx shadcn add` calls

## Must-Have Verification Results

| Check | Result |
|-------|--------|
| `npm run build` succeeds | PASS |
| `npx tsc --noEmit` zero errors | PASS |
| `proxy.ts` exports `proxy` (not `middleware`) | PASS |
| `src/lib/supabase/proxy.ts` uses `getClaims()` | PASS |
| No `NEXT_PUBLIC_SUPABASE_ANON_KEY` references | PASS |
| `<html lang="ko">` in layout.tsx | PASS |
| `@tailwindcss/postcss` in postcss.config.mjs | PASS |
| No `tailwind.config.js` | PASS |
| No `middleware.ts` | PASS |
| `.env.local.example` uses PUBLISHABLE_KEY | PASS |
| `admin.ts` SERVER-ONLY JSDoc warning | PASS |
| `components.json` new-york + neutral | PASS |
| 7 Phase 1 shadcn components exist | PASS |

## Key Configuration

### Environment Variables (canonical names)
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
NEXT_SITE_URL=http://localhost:3000
```

### Dependency Versions (pinned)
```
next@16.2.6
@supabase/supabase-js@2.105.4
@supabase/ssr@0.10.3
zod@4.4.3
@hookform/resolvers@5.2.2
@biomejs/biome@2.4.15
vitest@4.1.5
```

## Task 4 Checkpoint Details

**What is needed from the user:**

1. Ensure Docker Desktop is running (`docker ps` should succeed)
2. Run `npx supabase init` in the project root (accepts defaults — creates `supabase/config.toml`)
3. Run `npx supabase start` — pulls images and boots the local stack (~1–3 min first time)
4. After `supabase start` completes, copy printed values into `.env.local`:
   - `API URL` → `NEXT_PUBLIC_SUPABASE_URL` (should be `http://127.0.0.1:54321`)
   - `anon key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
5. Verify: `npm run dev` → http://localhost:3000 shows Korean landing page with no console errors
6. Verify: `curl http://127.0.0.1:54321/rest/v1/` returns JSON

**Reply "approved" once `.env.local` is filled in and `npm run dev` renders the landing page.**

## Known Stubs

None that block plan goal. `src/lib/supabase/database.types.ts` contains `export type Database = any` — this is an intentional placeholder until PLAN-02 generates real types via `npm run supabase:types`.

## Threat Flags

No new security surface introduced beyond what the threat model covers.

- T-01-01 (service role key): admin.ts uses `SUPABASE_SERVICE_ROLE_KEY` without `NEXT_PUBLIC_` prefix + SERVER-ONLY JSDoc — MITIGATED
- T-01-02 (getClaims): proxy.ts uses `getClaims()` exclusively — MITIGATED  
- T-01-03 (no middleware.ts): only proxy.ts at project root — MITIGATED
- T-01-04 (PUBLISHABLE_KEY naming): all code uses canonical `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — MITIGATED
- T-01-05 (.env.local gitignored): .gitignore includes `.env.local` and `.env*.local` — MITIGATED

## Self-Check

- [x] proxy.ts exists at project root — FOUND
- [x] src/lib/supabase/proxy.ts exists — FOUND
- [x] src/lib/supabase/server.ts exists — FOUND
- [x] src/lib/supabase/client.ts exists — FOUND
- [x] src/lib/supabase/admin.ts exists — FOUND
- [x] All 7 shadcn components exist — FOUND
- [x] Commit 4feb970 (Task 1) — EXISTS
- [x] Commit eca762f (Task 2) — EXISTS
- [x] Commit 814ccda (Task 3) — EXISTS

## Self-Check: PASSED
