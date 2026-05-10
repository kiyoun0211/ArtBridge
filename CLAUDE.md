<!-- GSD:project-start source:PROJECT.md -->
## Project

**ArtBridge**

ArtBridge는 그림 작가와 일반 소비자를 직접 연결하는 AI 기반 미술 작품 이커머스/경매 플랫폼입니다. 작가는 작품을 등록해 정찰제 또는 경매로 판매하고, 소비자는 자신의 공간 사진을 업로드해 작품이 실제 사이즈 비율로 합성된 모습을 미리 확인한 뒤 구매하거나 입찰합니다.

**Core Value:** 소비자가 "내 공간에 이 작품이 어떻게 어울릴지"를 구매 전에 정확한 사이즈로 미리 보고 확신을 갖고 구매(또는 입찰)할 수 있어야 한다 — 이 시각화 경험이 무너지면 다른 모든 기능이 의미를 잃는다.

### Constraints

- **Tech stack — Frontend**: Next.js (App Router) + Tailwind CSS — 명시적으로 합의됨
- **Tech stack — Backend/DB**: Supabase (Auth, Postgres, Realtime, Storage) — 인증·실시간 비딩·이미지 저장을 한 곳에서 처리
- **Tech stack — AI**: Stable Diffusion / ControlNet 계열 (Inpainting & Composition) + 사이즈 스케일 자동 조정 로직
- **Tech stack — Email**: Resend 또는 SendGrid (택1, 비교 후 결정)
- **Domain — 작품 단일성**: 모든 상품은 1점뿐 → 재고 모델 대신 status(available/auctioning/sold) 기반
- **Domain — 사이즈 정확성**: 공간 합성 시 작품 실제 cm가 픽셀 비율로 정확히 환산되어야 함
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x (latest stable) | Full-stack framework | App Router is production-stable, Turbopack is now default bundler (2-5x faster builds). Stable React Compiler support eliminates manual memoization. Cache Components (PPR successor) are ideal for artwork listing pages that mix static shells with live bid data. Node.js 20.9+ required. |
| React | 19.2 (bundled via Next.js canary) | UI rendering | Next.js App Router bundles React canary automatically; includes View Transitions for artwork browsing animations, `useEffectEvent` for auction timer cleanup, and `Activity` for background pre-rendering. Do not pin a separate React version for App Router. |
| TypeScript | 5.x (min 5.1 per Next.js 16) | Type safety | Required by Next.js 16. Essential for auction state machines and payment webhook shapes where a silent type error means money loss. |
| Tailwind CSS | 4.x | Styling | v4 stable since Jan 2025. CSS-first config (no `tailwind.config.js`), Lightning CSS compiler (5x faster than v3), native CSS variables, native container queries — critical for artwork cards that must adapt to gallery grid vs. sidebar layout. Needs `@tailwindcss/postcss` in `postcss.config.mjs` for Next.js. |
| Supabase | @supabase/supabase-js 2.105.x | Auth + DB + Realtime + Storage | Unified BaaS covering all four backend pillars needed for ArtBridge: Postgres RLS for artist/consumer role separation, Realtime channels for live bid streaming, Storage (with imgproxy-based transformations on Pro plan) for artwork uploads, Edge Functions for webhook processing. Eliminates four separate service integrations. |
### Payments (Korean Market — Critical Decision)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @tosspayments/tosspayments-sdk | latest (npm verified) | Client-side payment widget | Toss Payments has 30M+ Korean users (≈60% of population as of 2025). Native Korean checkout UX (card, bank transfer, Toss Pay wallet in one widget). Developer-friendly REST API + hosted checkout. Official Next.js community support documented. |
| toss-payments-server-api | latest (npm) | Server-side webhook verification | Validates payment confirmations server-side before order fulfillment. Required for any PG integration — never trust client. |
### AI Inference (ControlNet / Inpainting)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @fal-ai/client | latest | Managed AI inference SDK | fal.ai hosts SDXL ControlNet Union Inpainting (`fal-ai/sdxl-controlnet-union/inpainting`) and Fast SDXL ControlNet Canny Inpainting as production API endpoints with per-request billing. No GPU management. Best for the **artist promotional mockup** scenario where speed and zero-ops matter. |
| RunPod Serverless + ComfyUI worker | — | Custom workflow inference | For the **consumer space composition** scenario requiring precise cm-to-pixel scale math, a custom ComfyUI workflow on RunPod Serverless (via `runpod-workers/worker-comfyui`) gives full control over the inpainting pipeline. Cold starts <200ms (48% of RunPod serverless calls). Per-second GPU billing. ControlNet aux nodes are first-class supported. |
- **Scenario A — Artist promotional mockup** (styled gallery background): Use fal.ai managed endpoint. ~2-5s inference. Simple REST call from Supabase Edge Function.
- **Scenario B — Consumer space composition** (uploaded room photo + accurate artwork scale): Use RunPod ComfyUI serverless with a custom workflow that encodes the physical cm dimensions as pixel ratios before passing to ControlNet inpainting. This gives control over the scale calculation logic that a managed API cannot expose.
### Image Storage and CDN
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase Storage | bundled with Supabase | Primary artwork + user-uploaded photo storage | Already in stack. Supports RLS-based access control (private pre-signed URLs for draft artworks). On Pro plan: on-the-fly image transformation via imgproxy (resize, WebP conversion, quality control). Max 25MB input, 50MP resolution — sufficient for art photography. |
| Supabase Storage CDN | bundled | CDN delivery of public artwork images | Globally distributed CDN backed by Cloudflare is included in Supabase Storage. Cache TTL configurable. Adequate for artwork thumbnail/preview delivery without a separate CDN service. |
| next/image | bundled with Next.js | Client-side image optimization | Use with `loader` configured to Supabase Storage transformation URLs. Handles srcset generation, lazy loading, and format selection automatically. In Next.js 16, `images.minimumCacheTTL` defaults to 4 hours (up from 60s) — beneficial for artwork images that rarely change. |
### Scheduled Jobs (Auction Close)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase Cron (pg_cron) | bundled (Pro plan) | Scheduled auction-close jobs | pg_cron is a Postgres extension managed by Supabase. Schedule a cron job to run every minute checking `auctions WHERE end_at <= now() AND status = 'active'`. Triggers a Supabase Edge Function (via pg_net HTTP call) that: determines winner, marks auction sold, initiates payment request, sends email notifications. Zero additional infrastructure. |
| Supabase Edge Functions (Deno) | bundled | Webhook processor + cron target | Handles Toss Payments webhook verification, auction-close business logic, and email dispatch. Runs on Deno Deploy globally. |
### Email Service
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| resend | latest npm | Transactional email API | Resend has a permanent free tier (3,000 emails/month, 100/day) — enough for MVP. Clean modern API designed for Next.js/React developers. SendGrid eliminated its free tier in May 2025 and now requires a $19.95/month commitment after a 60-day trial. Resend and SendGrid are priced comparably at $20/month for 50K emails at scale. |
| react-email | 6.1.1 | Email template system | Build email templates as React components. Supports Tailwind 4. Integrates natively with Resend SDK. Templates: (1) purchase confirmation to buyer+artist, (2) auction win notification to winner+artist, (3) outbid notification. |
### State Management
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zustand | latest | Global client state | Lightweight, idiomatic for e-commerce global state (auth user, active bid, cart). Excellent Next.js App Router compatibility with official SSR patterns documented. Use for: current user session mirror, active auction state on listing page. |
| React Server Components (built-in) | — | Server-side data fetching | Use RSC as primary data layer. Zustand only for client-interactive state that crosses component boundaries (live bid amount, optimistic bid submission). |
### Validation and Forms
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zod | 4.x | Schema validation | Zod v4 released Aug 2025 with major performance improvements. Breaking changes from v3 (error API, optional fields behavior, `.strict()` replaced by `z.strictObject()`). Use v4 directly for greenfield. Critical for: payment webhook shape validation, artwork upload form, bid amount validation. |
| React Hook Form | latest | Form state management | Standard pairing with Zod via `@hookform/resolvers`. Minimal re-renders. Works with Next.js Server Actions via `useActionState`. Use for: artwork registration form (width/height cm required), bid input. |
### Observability and Monitoring
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Sentry | latest | Error tracking + performance | Sentry is the right MVP-stage choice: focused on error tracking, works equally well for indie and production scale, generous free tier. Next.js has official Sentry SDK (`@sentry/nextjs`). Captures both client and server errors. For ArtBridge, the critical path is payment + auction close — any silent error there loses money. |
| Supabase Dashboard logs | bundled | Database + API query monitoring | Supabase's built-in observability covers Postgres slow queries, Auth events, and Storage access logs. Sufficient for MVP database monitoring. |
## Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | latest | Supabase SSR auth helpers for Next.js | Always — handles cookie-based session management in App Router Server Components, middleware (proxy.ts in Next.js 16), and Client Components. |
| sharp | latest | Server-side image processing | For the scale calculation logic: when a consumer uploads a room photo, compute the pixel dimensions of the artwork from its real-world cm measurements before sending to AI inference. Run in Next.js API route / Edge Function. |
| @tosspayments/tosspayments-sdk | latest | Toss Payments client widget | Loaded client-side on checkout page. Manages card input, 3DS, and Toss Pay native flow. |
| @portone/browser-sdk | latest | PortOne browser SDK (alternative) | Use instead of direct Toss SDK if you later need multi-PG support (KG Inicis, etc.). |
| @fal-ai/client | latest | fal.ai inference client | Use for Scenario A (artist mockup generation). Handles async polling for long-running inference jobs. |
| lucide-react | latest | Icon library | Standard choice for Tailwind + shadcn/ui projects. Tree-shakeable. |
| shadcn/ui | — (copy-paste, not npm) | UI component primitives | Built on Radix UI + Tailwind. Use for auction bid input, image upload dropzone, artwork detail modal. Not a dependency — components are copied into `/components/ui`. |
| date-fns | latest | Date formatting + countdown | Auction end countdown timers. Lightweight, tree-shakeable, no locale issues. |
| @hookform/resolvers | latest | Zod adapter for React Hook Form | Required to use Zod schemas as RHF validators. |
## Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Local dev DB + type generation | `npx supabase gen types typescript` generates Postgres schema types. Essential for type-safe DB queries. Run after every schema migration. |
| Biome | Linting + formatting | Next.js 16 removed `next lint`; Biome replaces ESLint + Prettier in a single binary. Faster. Use `biome check --write .` in CI. |
| Turbopack | Development bundler | Default in Next.js 16. Enable Turbopack file system caching (`turbopackFileSystemCacheForDev: true`) in `next.config.ts` for faster restart times during heavy dev iteration. |
| Vitest | Unit testing | Fast, Vite-native, works with TypeScript. Use for: scale calculation math (cm-to-pixel), auction close logic, Zod schema tests. |
| Playwright | E2E testing | Test the critical paths: artwork upload → AI mockup generation → bid → payment. |
## Installation
# Bootstrap project
# Supabase
# Payments (Toss)
# AI inference
# Email
# Validation + Forms
# State
# UI + Utilities
# Observability
# Dev tools
# Supabase CLI (global or local)
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Toss Payments (direct) | PortOne aggregator | When you need to support 3+ Korean PGs simultaneously or need a single integration to manage Toss + KG Inicis + NHN KCP routing. Add in v2 if international sellers require different PGs. |
| Toss Payments | Stripe | Only if ArtBridge targets international buyers (US/EU) from day one. Stripe does not support Korean domestic payment methods natively. |
| fal.ai (managed) | Replicate | If fal.ai rate limits become a problem at scale. Replicate has broader model catalog but is more expensive. |
| RunPod Serverless (custom) | Modal.com | Modal has a cleaner Python SDK and cold-start guarantees. Use if the team is more comfortable with Python than Dockerized ComfyUI workers. |
| Supabase Storage CDN | Cloudflare Images | When you need advanced image transformations (face detection, AI auto-crop, background removal) beyond what imgproxy provides, or when artwork image volume makes Supabase Storage Pro pricing uneconomical. |
| Resend | SendGrid | If email volume exceeds Resend's $20/month tier (50K emails) or if dedicated IP warm-up is required for deliverability at scale. |
| Zustand | TanStack Query | If the product evolves to have heavy client-side data fetching outside of RSC (e.g., infinite scroll feed, complex filtering). |
| Sentry | Datadog | When the team is 5+, has dedicated infrastructure, and needs unified infrastructure metrics + APM in one platform. |
| Zod v4 | Zod v3 | If you're integrating with existing libraries that haven't migrated to v4 (check for `zod` peer dependency version constraints in your toolchain). A community codemod (`zod-v3-to-v4`) handles migration. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Stripe (for Korean market) | Does not support Korean credit cards (BC, Shinhan, KB), bank transfer (계좌이체), or Toss Pay wallet. Korean consumers will abandon checkout. | Toss Payments SDK |
| PortOne (for v1) | Adds abstraction layer + usage-based fees on top of Toss for no benefit when Toss is your only PG. | Toss Payments direct SDK |
| Pages Router | Deprecated routing model. No Server Components, no Streaming, no native Server Actions. Next.js 16 is optimized for App Router exclusively. | App Router (already planned) |
| Redux Toolkit | Overkill for ArtBridge's flat state model. Significant boilerplate. React Compiler in Next.js 16 handles memoization automatically, removing one of Redux's historical advantages. | Zustand |
| TanStack Query + Supabase Realtime | Redundant — TanStack Query's polling/cache invalidation overlaps with what Supabase Realtime subscriptions do natively. Using both for the same data source creates bugs. | Supabase Realtime channel directly |
| `middleware.ts` (Next.js 16) | Deprecated in Next.js 16. Removed in a future version. | Rename to `proxy.ts`, export `proxy` function |
| Prisma ORM | Adds a Node.js ORM layer when Supabase already provides type-safe PostgREST queries + generated TypeScript types. Doubles the mental model for DB access. | `@supabase/supabase-js` with generated types |
| Vercel AI SDK (for image generation) | Vercel AI SDK is optimized for LLM streaming text. ControlNet/Inpainting is an image-to-image task with async polling, not text streaming. The abstraction adds no value and hides model-specific options needed for scale accuracy. | Direct `@fal-ai/client` or RunPod HTTP API |
| SendGrid (for MVP) | Eliminated free tier May 2025. Costs $19.95/month before the product has any users. No advantage over Resend at MVP email volumes. | Resend |
| Tailwind CSS v3 | v4 is the current stable release (Jan 2025). v3's JavaScript config file model is legacy. New Next.js projects should start on v4 — migration is harder than starting fresh. | Tailwind CSS v4 |
| `experimental.ppr` flag | Removed in Next.js 16. Do not use — build will error. | `cacheComponents: true` in `next.config.ts` |
| `unstable_` caching APIs | `unstable_cache`, `unstable_cacheTag`, etc. are promoted to stable in Next.js 16 without the prefix. Use the stable names from day one. | `cacheLife`, `cacheTag`, `use cache` directive |
## Stack Patterns by Scenario
- Upload image to Supabase Storage (private bucket)
- Extract metadata (dimensions already captured in form via Zod + React Hook Form)
- Trigger fal.ai `fal-ai/sdxl-controlnet-union/inpainting` via Supabase Edge Function
- Store generated mockup URL back in Supabase Storage (public bucket)
- Realtime channel notifies artist's client when generation completes
- Consumer uploads room photo to Supabase Storage (temporary bucket, auto-delete after 24h)
- Server calculates artwork pixel size: `artwork_px = (artwork_cm / room_estimated_width_cm) * room_img_px_width` using sharp for room image analysis
- Send room image + artwork image + mask to RunPod ComfyUI serverless endpoint
- Composite result returned, stored temporarily in Supabase Storage
- Pre-signed URL (60min TTL) returned to consumer — not permanently stored
- Supabase Realtime channel subscribed to `auctions` table `UPDATE` events (RLS-filtered to specific auction_id)
- Client optimistically updates bid display, server validates via Server Action
- pg_cron checks every 60s for expired auctions → Edge Function closes auction → email via Resend
- Client loads Toss Payments widget with `@tosspayments/tosspayments-sdk`
- On payment success, Toss calls Supabase Edge Function webhook
- Edge Function verifies payment with Toss REST API (server-to-server)
- Updates `orders` / `auctions` status in Postgres atomically
- Dispatches confirmation emails via Resend to buyer and artist
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.x | @supabase/supabase-js@2.x | Supabase JS v2 is isomorphic and works in both RSC and Client Components |
| next@16.x | @supabase/ssr@latest | Required for cookie-based auth in App Router; `@supabase/auth-helpers-nextjs` is deprecated — do not use |
| next@16.x | tailwindcss@4.x | Requires `@tailwindcss/postcss` in `postcss.config.mjs`; no `tailwind.config.js` in v4 |
| next@16.x | Node.js 20.9+ | Next.js 16 minimum; Node.js 18 support dropped |
| zod@4.x | react-hook-form + @hookform/resolvers | Check `@hookform/resolvers` supports Zod v4 before installing; v4 introduced breaking changes to error API |
| @sentry/nextjs | next@16.x | Use `@sentry/nextjs` (not base `@sentry/node`); Next.js 16 proxy.ts replaces middleware.ts — update Sentry tunnel config accordingly |
| react-email@6.x | resend@latest | Native integration; Resend accepts `react` prop directly |
## Sources
- [Next.js 16 official release blog](https://nextjs.org/blog/next-16) — verified stable release Oct 2025, features, breaking changes (HIGH confidence)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — breaking changes list (HIGH confidence)
- [Supabase Storage Image Transformations docs](https://supabase.com/docs/guides/storage/serving/image-transformations) — imgproxy, Pro plan requirement (HIGH confidence)
- [Supabase Cron docs](https://supabase.com/docs/guides/cron) — pg_cron + Edge Function scheduling pattern (HIGH confidence)
- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) — auction realtime pattern (HIGH confidence)
- [fal.ai SDXL ControlNet Union Inpainting API](https://fal.ai/models/fal-ai/sdxl-controlnet-union/inpainting/api) — confirmed ControlNet support (HIGH confidence)
- [RunPod worker-comfyui GitHub](https://github.com/runpod-workers/worker-comfyui) — ComfyUI serverless with ControlNet aux nodes (HIGH confidence)
- [Toss Payments npm packages](https://www.npmjs.com/package/@tosspayments/tosspayments-sdk) — SDK verified on npm (HIGH confidence)
- [PortOne browser-sdk npm](https://www.npmjs.com/package/@portone/browser-sdk) — PortOne v2 SDK verified (HIGH confidence)
- [Tailwind CSS v4 release](https://fireup.pro/news/tailwind-css-v4-0) — Jan 22, 2025 stable release, CSS-first config (HIGH confidence)
- [Resend vs SendGrid 2026 comparison](https://www.webnuz.com/article/2026-04-13/Resend%20vs%20SendGrid%20(2026)%20%20SendGrid%20Killed%20Its%20Free%20Tier,%20Now%20What) — SendGrid free tier removed May 2025 (HIGH confidence)
- [react-email npm](https://www.npmjs.com/package/react-email) — v6.1.1 current (HIGH confidence)
- [Zod v4 release InfoQ](https://www.infoq.com/news/2025/08/zod-v4-available/) — Aug 2025, major performance improvements, breaking changes (HIGH confidence)
- [Zustand vs Next.js App Router patterns](https://eastondev.com/blog/en/posts/dev/20251219-nextjs-state-management/) — Zustand best choice for App Router (MEDIUM confidence)
- [RunPod vs fal AI comparison](https://www.runpod.io/articles/comparison/runpod-vs-fal-ai) — performance and ControlNet support comparison (MEDIUM confidence)
- [South Korea payments 2025](https://paymentscmi.com/insights/south-korea-2025-payments-ecommerce-trends/) — market context for payment method choices (MEDIUM confidence)
- [Supabase Realtime + Next.js auction GitHub example](https://github.com/functionfirst/auctions-next-supabase) — validated architecture pattern exists (MEDIUM confidence)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
