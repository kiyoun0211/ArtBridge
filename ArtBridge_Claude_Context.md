# Project: ArtBridge - AI-Powered Art E-commerce & Auction Platform

## 1. Project Overview
그림 작가와 일반 소비자를 연결하는 이커머스 웹/앱 플랫폼입니다. AI를 활용해 작품과 실제 공간의 조화를 시각화하고, 희소성 있는 작품을 위한 비딩(경매) 시스템을 제공합니다.

## 2. Core Features (요구 사항)

### 2.1 작가 (Seller) 기능
- **작품 등록:** 작품의 평면 사진과 실제 사이즈(Width, Height) 입력 필수.
- **AI 홍보용 목업:** 작품 업로드 시 AI가 세련된 배경에 작품을 합성한 홍보용 이미지 자동 생성.
- **판매 방식 선택:** 일반 정찰제 판매 또는 옥션(AI 비딩) 중 선택.

### 2.2 소비자 (Consumer) 기능
- **공간 업로드 & 목업:** 소비자가 자신의 공간(거실, 방 등) 사진을 올리면, 작가가 등록한 실제 사이즈 비율에 맞춰 작품이 합성된 모습 확인.
- **AI 비딩 (Auction):** 모든 상품은 단 하나뿐인 작품이므로 경매 시스템 참여 가능.
- **구매 및 결제:** 일반 구매 및 낙찰 상품 결제.

### 2.3 시스템 및 자동화
- **자동 이메일 알림:** - 일반 상품 판매 완료 시 작가/구매자 알림.
    - 옥션 종료 시 최종 낙찰자 및 작가에게 낙찰 결과 자동 전송.

## 3. Technical Requirements (기술 요구사항)

### 3.1 Architecture
- **Frontend:** Next.js (App Router), Tailwind CSS.
- **Backend/DB:** Supabase (Auth, DB, Real-time).
- **AI Integration:** - Image Inpainting & Composition (Stable Diffusion / ControlNet).
    - 작품 사이즈 정보를 기반으로 공간 사진 내 스케일 자동 조정 로직.
- **Email Service:** Resend 또는 SendGrid API.

### 3.2 Database Schema (Core)
- `products`: id, artist_id, image_url, width, height, sale_type(fixed/auction), status.
- `auctions`: product_id, current_bid, end_at, winner_id.
- `users`: id, email, role(artist/consumer).

## 4. Development Roadmap
1. 기본 CRUD 및 이미지 업로드 (작가용).
2. AI 이미지 합성 API 연동 (목업 생성).
3. 실시간 비딩 로직 및 상태 관리 (Supabase Realtime 활용).
4. 이메일 자동화 워크플로우 구축.
