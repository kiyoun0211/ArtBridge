# ArtBridge — v1 Requirements

> Scope locked at project initialization (2026-05-10). Items grouped by category with REQ-IDs. Traceability filled by ROADMAP.md.

## v1 Requirements

### Authentication & Roles (AUTH)
- [ ] **AUTH-01**: 사용자가 이메일/비밀번호로 작가 또는 구매자 역할로 회원가입한다
- [ ] **AUTH-02**: 사용자가 로그인하고 세션이 유지된다 (Supabase Auth)
- [ ] **AUTH-03**: 사용자가 어느 페이지에서든 로그아웃할 수 있다
- [ ] **AUTH-04**: 역할(작가/구매자)에 따라 라우트와 기능이 가드된다

### Artwork Listing & Storage (ART)
- [ ] **ART-01**: 작가가 작품 사진을 업로드할 수 있다 (Supabase Storage, 원본은 비공개 버킷)
- [ ] **ART-02**: 작가가 작품의 가로/세로 실측(cm)을 필수로 입력한다 (검증 포함)
- [ ] **ART-03**: 작가가 작품의 판매 방식을 정찰제 또는 경매로 선택해 등록한다
- [ ] **ART-04**: 작가가 자신의 작품 목록을 조회·편집·삭제(미판매 한정)할 수 있다
- [ ] **ART-05**: 누구나 공개된 작품 갤러리/상세 페이지를 볼 수 있다
- [ ] **ART-06**: 사용자가 작품을 키워드로 검색할 수 있다 (Postgres full-text search)

### AI Promotional Mockup — Artist (AIPROMO)
- [ ] **AIPROMO-01**: 작품 업로드 시 fal.ai 기반 비동기 작업이 큐에 등록된다 (`ai_jobs`)
- [ ] **AIPROMO-02**: AI가 세련된 배경에 작품을 합성한 홍보용 목업 이미지를 자동 생성해 작품 상세에 노출한다
- [ ] **AIPROMO-03**: 생성 진행/실패 상태가 작가 화면에 표시된다 (폴링 또는 Realtime)
- [ ] **AIPROMO-04**: 사용자별 일일 AI 호출 쿼터와 공급자 spend cap을 적용한다

### AI Space Visualization — Consumer (AIVIZ)
- [ ] **AIVIZ-01**: 구매자가 자신의 공간 사진을 업로드할 수 있다
- [ ] **AIVIZ-02**: 구매자가 공간의 기준 치수(예: 한쪽 벽 너비 cm) 또는 기준 객체를 입력해 스케일 기준을 제공한다
- [ ] **AIVIZ-03**: 시스템이 작품 실측(cm)과 공간 기준 치수를 이용해 정확한 픽셀 비율로 변환한다
- [ ] **AIVIZ-04**: RunPod ComfyUI 비동기 워크플로우로 작품을 공간에 합성한 결과 이미지를 제공한다
- [ ] **AIVIZ-05**: 합성 결과가 비동기로 도착하면 구매자 화면에 표시된다 (폴링/웹훅)

### Fixed-Price Purchase (BUY)
- [ ] **BUY-01**: 구매자가 정찰제 작품을 즉시 구매할 수 있다
- [ ] **BUY-02**: 결제는 Toss Payments로 처리된다
- [ ] **BUY-03**: 작품 status는 원자적 `UPDATE ... WHERE status='available'`으로 잠금 처리된다 (단일 작품 race 방지)
- [ ] **BUY-04**: Toss 결제 웹훅을 서명 검증 + idempotency로 처리한다
- [ ] **BUY-05**: 구매자가 자신의 주문 내역과 상태를 조회할 수 있다

### Real-Time Auction (AUC)
- [ ] **AUC-01**: 경매 작품 상세 페이지에서 현재 최고가가 실시간으로 갱신된다 (Supabase Realtime Postgres Changes)
- [ ] **AUC-02**: 구매자가 입찰을 시도하면 Postgres `place_bid()` 함수가 `SELECT FOR UPDATE`로 동시성 race를 차단한다
- [ ] **AUC-03**: 종료 직전 입찰 시 anti-sniping으로 종료 시간이 자동 연장된다 (3–5분)
- [ ] **AUC-04**: pg_cron이 종료 시각이 지난 경매를 닫고 최종 낙찰자를 결정한다
- [ ] **AUC-05**: 낙찰자에게 결제 윈도우(예: 48시간)와 결제 페이지가 제공된다 (authorize → capture 흐름)
- [ ] **AUC-06**: WebSocket 재연결 시 클라이언트가 현재 상태를 REST로 재조회한다

### Notifications & Watchlist (NOTIF)
- [ ] **NOTIF-01**: 정찰제 판매 완료 시 작가와 구매자에게 자동 이메일이 전송된다 (Resend + React Email)
- [ ] **NOTIF-02**: 경매 종료 시 낙찰자/작가/차순위(필요 시)에게 결과 이메일이 전송된다
- [ ] **NOTIF-03**: 입찰이 갱신되어 outbid된 사용자에게 이메일이 전송된다
- [ ] **NOTIF-04**: 사용자가 작품을 위시리스트에 추가/제거할 수 있다

### Security & Data Integrity (SEC)
- [ ] **SEC-01**: 모든 Supabase 테이블에 RLS가 활성화되며 anon key로 권한 테스트가 통과해야 한다
- [ ] **SEC-02**: 원본 작품 파일은 비공개 버킷에서만 접근하며 공개 URL로 노출되지 않는다
- [ ] **SEC-03**: 외부 웹훅(결제, AI)은 서명 검증 + idempotency 체크를 거친다

## v2 Requirements (Deferred)
- 작가 매출/통계 대시보드, 주문 추적 상세, 추천(태그/임베딩 기반), KYC/AML, proxy bidding, reserve price, 모바일 앱.

## Out of Scope (Explicit)
- 다중 에디션·굿즈 판매 — 단일 작품 모델이 경매·시각화 가치의 근간
- 자체 결제 PG — 외부 게이트웨이로 한정 (보안·규제 부담)
- 자체 AI 모델 학습 — 기성 모델/API 활용
- 소셜 피드/팔로우/댓글 — v1 핵심 가치 밖
- NFT/블록체인 — 현재 비즈니스 모델과 무관
- 인앱 메시징 — 분쟁/문의는 이메일로 한정

## Traceability

| REQ-ID | Phase | Notes |
|--------|-------|-------|
| (filled by ROADMAP.md) | | |
