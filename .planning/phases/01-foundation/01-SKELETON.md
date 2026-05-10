---
phase: 01-foundation
type: walking-skeleton
created: 2026-05-10
---

# ArtBridge — Walking Skeleton

> The thinnest end-to-end vertical slice that proves the architecture works.
> Subsequent phases build on these locked decisions WITHOUT renegotiating them.

## User Story

**As a** new ArtBridge user (artist or buyer), **I want to** sign up with email/password, log in, land on my role's home page, and log out, **so that** I trust the platform's identity layer and the team can ship feature data on top of a verified-secure foundation.

## End-to-End Slice

Browser (signup form) → Next.js Server Action → Supabase Auth (`signUp`) → Postgres trigger (`handle_new_user`) → `profiles` table (with RLS) → cookie set via `proxy.ts` → redirect to `/artist` or `/buyer` route group → role-gated layout reads `profiles` via RSC server client → renders welcome page → logout Server Action clears cookie → redirect to `/`.

A single happy-path Playwright test exercises the full slice. A Vitest suite asserts RLS denies anon-key access to private rows on every table.

## Locked Architectural Decisions

These decisions are made now, in Phase 1, and are NOT revisited in later phases.

### Framework & Runtime
| Decision | Value | Rationale |
|----------|-------|-----------|
| Frontend framework | Next.js 16.2.6 (App Router) | CLAUDE.md locked; `proxy.ts` not `middleware.ts` |
| Runtime | Node.js 20.9+ | Next.js 16 minimum |
| Bundler | Turbopack (default) | Next.js 16 default |
| Language | TypeScript 5.x (strict) | CLAUDE.md locked |
| Styling | Tailwind CSS v4 (CSS-first config) | CLAUDE.md locked; `@tailwindcss/postcss` in `postcss.config.mjs` |
| UI primitives | shadcn/ui (new-york style, neutral base) | UI-SPEC locked |
| Icon library | lucide-react | UI-SPEC locked |
| Font | Pretendard Variable via `@fontsource-variable/pretendard` | UI-SPEC locked (Korean-first) |
| Locale | ko-KR (`<html lang="ko">`) | UI-SPEC locked |

### Database & Backend
| Decision | Value | Rationale |
|----------|-------|-----------|
| BaaS | Supabase (Auth + Postgres + Realtime + Storage) | CLAUDE.md locked |
| SDK | `@supabase/supabase-js` 2.105.4 + `@supabase/ssr` 0.10.3 | Research verified |
| ORM | None — direct Supabase client with generated types | CLAUDE.md: "Do not use Prisma" |
| Migrations | `supabase/migrations/*.sql` (applied via `supabase db push`) | Supabase CLI standard |
| Type generation | `supabase gen types typescript --local > src/lib/supabase/database.types.ts` | Run after every migration |
| Auth pattern | Cookie-based session via `@supabase/ssr` + `proxy.ts` calling `getClaims()` | Research verified |
| Role storage | `profiles.role` column (NOT `auth.users.user_metadata`) | SEC-required; user_metadata is user-editable |
| Profile creation | `on_auth_user_created` trigger reads `raw_user_meta_data->>'role'` | Avoids RLS timing issue at signup |
| RLS posture | Enabled on EVERY table from migration #1; deny-by-default | SEC-01 |
| Cross-table role checks | `private.get_user_role()` SECURITY DEFINER function (avoids RLS recursion) | Pitfall 4 |

### Storage
| Decision | Value | Rationale |
|----------|-------|-----------|
| Private bucket | `artwork-originals` (public=false) | SEC-02 |
| Public bucket | `artwork-mockups` (public=true) | AI-generated images |
| Temp bucket | `space-uploads` (public=false) | Phase 3 consumer rooms |
| Signed URL TTL default | 3600s (1h) | Reasonable balance |

### Validation, Forms, State
| Decision | Value | Rationale |
|----------|-------|-----------|
| Schema validation | Zod 4.4.3 | CLAUDE.md locked |
| Forms | React Hook Form + `@hookform/resolvers` 5.2.2 | RHF + Zod v4 compat |
| Client state | Zustand (only when needed) | CLAUDE.md locked; primary data layer is RSC |
| Server data fetching | RSC + Server Actions | Next.js 16 idiomatic |

### Tooling
| Decision | Value | Rationale |
|----------|-------|-----------|
| Linter + formatter | Biome 2.4.15 (`biome check --write .`) | CLAUDE.md locked; replaces ESLint+Prettier |
| Unit tests | Vitest 4.1.5 | CLAUDE.md locked |
| E2E tests | Playwright | CLAUDE.md locked |
| Package manager | npm | Default |

### Environment Variables (canonical names — locked)
| Name | Scope | Notes |
|------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client+server | NOT `_ANON_KEY` (canonical 2025+) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | NEVER prefix `NEXT_PUBLIC_`; used in webhook Route Handlers + admin contexts only |
| `NEXT_SITE_URL` | server | `http://localhost:3000` locally |

## Directory Layout (locked)

```
artbridge/
├── src/
│   ├── app/
│   │   ├── (auth)/                # Public auth pages
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── auth/confirm/route.ts
│   │   ├── (artist)/              # Artist-only route group
│   │   │   ├── layout.tsx         # Role guard via getUser + profiles read
│   │   │   └── artist/page.tsx
│   │   ├── (buyer)/               # Buyer-only route group
│   │   │   ├── layout.tsx
│   │   │   └── buyer/page.tsx
│   │   ├── layout.tsx             # Root: <html lang="ko">, fonts, header
│   │   ├── globals.css            # Tailwind v4 import + design tokens
│   │   └── page.tsx               # Public landing
│   ├── actions/
│   │   └── auth.ts                # signupAction, loginAction, logoutAction
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (button, input, label, form, card, separator, alert)
│   │   ├── auth/SignupForm.tsx
│   │   ├── auth/LoginForm.tsx
│   │   └── layout/Header.tsx      # Wordmark + Logout button
│   └── lib/
│       └── supabase/
│           ├── client.ts          # createBrowserClient
│           ├── server.ts          # createServerClient w/ cookies()
│           ├── admin.ts           # service-role client (server only)
│           ├── proxy.ts           # updateSession()
│           ├── storage.ts         # signed URL helper
│           └── database.types.ts  # generated by supabase gen types
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260510000001_schema.sql
│       ├── 20260510000002_rls_policies.sql
│       ├── 20260510000003_storage_buckets.sql
│       └── 20260510000004_handle_new_user.sql
├── tests/
│   ├── rls/                       # Vitest — anon-key leak tests
│   └── e2e/                       # Playwright — signup→login→logout
├── proxy.ts                       # exports `proxy` (NOT middleware)
├── postcss.config.mjs             # @tailwindcss/postcss
├── biome.json
├── vitest.config.ts
├── playwright.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.local                     # Not committed
```

## Auth Flow (locked)

1. **Signup**
   - Browser submits form → `signupAction(formData)` (Server Action)
   - Validate with Zod (`email`, `password ≥ 8`, `role ∈ {artist, buyer}`)
   - `supabase.auth.signUp({ email, password, options: { data: { role } } })`
   - Postgres trigger `on_auth_user_created` reads `raw_user_meta_data->>'role'` → INSERT into `profiles`
   - Server Action calls `redirect(role === 'artist' ? '/artist' : '/buyer')`
   - `proxy.ts` writes session cookie on next request
2. **Login**
   - `loginAction` calls `signInWithPassword` → reads `profiles.role` server-side → `redirect`
3. **Logout**
   - `logoutAction` (POST Server Action) calls `signOut()` → `redirect('/')`
4. **Session persistence**
   - `proxy.ts` calls `getClaims()` on every non-static request, refreshes JWT, writes cookie
5. **Route guards**
   - `proxy.ts` redirects unauthenticated users on protected paths to `/login`
   - Route group `layout.tsx` reads `profiles.role` via server client; redirects to other-role home on mismatch (no 403 page)

## Security Posture (locked baseline)

- `getClaims()` (JWT-verified) used in `proxy.ts`. **`getSession()` is forbidden** for any authorization decision.
- Role lives in `profiles` table only. **`auth.users.user_metadata` is forbidden** as authorization source.
- Service role key only in `lib/supabase/admin.ts`, used only in Route Handlers (webhooks) and server-side trigger seeding. Never imported from client components or Server Actions.
- Every table has `ENABLE ROW LEVEL SECURITY` in its `CREATE TABLE` migration. Tables without permissive policies (e.g. `idempotency_keys`) return zero rows to anon/authenticated clients — exactly intended for admin-only tables.
- Private storage bucket `artwork-originals` returns 4xx (400/403) on public URL fetch attempts. Verified by E2E test.
- Generic auth error copy ("이메일 또는 비밀번호가 올바르지 않습니다.") avoids email enumeration.
- Logout uses POST Server Action; Next.js 16 Server Actions include built-in CSRF protection via Origin check.
- Supabase Auth handles password hashing (Argon2id) and rate limiting — no custom auth code.

## Deployment Target (deferred decision — Phase 1 is local-only)

Phase 1 runs against local `supabase start` stack only. Production deployment target (Vercel vs. self-host) is **deferred to Phase 2 or later**, but the constraint is recorded:

- Must support Next.js 16 App Router with Turbopack-built artifacts
- Must support Node.js 20.9+
- Default candidate: Vercel (zero-config Next.js)
- Supabase remains as a separate managed service either way

## Out of Scope for Skeleton

- Email confirmation flow polish — `auth/confirm` route exists but UX is minimal (deferred polish)
- Password reset — Phase 1 deferred (Supabase Auth supports it; UI added later)
- Social login — not in v1 scope
- Profile edit (display_name) — Phase 1 only writes role + email at signup; edit UI deferred
- Sentry initialization — scaffolded but not enforced (added in later phase)
- Production env vars / deploy config — local only
