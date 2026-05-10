# ArtBridge

## What This Is

ArtBridge는 그림 작가와 일반 소비자를 직접 연결하는 AI 기반 미술 작품 이커머스/경매 플랫폼입니다. 작가는 작품을 등록해 정찰제 또는 경매로 판매하고, 소비자는 자신의 공간 사진을 업로드해 작품이 실제 사이즈 비율로 합성된 모습을 미리 확인한 뒤 구매하거나 입찰합니다.

## Core Value

소비자가 "내 공간에 이 작품이 어떻게 어울릴지"를 구매 전에 정확한 사이즈로 미리 보고 확신을 갖고 구매(또는 입찰)할 수 있어야 한다 — 이 시각화 경험이 무너지면 다른 모든 기능이 의미를 잃는다.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 작가가 작품의 평면 사진과 실제 사이즈(가로/세로 cm)를 입력해 등록할 수 있다
- [ ] 작가가 작품마다 판매 방식(정찰제 / 경매)을 선택할 수 있다
- [ ] 작가가 업로드한 작품에 대해 AI가 세련된 배경의 홍보용 목업 이미지를 자동 생성한다
- [ ] 소비자가 자신의 공간 사진을 업로드하면 작품 실제 사이즈 비율에 맞춰 합성된 시뮬레이션 이미지를 볼 수 있다
- [ ] 소비자가 정찰제 작품을 즉시 구매하고 결제할 수 있다
- [ ] 소비자가 경매 작품에 실시간으로 입찰하고 현재가를 확인할 수 있다
- [ ] 경매 종료 시 최종 낙찰자가 자동 결정되고 결제 단계로 진입한다
- [ ] 판매/낙찰 완료 시 작가와 구매자/낙찰자에게 자동 이메일 알림이 전송된다
- [ ] 작가/소비자 역할 기반 회원가입·로그인을 제공한다

### Out of Scope

- 다중 에디션 / 굿즈 판매 — 모든 작품은 단 하나뿐(unique)이라는 전제가 경매 시스템의 핵심
- 오프라인 결제·송금 처리 — 온라인 결제 게이트웨이로 한정
- 자체 결제 PG 직접 구축 — 외부 결제 서비스(예: Toss/Stripe) 연동으로 처리
- 자체 AI 모델 학습 — Stable Diffusion / ControlNet 등 기성 모델/API 활용
- 소셜 피드, 팔로우, 댓글 등 커뮤니티 기능 — v1 핵심 가치(시각화·거래)에서 벗어남

## Context

- 단일 작품(unique) 기반 마켓플레이스이므로 재고/SKU 모델보다 경매·1점 판매 모델이 자연스럽다.
- 시각화 정확도가 신뢰 기반 — 작품 실제 사이즈와 공간 비율이 맞지 않으면 플랫폼 가치 자체가 훼손된다.
- AI 합성은 두 가지 시나리오로 분리: (1) 작가용 홍보 목업(스타일 공간), (2) 소비자용 공간 합성(소비자 업로드 사진 + 스케일 정확도).
- Supabase Auth/DB/Realtime을 활용해 입찰 실시간성과 사용자 관리 부담을 낮춘다.
- 한국어 UX 우선 (작가/소비자 모두 국내 사용자 가정).

## Constraints

- **Tech stack — Frontend**: Next.js (App Router) + Tailwind CSS — 명시적으로 합의됨
- **Tech stack — Backend/DB**: Supabase (Auth, Postgres, Realtime, Storage) — 인증·실시간 비딩·이미지 저장을 한 곳에서 처리
- **Tech stack — AI**: Stable Diffusion / ControlNet 계열 (Inpainting & Composition) + 사이즈 스케일 자동 조정 로직
- **Tech stack — Email**: Resend 또는 SendGrid (택1, 비교 후 결정)
- **Domain — 작품 단일성**: 모든 상품은 1점뿐 → 재고 모델 대신 status(available/auctioning/sold) 기반
- **Domain — 사이즈 정확성**: 공간 합성 시 작품 실제 cm가 픽셀 비율로 정확히 환산되어야 함

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router + Supabase 스택 | Auth/DB/Realtime/Storage 통합 → 빠른 MVP 구축 | — Pending |
| 모든 작품은 unique(1점) | 미술 작품의 본질 + 경매 모델의 전제 | — Pending |
| AI 합성을 작가/소비자 두 시나리오로 분리 | 작가는 홍보용 스타일링, 소비자는 정확한 스케일 시뮬레이션 — 목적이 다름 | — Pending |
| 결제 PG는 외부 연동 | 자체 구축 비용 과대, 보안 부담 회피 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-10 after initialization*
