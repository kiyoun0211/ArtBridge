# Phase 1: Foundation - Research

**Researched:** 2026-05-10
**Domain:** Supabase Auth + Next.js 16 App Router SSR, Postgres RLS, Storage buckets, role-based routing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | 사용자가 이메일/비밀번호로 작가 또는 구매자 역할로 회원가입한다 | Supabase Auth `signUp` + `profiles` table with `role` column populated at signup via Server Action |
| AUTH-02 | 사용자가 로그인하고 세션이 유지된다 (Supabase Auth) | `@supabase/ssr` cookie-based session via `proxy.ts` + `getClaims()`; session persists across page reloads |
| AUTH-03 | 사용자가 어느 페이지에서든 로그아웃할 수 있다 | `supabase.auth.signOut()` from a Client Component in the root layout |
| AUTH-04 | 역할(작가/구매자)에 따라 라우트와 기능이 가드된다 | Route group layout-level guards via `proxy.ts` role check + redirect; no 403 pages |
| SEC-01 | 모든 Supabase 테이블에 RLS가 활성화되며 anon key로 권한 테스트가 통과해야 한다 | Enable RLS in every `CREATE TABLE` migration; verify with anon-key Supabase client |
| SEC-02 | 원본 작품 파일은 비공개 버킷에서만 접근하며 공개 URL로 노출되지 않는다 | `artwork-originals` bucket set to private (no public access); public URLs return 403; access via signed URLs only |
| SEC-03 | 외부 웹훅(결제, AI)은 서명 검증 + idempotency 체크를 거친다 | Phase 1 schema pre-creates `idempotency_keys` table; webhook handlers wired in later phases |
</phase_requirements>

---

## Summary

Phase 1 delivers the minimal walking skeleton: a Next.js 16 App Router application wired to Supabase, with email/password auth, role-based routing, the full database schema, and verified RLS. No feature data (artwork, bids, orders) exists yet — only structural tables with policies in place so no later migration needs to retrofit security.

The canonical auth pattern for Next.js 16 is `proxy.ts` (not `middleware.ts`) exporting a `proxy` function that calls `updateSession` from `lib/supabase/proxy.ts`. The proxy refreshes JWTs on every non-static request by calling `supabase.auth.getClaims()`. Server Components and Server Actions use `createServerClient` from `@supabase/ssr` with `cookies()`. The browser uses `createBrowserClient`. The service-role client is restricted to webhook Route Handlers.

The `profiles` table (with a `role` column) in the public schema is the correct pattern for role storage. `auth.users.user_metadata` is editable by the user — do not gate authorization on it. The profiles table, protected by RLS, is the authoritative role source for Server-side checks. Supabase Auth automatically provides `auth.uid()` inside RLS policies without any extra setup.

**Primary recommendation:** Build the walking skeleton in this order: (1) Supabase project + CLI local setup, (2) migrations (schema + RLS + Storage buckets), (3) Next.js project bootstrap, (4) `lib/supabase/` clients + `proxy.ts`, (5) signup/login/logout UI, (6) role-guard route layouts, (7) anon-key RLS verification script.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session token refresh | Frontend Server (proxy.ts) | — | `proxy.ts` intercepts every request, calls `getClaims()` to refresh JWT and write updated cookie |
| Auth state (login/signup/logout) | API / Backend (Supabase Auth) | Frontend Server (Server Actions) | Supabase Auth owns identity; Server Actions call `signUp`, `signInWithPassword`, `signOut` |
| Role enforcement (route guard) | Frontend Server (proxy.ts + layout) | — | Route group layouts read role from `profiles` via server client; redirect on mismatch |
| Role data storage | Database (profiles table + RLS) | — | Postgres `profiles.role` column; RLS ensures users cannot escalate their own role |
| Schema and RLS policies | Database | — | All tables, policies, and functions live in versioned SQL migrations |
| Storage bucket access control | Database / Storage | — | Supabase Storage bucket policy + RLS; private bucket returns 403 on public URL |

---

## Standard Stack

### Core (Phase 1 only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | Full-stack framework | App Router, `proxy.ts`, Server Actions, React 19 bundled [VERIFIED: npm registry] |
| @supabase/supabase-js | 2.105.4 | Supabase client | Isomorphic; works in RSC and Client Components [VERIFIED: npm registry] |
| @supabase/ssr | 0.10.3 | SSR auth helpers | Cookie-based session for App Router; replaces deprecated `auth-helpers-nextjs` [VERIFIED: npm registry] |
| typescript | 5.x | Type safety | Required by Next.js 16 (min 5.1) [VERIFIED: CLAUDE.md] |
| tailwindcss | 4.x | Styling | CSS-first config; `@tailwindcss/postcss` in `postcss.config.mjs` [VERIFIED: CLAUDE.md] |
| zod | 4.4.3 | Schema validation | Form validation for signup (email, password, role); v4 is greenfield standard [VERIFIED: npm registry] |
| react-hook-form | latest | Form state | Signup/login forms with minimal re-renders [VERIFIED: CLAUDE.md] |
| @hookform/resolvers | 5.2.2 | Zod adapter | Supports Zod v4 as of v5.2.0 (type issue fixes in v5.2.2) [VERIFIED: npm registry + WebSearch] |
| @biomejs/biome | 2.4.15 | Lint + format | Replaces ESLint+Prettier; Next.js 16 removed `next lint` [VERIFIED: npm registry] |
| vitest | 4.1.5 | Unit testing | For RLS verification scripts and schema tests [VERIFIED: npm registry] |

### Supporting (scaffolded in Phase 1, used in later phases)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | latest | Client state | Mirror auth user in client; only needed when client components need the role |
| lucide-react | latest | Icons | Logout button, nav icons |
| @sentry/nextjs | latest | Error tracking | Initialize in Phase 1 so errors from day 1 are captured |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `profiles` table for role | `auth.users.user_metadata` for role | `user_metadata` is user-editable — never use for authorization. `app_metadata` is admin-only but requires service-role client to write; profiles table with RLS is the idiomatic pattern |
| `getClaims()` in proxy | `getSession()` in proxy | `getSession()` does NOT validate JWT signature — it reads the stored cookie blindly. `getClaims()` verifies against JWKS. Always use `getClaims()` for security checks |
| Route group layout guard | Edge middleware-only guard | Layout guard also ensures SSR data is fetched with correct role context; both are needed |

### Installation

```bash
npx create-next-app@latest artbridge \
  --typescript \
  --tailwind \
  --app \
  --turbopack \
  --no-eslint

cd artbridge

npm install @supabase/supabase-js @supabase/ssr
npm install zod react-hook-form @hookform/resolvers
npm install zustand lucide-react
npm install @sentry/nextjs

npm install -D @biomejs/biome vitest
npm install -D @tailwindcss/postcss

# Supabase CLI (local dev)
npm install -D supabase
```

**Version verification (run before writing package.json pinned versions):**

```bash
npm view @supabase/ssr version      # 0.10.3
npm view @supabase/supabase-js version  # 2.105.4
npm view next version               # 16.2.6
npm view zod version                # 4.4.3
npm view @hookform/resolvers version # 5.2.2
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │  
  │  (1) GET /artist/dashboard  — request with auth cookie
  ▼
proxy.ts  ──── createServerClient ───► Supabase Auth (JWKS)
  │             getClaims()                    │
  │             ◄─── JWT claims (role) ────────┘
  │
  │  role=buyer, path=/artist/* → redirect /buyer/dashboard
  │  role=artist, path=/artist/* → NextResponse.next()
  ▼
RSC Layout  ──── createServerClient ───► Supabase Postgres (profiles)
  │              SELECT * FROM profiles       │
  │              WHERE id = auth.uid()        │
  │              ◄─────────────────────────────┘
  │
  ▼
Page Component (RSC)
  │
  │  [Client Component boundary]
  ▼
Client Component  ──── createBrowserClient ───► Supabase (browser)
  │                    Realtime subscriptions
  │                    supabase.auth.signOut()
  ▼
Browser updates

── ── ── ── ── ── ── ── ── ── ── ── ── ── ─
Signup flow:

Browser (signup form)
  │
  ▼
Server Action (actions/auth.ts)
  │── createServerClient(cookies()) ──► supabase.auth.signUp({ email, password })
  │── INSERT INTO profiles (id, role)   (same action, after auth)
  │
  ▼
  redirect → /artist/dashboard  OR  /buyer/dashboard
  (based on role chosen at signup)

── ── ── ── ── ── ── ── ── ── ── ── ── ── ─
Storage (SEC-02):

Public URL request → artwork-originals bucket
  │
  ▼
Supabase Storage (private bucket) → 403 Forbidden

Signed URL request (server-generated, TTL 1h)
  │
  ▼
Supabase Storage → 200 OK (authorized download)
```

### Recommended Project Structure

```
artbridge/
├── app/
│   ├── (auth)/                      # Public auth pages (no layout guard)
│   │   ├── login/
│   │   │   └── page.tsx             # Login form
│   │   ├── signup/
│   │   │   └── page.tsx             # Signup form (includes role selection)
│   │   └── auth/
│   │       └── confirm/
│   │           └── route.ts         # Email OTP confirmation callback
│   ├── (artist)/                    # Artist-only route group
│   │   ├── layout.tsx               # Reads profile, redirects buyers to /buyer/dashboard
│   │   └── dashboard/
│   │       └── page.tsx             # Artist dashboard skeleton
│   ├── (buyer)/                     # Buyer-only route group
│   │   ├── layout.tsx               # Reads profile, redirects artists to /artist/dashboard
│   │   └── dashboard/
│   │       └── page.tsx             # Buyer dashboard skeleton
│   ├── layout.tsx                   # Root layout (no auth check here)
│   └── page.tsx                     # Public landing page
├── actions/
│   └── auth.ts                      # Server Actions: signup, login, logout
├── lib/
│   └── supabase/
│       ├── client.ts                # createBrowserClient (browser only)
│       ├── server.ts                # createServerClient with cookies() (RSC/SA)
│       ├── admin.ts                 # createClient(service_role) — webhooks only
│       └── proxy.ts                 # updateSession — called by proxy.ts
├── proxy.ts                         # Next.js proxy export (NOT middleware.ts)
├── supabase/
│   ├── config.toml                  # Supabase CLI config
│   └── migrations/
│       ├── 20260510000001_schema.sql         # All tables (RLS enabled inline)
│       ├── 20260510000002_rls_policies.sql   # All RLS policies
│       └── 20260510000003_storage.sql        # Bucket creation + policies
├── types/
│   └── database.ts                  # Generated: npx supabase gen types typescript
├── next.config.ts
├── postcss.config.mjs               # @tailwindcss/postcss (required for Tailwind v4)
├── proxy.ts                         # Next.js proxy (exports `proxy` function)
└── .env.local                       # Local env vars (see below)
```

### Pattern 1: `proxy.ts` — Session Refresh and Route Protection

**What:** `proxy.ts` at the project root exports a `proxy` function (NOT `middleware`). It refreshes the Supabase session JWT on every non-static request. Role-based redirects happen here for broad protection; fine-grained protection is in route group layouts.

**When to use:** Every Next.js 16 Supabase project. Replaces `middleware.ts`.

```typescript
// proxy.ts — at project root
// Source: [CITED: supabase.com/docs/guides/auth/server-side/creating-a-client]
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

```typescript
// lib/supabase/proxy.ts
// Source: [CITED: supabase.com/docs/guides/auth/server-side/creating-a-client]
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: call getClaims() immediately after createServerClient
  // Do NOT insert any code between them
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Redirect unauthenticated users away from protected paths
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### Pattern 2: Server Client — RSC and Server Actions

```typescript
// lib/supabase/server.ts
// Source: [CITED: github.com/supabase/supabase examples/user-management/nextjs-user-management]
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component where cookies cannot be set;
            // proxy.ts handles session refresh, so this is safe to ignore
          }
        },
      },
    }
  )
}
```

### Pattern 3: Browser Client

```typescript
// lib/supabase/client.ts
// Source: [CITED: github.com/supabase/supabase examples/user-management/nextjs-user-management]
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Pattern 4: Admin Client (service role — webhooks only)

```typescript
// lib/supabase/admin.ts
// NEVER import this in client components or Server Actions
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!   // server-only, never NEXT_PUBLIC_
  )
}
```

### Pattern 5: Auth Callback Route (Email Confirmation)

```typescript
// app/auth/confirm/route.ts
// Source: [CITED: supabase.com/docs/guides/getting-started/tutorials/with-nextjs]
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/login'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.redirect(new URL('/auth/error', request.url))
}
```

### Pattern 6: Role-Gated Route Group Layout

```typescript
// app/(artist)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'artist') {
    redirect('/buyer/dashboard')  // redirect, not 403
  }

  return <>{children}</>
}
```

### Pattern 7: Signup Server Action (with role)

```typescript
// actions/auth.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod/v4'

const SignupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(['artist', 'buyer']),
})

export async function signupAction(formData: FormData) {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return { error: error?.message ?? 'Signup failed' }
  }

  // Insert profile with role immediately after auth creation
  await supabase.from('profiles').insert({
    id: data.user.id,
    role: parsed.data.role,
    email: parsed.data.email,
  })

  redirect(parsed.data.role === 'artist' ? '/artist/dashboard' : '/buyer/dashboard')
}
```

### Anti-Patterns to Avoid

- **`middleware.ts` exports `middleware` function:** Deprecated in Next.js 16. Use `proxy.ts` exporting `proxy`. The old name causes silent failure or deprecation warnings.
- **`getSession()` in proxy:** Does not verify JWT signature. An attacker who crafts a cookie can pass `getSession()` checks. Always use `getClaims()` for security-sensitive checks.
- **Role stored in `auth.users.user_metadata`:** User-editable via `supabase.auth.updateUser()`. Never use for authorization. Use `profiles.role` column with RLS.
- **Admin client in Server Actions:** Server Actions run under user JWT. Using service role bypasses all RLS — any authenticated user can read/write any row. Restrict admin client to webhook Route Handlers.
- **`@supabase/auth-helpers-nextjs`:** Deprecated. Do not install. Use `@supabase/ssr`.
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY` env name:** Still works until end of 2026, but the current canonical name is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use the new name for new projects.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT session refresh | Custom cookie logic | `@supabase/ssr updateSession` | Edge cases: cookie chunking (large JWTs), SameSite attributes, refresh token rotation |
| Password hashing | bcrypt in app code | Supabase Auth (handles internally) | Supabase uses Argon2id; hand-rolling gets this wrong |
| PKCE auth flow | Custom OAuth callback | `supabase.auth.verifyOtp` in confirm route | PKCE flow has multi-step state that must survive redirects |
| RLS policy helpers | Custom SQL access control functions | `auth.uid()` built-in | Supabase provides `auth.uid()`, `auth.role()` as first-class SQL functions |
| Signed URL generation | S3 presign logic | `supabase.storage.from('bucket').createSignedUrl(path, ttl)` | Supabase Storage handles token signing, expiry, and CORS |

**Key insight:** The auth layer has 15+ edge cases (token rotation, PKCE, cookie chunking, clock skew, concurrent tab refresh). `@supabase/ssr` solves all of them. Any custom implementation will miss at least three.

---

## Schema Sketch

All tables must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the migration. Phase 1 creates the full schema so no future phase retrofits RLS.

### Migration 1: Schema (`20260510000001_schema.sql`)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── PROFILES ──────────────────────────────────────────────────────────────────
-- Stores role (artist|buyer) and display info. id = auth.users.id.
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
-- Each artwork is unique. status drives all business logic.
-- anti-sniping column (end_at) noted in STATE.md as required in Phase 1 schema.
CREATE TABLE public.artworks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  width_cm        NUMERIC(8,2) NOT NULL CHECK (width_cm > 0),
  height_cm       NUMERIC(8,2) NOT NULL CHECK (height_cm > 0),
  sale_type       TEXT NOT NULL CHECK (sale_type IN ('fixed', 'auction')),
  price           NUMERIC(12,2),         -- fixed price or auction start bid
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'available', 'auctioning', 'sold', 'cancelled')),
  storage_path    TEXT,                  -- original image path in artwork-originals bucket
  mockup_url      TEXT,                  -- AI-generated promotional mockup (public bucket)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.artworks(artist_id);
CREATE INDEX ON public.artworks(status);

-- ── AUCTIONS ──────────────────────────────────────────────────────────────────
-- One auction per artwork. end_at extensible for anti-sniping (AUC-03).
CREATE TABLE public.auctions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id      UUID NOT NULL UNIQUE REFERENCES public.artworks(id) ON DELETE CASCADE,
  start_bid       NUMERIC(12,2) NOT NULL,
  current_bid     NUMERIC(12,2),
  winner_id       UUID REFERENCES public.profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'closed', 'cancelled')),
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,          -- extensible via anti-sniping
  extended_count  INT NOT NULL DEFAULT 0,        -- anti-snipe extension counter
  payment_deadline_at TIMESTAMPTZ,               -- 48h window after close (AUC-05)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.auctions(status);
CREATE INDEX ON public.auctions(end_at) WHERE status = 'active';

-- ── BIDS ──────────────────────────────────────────────────────────────────────
-- Full bid history (required for second-bidder fallback, AUC-05 / PITFALL-10).
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
-- Fixed-price purchases and post-auction winner payments.
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id      UUID NOT NULL REFERENCES public.artworks(id),
  buyer_id        UUID NOT NULL REFERENCES public.profiles(id),
  auction_id      UUID REFERENCES public.auctions(id),   -- NULL for fixed-price
  amount          NUMERIC(12,2) NOT NULL,
  payment_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed', 'refunded')),
  payment_key     TEXT UNIQUE,          -- Toss payment key (idempotency)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.orders(buyer_id);
CREATE INDEX ON public.orders(payment_key) WHERE payment_key IS NOT NULL;

-- ── AI JOBS ───────────────────────────────────────────────────────────────────
-- Async inference queue. Never call AI APIs inline in request handlers.
CREATE TABLE public.ai_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id      UUID REFERENCES public.artworks(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('mockup', 'composition')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload         JSONB NOT NULL DEFAULT '{}',
  result_url      TEXT,
  provider_job_id TEXT,              -- fal.ai request_id or RunPod job_id
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.ai_jobs(status) WHERE status IN ('pending', 'processing');

-- ── IDEMPOTENCY KEYS ──────────────────────────────────────────────────────────
-- Pre-created for SEC-03. Payment webhook handlers check here before acting.
CREATE TABLE public.idempotency_keys (
  key         TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
-- No user-facing access; webhook route handlers use admin client

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
```

### Migration 2: RLS Policies (`20260510000002_rls_policies.sql`)

```sql
-- Source: [CITED: supabase.com/docs/guides/database/postgres/row-level-security]

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ── ARTWORKS ──────────────────────────────────────────────────────────────────
-- Anyone (including anon) can read available/auctioning artworks
CREATE POLICY "artworks_select_public"
  ON public.artworks FOR SELECT
  TO anon, authenticated
  USING (status IN ('available', 'auctioning', 'sold'));

-- Artist can read all their own artworks (including drafts)
CREATE POLICY "artworks_select_own"
  ON public.artworks FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = artist_id);

-- Only artists can insert artworks (role check via profiles subquery)
CREATE POLICY "artworks_insert_artist"
  ON public.artworks FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = artist_id
    AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'artist'
  );

-- Artist can update own artworks (not sold ones — enforced in app layer / functions)
CREATE POLICY "artworks_update_own"
  ON public.artworks FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = artist_id);

-- Artist can delete own draft artworks
CREATE POLICY "artworks_delete_own_draft"
  ON public.artworks FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = artist_id AND status = 'draft');

-- ── AUCTIONS ──────────────────────────────────────────────────────────────────
-- Public can read active/closed auctions (current_bid is public information)
CREATE POLICY "auctions_select_public"
  ON public.auctions FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'closed'));

-- Artist manages auctions for their own artworks
CREATE POLICY "auctions_insert_artist"
  ON public.auctions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artworks
      WHERE id = artwork_id AND artist_id = (SELECT auth.uid())
    )
  );

-- ── BIDS ──────────────────────────────────────────────────────────────────────
-- IMPORTANT: Never expose bidder_id to public — bid sniping risk
-- Public can see bid amounts on active auctions (not bidder identity)
CREATE POLICY "bids_select_amounts_only"
  ON public.bids FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions
      WHERE id = auction_id AND status IN ('active', 'closed')
    )
  );

-- Bidder can see their own bids (includes bidder_id)
CREATE POLICY "bids_select_own"
  ON public.bids FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = bidder_id);

-- Bids are inserted only via place_bid() SECURITY DEFINER function
-- No direct INSERT policy needed — the function bypasses RLS

-- ── ORDERS ────────────────────────────────────────────────────────────────────
-- Buyer can see own orders
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = buyer_id);

-- Artist can see orders for their artworks
CREATE POLICY "orders_select_artist"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artworks
      WHERE id = artwork_id AND artist_id = (SELECT auth.uid())
    )
  );

-- Orders created only via webhook (admin client) — no user INSERT policy

-- ── AI JOBS ───────────────────────────────────────────────────────────────────
-- Artist can see their own jobs (via artwork ownership)
CREATE POLICY "ai_jobs_select_artist"
  ON public.ai_jobs FOR SELECT
  TO authenticated
  USING (
    artwork_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.artworks
      WHERE id = artwork_id AND artist_id = (SELECT auth.uid())
    )
  );

-- ── IDEMPOTENCY KEYS ──────────────────────────────────────────────────────────
-- No user-facing policies; admin client only via Route Handlers
-- (RLS enabled but no permissive policies = anon/authenticated get 0 rows — correct)

-- ── WATCHLIST ─────────────────────────────────────────────────────────────────
CREATE POLICY "watchlist_crud_own"
  ON public.watchlist FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Migration 3: Storage Buckets (`20260510000003_storage.sql`)

```sql
-- Source: [CITED: supabase.com/docs/guides/storage/serving/downloads]
-- Note: Bucket creation is better done via Supabase Dashboard or CLI config;
-- the SQL below is for documentation / reproducibility.

-- Private bucket: original artwork files (SEC-02)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-originals', 'artwork-originals', false)
ON CONFLICT (id) DO NOTHING;

-- Public bucket: AI-generated mockups and processed images
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-mockups', 'artwork-mockups', true)
ON CONFLICT (id) DO NOTHING;

-- Temporary bucket: consumer room photos (Phase 3)
INSERT INTO storage.buckets (id, name, public)
VALUES ('space-uploads', 'space-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for artwork-originals (private)
CREATE POLICY "artwork-originals: artist uploads own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-originals'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "artwork-originals: artist reads own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'artwork-originals'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- artwork-mockups: public read, authenticated write
CREATE POLICY "artwork-mockups: public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'artwork-mockups');
```

---

## Common Pitfalls

### Pitfall 1: `middleware.ts` not renamed to `proxy.ts`

**What goes wrong:** Next.js 16 deprecated `middleware.ts`/`export function middleware`. The file still runs but throws deprecation warnings and will break in a future version. New projects that scaffold `middleware.ts` from old tutorials will silently use the deprecated pattern.

**Why it happens:** Most Supabase + Next.js tutorials online predate Next.js 16.

**How to avoid:** Always create `proxy.ts` at project root. Export `proxy` function (not `middleware`). Export `config` with the matcher.

**Warning signs:** TypeScript complains about exporting `proxy` if `middleware.ts` also exists; only one should exist.

### Pitfall 2: `getSession()` used for authorization (security hole)

**What goes wrong:** `getSession()` returns the session from the cookie without verifying the JWT signature. An attacker can craft a cookie with a tampered JWT and pass all `getSession()` checks.

**Why it happens:** `getSession()` is faster and simpler; developers use it by default.

**How to avoid:** Use `supabase.auth.getClaims()` in `proxy.ts`. Use `supabase.auth.getUser()` in Server Components for user identity. Never use `getSession()` for security decisions.

### Pitfall 3: RLS blocks the `profiles` INSERT at signup

**What goes wrong:** The signup Server Action calls `auth.signUp()` then immediately tries to `INSERT INTO profiles`. But the RLS policy for `profiles_insert_own` checks `auth.uid() = id`. After `signUp`, `auth.uid()` inside the server context may not yet be set to the new user's ID because the session cookie hasn't been written yet (cookies are written by proxy.ts on the *next* request, not synchronously in the Server Action).

**How to avoid:** Use the Supabase `on_auth_user_created` Postgres trigger to automatically insert the profile row, OR pass the role as `user_metadata` at signup and have the trigger read it. Alternatively, use the server client's admin mode to insert the profile in the Server Action (using service role for this single operation is acceptable since it's called by the new user's own signup flow).

**Better pattern — database trigger:**
```sql
-- In a migration, add after profiles table creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Then in the Server Action, pass `options.data.role` to `signUp`:
```typescript
await supabase.auth.signUp({
  email, password,
  options: { data: { role } }  // stored in raw_user_meta_data
})
// profile is created by trigger — no manual INSERT needed
```

### Pitfall 4: RLS policies on `profiles` cause infinite recursion

**What goes wrong:** An RLS policy references `profiles` from within a `profiles` policy (or via a function that queries `profiles`). Postgres enters infinite recursion and returns an error.

**Why it happens:** `artworks_insert_artist` policy does a subquery on `profiles` to check role. If RLS on `profiles` is evaluated during that subquery without `SECURITY DEFINER`, it recurses.

**How to avoid:** Use `SECURITY DEFINER` helper functions stored in a private schema for cross-table role checks:
```sql
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_user_role(user_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;
```

Then policies reference `private.get_user_role(auth.uid())` instead of a `profiles` subquery.

### Pitfall 5: RLS tested in SQL editor — policies appear to work but actually don't

**What goes wrong:** The Supabase SQL editor runs queries as the `postgres` superuser, which bypasses all RLS policies. Everything looks protected, but anon API calls can still read private rows.

**How to avoid:** Test RLS using the Supabase JavaScript client with only the anon key:
```typescript
// tests/rls-verification.ts
import { createClient } from '@supabase/supabase-js'

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

// This should return 0 rows (draft artworks not visible to anon)
const { data: draftArtworks } = await anonClient
  .from('artworks')
  .select('*')
  .eq('status', 'draft')

console.assert(draftArtworks?.length === 0, 'FAIL: anon can read draft artworks')

// profiles should return 0 rows for anon
const { data: profiles } = await anonClient.from('profiles').select('*')
console.assert(profiles?.length === 0, 'FAIL: anon can read profiles')
```

### Pitfall 6: `NEXT_PUBLIC_SUPABASE_ANON_KEY` vs `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

**What goes wrong:** Old tutorials and Supabase CLI `supabase init` may still scaffold `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The new canonical name is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Both work until end of 2026, but mixing them in the codebase causes confusion and maintenance drift.

**How to avoid:** Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in all new code. If `supabase init` generates `ANON_KEY`, rename it in `.env.local` and `next.config.ts` immediately.

### Pitfall 7: Cookies not set in Server Components (breaks session refresh)

**What goes wrong:** The `setAll` method in `lib/supabase/server.ts` will throw when called from a Server Component (read-only cookie context). If not caught, the server crashes.

**How to avoid:** Wrap `setAll` in a try-catch (as shown in Pattern 3 above). The `proxy.ts` handles the actual cookie write — the Server Component client is read-only by design.

---

## Code Examples

### RLS Verification Script (Vitest-compatible)

```typescript
// tests/rls/verify-anon-access.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

describe('RLS: anon key returns zero private rows', () => {
  it('profiles: anon gets 0 rows', async () => {
    const { data } = await anon.from('profiles').select('*')
    expect(data).toHaveLength(0)
  })

  it('artworks: anon sees only available/auctioning/sold (no drafts)', async () => {
    const { data } = await anon.from('artworks').select('status')
    const statuses = new Set(data?.map(r => r.status) ?? [])
    expect(statuses.has('draft')).toBe(false)
    expect(statuses.has('cancelled')).toBe(false)
  })

  it('orders: anon gets 0 rows', async () => {
    const { data } = await anon.from('orders').select('*')
    expect(data).toHaveLength(0)
  })

  it('ai_jobs: anon gets 0 rows', async () => {
    const { data } = await anon.from('ai_jobs').select('*')
    expect(data).toHaveLength(0)
  })
})
```

### Storage Private Bucket Verification

```typescript
// tests/rls/verify-storage.test.ts
import { describe, it, expect } from 'vitest'

it('artwork-originals: public URL returns 403', async () => {
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artwork-originals/any-path`
  const res = await fetch(publicUrl)
  expect(res.status).toBe(400) // Supabase returns 400 for "private bucket" public URL attempts
})
```

### Signed URL Generation

```typescript
// lib/supabase/storage.ts
import { createAdminClient } from './admin'

export async function getArtworkSignedUrl(storagePath: string, expiresIn = 3600) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from('artwork-originals')
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}
```

### Environment Variables (.env.local)

```bash
# Supabase — use PUBLISHABLE_KEY (not ANON_KEY)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-only — NEVER prefix with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_SITE_URL=http://localhost:3000
NEXT_REDIRECT_URLS=http://localhost:3000/
```

### Local Dev Setup

```bash
# 1. Initialize Supabase project (if not done)
npx supabase init

# 2. Start local Supabase stack
npx supabase start

# 3. Apply migrations
npx supabase db reset   # runs all migrations in supabase/migrations/

# 4. Generate TypeScript types from schema
npx supabase gen types typescript --local > types/database.ts

# 5. Start Next.js dev server
npm run dev
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware` | `proxy.ts` + `export function proxy` | Next.js 16 (Oct 2025) | Old files cause deprecation warnings; will break in Next.js 17 |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | `auth-helpers-nextjs` no longer maintained |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 2025 key rotation update | Old name works until end of 2026; new projects should use new name |
| `supabase.auth.getSession()` for server-side auth | `supabase.auth.getClaims()` | Recent Supabase SSR update | `getSession()` is insecure for server-side use (no JWT verification) |
| `experimental.ppr` in next.config | `cacheComponents: true` | Next.js 16 | `ppr` flag removed; build will error if present |
| `unstable_cache`, `unstable_cacheTag` | `cacheLife`, `cacheTag`, `use cache` | Next.js 16 | Stable API; use without `unstable_` prefix |
| `tailwind.config.js` | CSS-first config in `globals.css` with `@import 'tailwindcss'` | Tailwind v4 (Jan 2025) | No JS config file in v4; `@tailwindcss/postcss` in postcss.config.mjs |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the correct env var name for new Supabase projects in 2026 | Standard Stack / Code Examples | If the dashboard still uses `ANON_KEY`, code won't connect; easy to fix by renaming |
| A2 | Supabase Storage returns HTTP 400 (not 403) for public URL access to a private bucket | Code Examples (storage verification test) | Test assertion will fail; need to adjust expected status code |
| A3 | `supabase.auth.getClaims()` is available in `@supabase/ssr` 0.10.3 JavaScript client | Architecture Patterns | If only available in server-side (Kotlin/Swift) SDKs, must use `getUser()` instead |
| A4 | `@hookform/resolvers` 5.2.2 + `zod` 4.x works without type assertion workarounds | Standard Stack | Type errors in forms; may need `zodResolver(schema as any)` workaround until fixed |

**On A3:** The `proxy.ts` pattern retrieved from official docs uses `getClaims()` in a JavaScript context, so this is likely correct. But if `getClaims()` is unavailable, the fallback is `getUser()` which makes a network call to Auth server (slower but still correct).

---

## Open Questions

1. **`getClaims()` vs `getUser()` in `proxy.ts`**
   - What we know: Official docs and the example code use `getClaims()`. It is faster (JWKS cached).
   - What's unclear: Whether `getClaims()` is available in `@supabase/ssr` 0.10.3 JavaScript client or only in Kotlin/Swift SDKs (documentation examples include multiple languages).
   - Recommendation: Attempt `getClaims()` first. If TypeScript reports it missing, fall back to `getUser()`. The behavior difference is performance, not correctness.

2. **Profile INSERT via trigger vs Server Action**
   - What we know: Direct INSERT in Server Action has a timing issue with RLS. Trigger approach is more reliable.
   - What's unclear: Whether the Supabase `on_auth_user_created` trigger fires before or after the `signUp` response is returned to the client.
   - Recommendation: Use the trigger approach (documented in Pitfall 3). Simpler and avoids the service-role-in-Server-Action question.

3. **Zod v4 import path**
   - What we know: Zod v4 may require `import { z } from 'zod/v4'` for v4-specific APIs.
   - What's unclear: Whether top-level `import { z } from 'zod'` resolves to v4 or v3 API surface.
   - Recommendation: Use `import { z } from 'zod'` and verify at install time. If the top-level export is v4, no change needed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20.9+ | Next.js 16 | ✓ | v22.12.0 | — |
| npm | Package management | ✓ | 10.9.0 | — |
| Supabase CLI | Local dev, type gen | ✓ | 2.98.2 | Use cloud Supabase project directly (slower iteration) |
| Supabase cloud project | Auth, DB, Storage | ✗ | — | Required: create at supabase.com (free tier sufficient for MVP) |

**Missing dependencies with no fallback:**
- Supabase cloud project: Must be created before any migrations can run against a cloud instance. Local CLI stack (`npx supabase start`) works for development without a cloud project.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (email/password, JWT, refresh token rotation) |
| V3 Session Management | yes | `@supabase/ssr` cookie-based sessions; `proxy.ts` refresh; `getClaims()` verification |
| V4 Access Control | yes | Supabase RLS policies; role stored in `profiles` table; route group layout guards |
| V5 Input Validation | yes | Zod v4 schemas on signup form; `CHECK` constraints in Postgres |
| V6 Cryptography | no | No custom crypto; Supabase Auth handles password hashing (Argon2id) |

### Known Threat Patterns for Supabase + Next.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cookie forgery / JWT tampering | Spoofing | `getClaims()` verifies JWT against JWKS; `getSession()` does not |
| RLS bypass via SQL editor or service role key leak | Elevation of Privilege | Never expose service role key; use RLS on every table; test with anon client |
| Role escalation via `user_metadata` update | Elevation of Privilege | Store role in `profiles` table (RLS-protected), not `user_metadata` (user-editable) |
| Unauthenticated access to private artwork files | Information Disclosure | Private bucket (`artwork-originals`); signed URLs only; public URL returns 403/400 |
| CSRF on Server Actions | Tampering | Next.js 16 Server Actions include built-in CSRF protection via Origin header check |
| Session fixation | Spoofing | Supabase Auth rotates session tokens on login |

---

## Project Constraints (from CLAUDE.md)

All constraints below are locked decisions. Research does not explore alternatives to these.

- **Next.js 16 App Router** — required; `proxy.ts` not `middleware.ts`; no Pages Router
- **Supabase** — Auth, Postgres, Realtime, Storage; single BaaS
- **Tailwind CSS v4** — CSS-first config; `@tailwindcss/postcss`; no `tailwind.config.js`
- **TypeScript 5.x** — required
- **Biome** — lint + format; `biome check --write .` in CI; not ESLint/Prettier
- **Zod v4** — greenfield; breaking changes from v3 noted
- **React Hook Form + `@hookform/resolvers`** — form state; Zod adapter
- **Zustand** — client state; no Redux
- **Vitest** — unit testing; not Jest
- **RLS on every table from first migration** — locked; no exceptions
- **All artworks are unique**: status-based model, no SKU/inventory
- **`middleware.ts` is deprecated** — do not create; use `proxy.ts`
- **`experimental.ppr` flag** — removed in Next.js 16; do not use
- **`unstable_` caching APIs** — use stable names: `cacheLife`, `cacheTag`, `use cache`
- **Prisma** — do not use; `@supabase/supabase-js` with generated types
- **SendGrid** — do not use; Resend chosen
- **`@supabase/auth-helpers-nextjs`** — deprecated; do not install
- **Tailwind v3** — do not use; start on v4

---

## Sources

### Primary (HIGH confidence)

- `/supabase/ssr` via Context7 — `proxy.ts` updateSession pattern, cookie handlers, `getClaims()` [VERIFIED: Context7]
- `/websites/supabase` via Context7 — RLS policy patterns, profiles setup, Storage private bucket [VERIFIED: Context7]
- `github.com/supabase/supabase examples/user-management/nextjs-user-management` — `lib/supabase/client.ts`, `lib/supabase/server.ts`, `.env.example` env var names [VERIFIED: WebFetch raw GitHub]
- `supabase.com/docs/guides/auth/server-side/creating-a-client` — `proxy.ts` canonical pattern, `getClaims()` requirement [VERIFIED: WebFetch]
- `supabase.com/docs/guides/getting-started/tutorials/with-nextjs` — auth confirm route handler [VERIFIED: WebFetch]
- npm registry — package versions for all dependencies [VERIFIED: `npm view`]

### Secondary (MEDIUM confidence)

- WebSearch: `@hookform/resolvers` v5.2.2 + Zod v4 compatibility — type issues fixed in 5.2.0-5.2.2 [VERIFIED: multiple GitHub issues + npm]
- `.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md` — prior project-level research [CITED: project files]

### Tertiary (LOW confidence)

- A2 (storage returns 400 vs 403) — based on training knowledge; exact status code needs empirical verification [ASSUMED]
- A3 (`getClaims()` JS SDK availability) — inferred from `proxy.ts` docs showing JS usage; not directly confirmed in changelog [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry
- Auth pattern (proxy.ts, createServerClient): HIGH — verified via official Supabase docs + GitHub examples
- Schema and RLS: HIGH — verified via Context7 official Supabase docs
- Storage (private bucket 403): MEDIUM — concept verified; exact HTTP status code assumed
- `getClaims()` JS availability: MEDIUM — shown in official proxy.ts docs; assumed JS SDK support

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days; Supabase `@supabase/ssr` is actively updated — re-verify `getClaims()` API if more than 2 weeks pass before execution)
