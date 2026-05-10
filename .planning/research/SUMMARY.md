# Project Research Summary — ArtBridge

**Domain:** AI-powered art e-commerce + real-time auction platform (Korean market)
**Researched:** 2026-05-10
**Confidence:** HIGH

## Executive Summary

ArtBridge는 한국 작가와 구매자를 잇는 단일 작품(unique) 마켓플레이스로, **AI가 작품을 실제 물리 크기 비율로 구매자의 공간 사진에 합성**하는 기능을 핵심 차별점으로 삼는다. Saatchi Art, Artsy, LiveAuctioneers 등 주류 미술 마켓 어디에도 이 기능은 없다. 스케일 수치가 틀리면 제품의 핵심 가치가 무너지므로, cm→픽셀 환산 엔진은 "있으면 좋은 것"이 아니라 출시 전 정확성이 검증되어야 하는 필수 요건이다.

권장 스택은 단일 Supabase 백엔드(Postgres + Auth + Realtime + Storage) 위에 Next.js 16 App Router 프런트, 결제는 Toss Payments(한국 시장), AI 추론은 작가 홍보 목업용 fal.ai와 소비자 공간 합성용 RunPod ComfyUI Serverless로 분리한다. 경매 종료는 Supabase pg_cron이 Postgres 내부에서 처리하여 외부 스케줄러 의존을 피한다.

가장 큰 리스크는 두 가지다. (1) 동시성 — 동시 입찰 race와 단일 작품을 두 명이 동시에 구매하는 race 모두 Postgres row-level lock으로 1일차부터 막아야 한다. (2) AI 추론 비용 폭주 — 업로드/시각화마다 GPU 호출($0.05–0.20/회)이 발생하므로 사용자별 쿼터와 비동기 큐, 공급자측 spend cap이 프로덕션 트래픽 이전에 갖춰져야 한다. RLS는 모든 테이블에 스키마 작성 시점부터 활성화한다.

## Key Findings

### Recommended Stack
- **Next.js 16 + React 19** (App Router, Cache Components, `proxy.ts`)
- **Tailwind CSS v4** (CSS-first config)
- **Supabase**: Postgres + RLS + pg_cron + Auth + Realtime(WAL Postgres Changes) + Storage(imgproxy 변환)
- **Toss Payments** (`@tosspayments/tosspayments-sdk`) — Stripe·PortOne 대신 Toss 직접 연동
- **AI 추론**: fal.ai(작가 홍보 목업, SDXL ControlNet Inpainting) + RunPod ComfyUI Serverless(소비자 공간 합성, 정확한 스케일)
- **Resend + React Email v6** (SendGrid는 2025-05 무료 티어 폐지로 제외)
- **Zod v4 + React Hook Form**, **Zustand**(최소한의 클라이언트 상태)

### Expected Features
- **Table stakes**: 역할 기반 인증(작가/구매자), 작품 등록(사진+cm), 검색/상세, 정찰 결제, 실시간 입찰+현재가, anti-sniping(3–5분), 자동 종료, 낙찰 결제, 트랜잭션 이메일, 위시리스트
- **Differentiators (the moat)**: 스케일 정확 공간 합성, AI 홍보 목업 자동 생성
- **Defer**: 주문 추적, 작가 대시보드, 추천, 분쟁 플로우 등
- **Anti-features**: 다중 에디션, 소셜 피드, NFT, reserve price, 인앱 메시징

### Architecture Approach
RSC + Server Action 모델 위에서 외부 진입은 Route Handler 두 개(결제·AI 웹훅)뿐. 입찰 로직은 전부 Postgres `place_bid()` 함수 안에서 `SELECT FOR UPDATE`로 직렬화한다. AI 추론은 `ai_jobs` 테이블 큐 + Edge Function 워커로 비동기 처리. 경매 종료는 pg_cron이 분당 `close_expired_auctions()` 호출.

**주요 컴포넌트**: Next.js App Router → Server Actions → Supabase(Postgres+RLS, Realtime, Storage) → AI Job Queue(`ai_jobs` + Edge Function + fal.ai/RunPod) → pg_cron + pg_net → Email Edge Function(Resend) → Webhook Route Handlers(Toss/AI).

### Critical Pitfalls
1. **동시 입찰 race** → `place_bid()` 안에서 `SELECT FOR UPDATE`. 앱 레이어 검증 후 INSERT는 절대 금지.
2. **단일 작품 동시 결제 race** → `UPDATE artworks SET status='sold' WHERE id=$id AND status='available' RETURNING id`로 원자 처리.
3. **AI 비용 폭주** → 인라인 호출 금지, `ai_jobs` 큐, 사용자별 일일 쿼터, 공급자 spend cap.
4. **스케일 계산 오류** → 사용자가 방 치수 또는 기준 객체 입력 필수. 잘못된 시각화 1회 = 신뢰 영구 훼손.
5. **RLS 미설정** → 모든 테이블 RLS 활성화 + anon key로 테스트.
6. **Realtime 입찰 유실** → Postgres Changes 사용 + 재연결 시 REST 재조회.
7. **낙찰 후 미결제** → authorize-only 후 capture; 실패 시 차순위 fallback. 48시간 결제 윈도우.

## Implications for Roadmap

7-phase 구조 권장:

1. **Foundation — Auth + Schema + RLS** (모든 후속 의존, RLS 후에 도입 불가)
2. **Artwork CRUD + Storage** (cm 차원 강제, private/public 버킷 분리)
3. **AI Promotional Mockup Pipeline** (작가용, fal.ai 비동기 큐 인프라 정착)
4. **Consumer Space Visualization** (RunPod, 스케일 엔진 — 핵심 차별점)
5. **Fixed-Price Purchase + Toss Payments** (웹훅 idempotency 패턴 정착)
6. **Real-Time Auction System** (place_bid + Realtime + pg_cron + anti-sniping)
7. **Email Notifications + Watchlist** (이전 단계 이벤트 트리거 활용)

**Research flags**:
- Phase 3: fal.ai async queue + 웹훅 서명 검증
- Phase 4: RunPod ComfyUI 워크플로우 프로토타입 필요
- Phase 5/6: Toss Payments authorize-then-capture(한국어 문서 검증)

**Standard patterns** (skip 추가 research): Phase 1, 2, 7

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 공식 docs/npm 검증 완료 |
| Features | HIGH | 경쟁 플랫폼 대조 검증 |
| Architecture | HIGH | Supabase/Postgres 공식 패턴 기반 |
| Pitfalls | HIGH | 실제 사고 사례·공식 보안 가이드 cross-ref |

**Gaps to validate**:
- Toss Payments authorize-then-capture 매뉴얼 capture API 정확한 호출
- RunPod ComfyUI ControlNet inpainting end-to-end 프로토타입
- 공간 스케일 입력 UX 실사용자 검증
- Supabase pg_net 가용 플랜 확인
- Zod v4 ↔ `@hookform/resolvers` 호환성

## Sources
공식 docs: Next.js 16, Supabase(Storage/Cron/Realtime/RLS/Edge Functions), PostgreSQL Locking, fal.ai, Toss Payments, Tailwind v4, Resend/React Email, Zod v4, Stripe(authorize/capture 패턴 참고). 사례: Vendure 재고 race 이슈, 다수 Supabase RLS 보안 감사 보고서, AR scale 정확도 연구(Happy Measure).

---
*Research completed: 2026-05-10*
*Ready for roadmap: yes*
