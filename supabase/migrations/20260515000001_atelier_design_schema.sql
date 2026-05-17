-- ATELIER 1/1 — Replace prior schema with Claude Design's mock schema.
-- Wipes old tables, then creates artists / artworks / bids / room_presets
-- exactly as exported from the design's Supabase package.

-- ===== Drop old tables (and dependents) =====
drop table if exists public.ai_jobs       cascade;
drop table if exists public.orders        cascade;
drop table if exists public.bids          cascade;
drop table if exists public.auctions      cascade;
drop table if exists public.artworks      cascade;
drop table if exists public.room_presets  cascade;
drop table if exists public.artists       cascade;
drop table if exists public.profiles      cascade;

-- Trigger/function from prior handle_new_user migration
drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ===== Extensions =====
create extension if not exists "pgcrypto";

-- ===== artists =====
create table artists (
  id            text primary key,
  name          text not null,
  name_kr       text,
  location      text,
  born          int,
  active_since  int,
  bio_kr        text,
  bio_en        text,
  medium        text,
  portrait_url  text,
  works_count   int default 0,
  sold_count    int default 0,
  followers     text,
  created_at    timestamptz default now()
);

-- ===== artworks =====
create table artworks (
  id                  text primary key,
  artist_id           text not null references artists(id) on delete cascade,
  title               text not null,
  title_kr            text,
  year                int,
  medium              text,
  medium_kr           text,
  width_cm            numeric(6,1),
  height_cm           numeric(6,1),
  depth_cm            numeric(6,1),
  weight_kg           numeric(6,2),
  body_text           text,
  image_url           text,
  placeholder_class   text,
  mode                text not null check (mode in ('sale','auction')),
  price_krw           bigint,
  status              text default 'available' check (status in ('available','reserved','sold')),
  start_bid_krw       bigint,
  current_bid_krw     bigint,
  estimate_low_krw    bigint,
  estimate_high_krw   bigint,
  bid_count           int default 0,
  auction_ends_at     timestamptz,
  created_at          timestamptz default now()
);
create index idx_artworks_artist on artworks(artist_id);
create index idx_artworks_mode   on artworks(mode);

-- ===== bids =====
create table bids (
  id          uuid primary key default gen_random_uuid(),
  artwork_id  text not null references artworks(id) on delete cascade,
  bidder_name text not null,
  amount_krw  bigint not null,
  placed_at   timestamptz default now()
);
create index idx_bids_artwork on bids(artwork_id, placed_at desc);

-- ===== room_presets =====
create table room_presets (
  id           text primary key,
  label        text not null,
  image_url    text not null,
  wall_x       numeric(5,2),
  wall_y       numeric(5,2),
  wall_w       numeric(5,2),
  wall_h       numeric(5,2),
  skew_y       numeric(5,2) default 0,
  rot_y        numeric(5,2) default 0,
  is_active    boolean default true
);

-- ===== Seed: artists =====
insert into artists (id, name, name_kr, location, born, active_since, bio_kr, bio_en, medium, works_count, sold_count, followers) values ('ya', 'Yoon Ara', '윤아라', 'Seoul, KR', 1989, 2014, '윤아라는 도시의 표면과 빛이 만들어내는 미세한 진동을 색면 회화로 옮긴다. 두꺼운 안료의 반복된 레이어 사이로 발견되는 ''우연한 시간''이 그녀의 화면을 지배한다.', 'Yoon Ara translates the quiet vibration between urban surfaces and light into colour-field paintings. Repeated layers of thick pigment hold the ''accidental time'' that governs her surfaces.', 'Oil, pigment on linen', 28, 17, '2.4k') on conflict (id) do nothing;
insert into artists (id, name, name_kr, location, born, active_since, bio_kr, bio_en, medium, works_count, sold_count, followers) values ('kj', 'Kim Jiho', '김지호', 'Busan, KR', 1992, 2017, '정물과 인물의 경계를 흐리며, 사물의 ''초상화''를 그린다.', 'Blurs the line between still life and portrait — paints the ''portraits'' of objects.', 'Oil on canvas', 14, 9, '980') on conflict (id) do nothing;
insert into artists (id, name, name_kr, location, born, active_since, bio_kr, bio_en, medium, works_count, sold_count, followers) values ('lh', 'Lee Hae-on', '이해온', 'Jeju, KR', 1985, 2010, '제주의 풍경을 추상으로 환원한다.', 'Reduces Jeju''s landscape into pure abstraction.', 'Acrylic, sand on board', 41, 33, '5.1k') on conflict (id) do nothing;
insert into artists (id, name, name_kr, location, born, active_since, bio_kr, bio_en, medium, works_count, sold_count, followers) values ('po', 'Park Onyu', '박온유', 'Berlin / Seoul', 1991, 2016, '텍스트와 이미지를 충돌시키는 미니멀 컴포지션.', 'Minimal compositions that collide text with image.', 'Mixed media on paper', 22, 14, '1.7k') on conflict (id) do nothing;

-- ===== Seed: artworks =====
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w01', 'ya', 'Burnt Hour, no. 4', '타버린 시간 no.4', 2025, 'Oil on linen', '린넨에 유채', 89, 116, 4, 6.2, NULL, NULL, 'art-rothko-amber', 'auction', NULL, 2800000, 4200000, 5000000, 7500000, 23, now() + interval '22361 seconds') on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w02', 'ya', 'Blue Hours', '푸른 시간', 2024, 'Oil on linen', '린넨에 유채', 73, 92, 4, 4.8, NULL, NULL, 'art-rothko-blue', 'sale', 5400000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w03', 'ya', 'Ochre Window', '오커 창', 2025, 'Pigment on board', '보드에 안료', 60, 80, 3, 3.1, NULL, NULL, 'art-field-ochre', 'auction', NULL, 1200000, 1900000, NULL, NULL, 11, now() + interval '2700 seconds') on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w04', 'kj', 'Dust III', '먼지 III', 2024, 'Oil on canvas', '캔버스에 유채', 50, 65, 3, 2.4, NULL, NULL, 'art-still', 'sale', 2800000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w05', 'po', 'Unspoken', '말하지 않은 것', 2025, 'Mixed media', '혼합 매체', 42, 60, 3, 1.6, '한 번도 / 말하지 / 않은 채로', NULL, 'art-text', 'sale', 1400000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w06', 'lh', 'Field, Slowly', '천천한 들판', 2024, 'Acrylic, sand', '아크릴, 모래', 120, 80, 4, 7.2, NULL, NULL, 'art-field-sage', 'sale', 6900000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w07', 'kj', 'Pomegranate', '석류', 2024, 'Oil on canvas', '캔버스에 유채', 40, 50, 3, 1.4, NULL, NULL, 'art-still', 'auction', NULL, 600000, 880000, NULL, NULL, 6, now() + interval '79200 seconds') on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w08', 'lh', 'After the Rain', '비 갠 후', 2025, 'Acrylic, sand', '아크릴, 모래', 90, 120, 4, 6, NULL, NULL, 'art-rothko-pink', 'sale', 8200000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w09', 'kj', 'Two Figures', '두 사람', 2024, 'Oil on canvas', '캔버스에 유채', 80, 100, 4, 5.1, NULL, NULL, 'art-portrait', 'sale', 4100000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w10', 'po', 'Stripes (Dust)', '줄무늬 (먼지)', 2025, 'Pigment, gesso', '안료, 젯소', 55, 70, 3, 2, NULL, NULL, 'art-stripes', 'sale', 2200000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w11', 'po', 'Threshold', '문턱', 2024, 'Ink, gesso', '잉크, 젯소', 46, 64, 3, 1.8, NULL, NULL, 'art-mono-x', 'sale', 1650000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w12', 'lh', 'Half-Sun', '반쪽 해', 2025, 'Acrylic, sand', '아크릴, 모래', 100, 100, 4, 5.8, NULL, NULL, 'art-orb', 'sale', 5200000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w13', 'po', 'Two Blocks', '두 개의 블록', 2024, 'Oil on linen', '린넨에 유채', 80, 100, 3, 4.4, NULL, NULL, 'art-blocks', 'sale', 3700000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;
insert into artworks (id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, depth_cm, weight_kg, body_text, image_url, placeholder_class, mode, price_krw, start_bid_krw, current_bid_krw, estimate_low_krw, estimate_high_krw, bid_count, auction_ends_at) values ('w14', 'ya', 'Veil', '베일', 2025, 'Pigment on board', '보드에 안료', 70, 90, 3, 3.2, NULL, NULL, 'art-field-bone', 'sale', 3400000, NULL, NULL, NULL, NULL, 0, NULL) on conflict (id) do nothing;

-- ===== Seed: bids =====
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'M. Cho', 4200000);
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'S. Im', 4100000);
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'you', 4000000);
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'L. Yoon', 3800000);
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'anon_412', 3500000);
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'K. Hwang', 3200000);
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'M. Cho', 3000000);
insert into bids (artwork_id, bidder_name, amount_krw) values ('w01', 'S. Im', 2800000);

-- ===== Seed: room_presets =====
insert into room_presets (id, label, image_url, wall_x, wall_y, wall_w, wall_h, skew_y, rot_y) values ('r1', 'Loft, white wall', 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1400&q=80', 14, 8, 58, 76, -2, 0) on conflict (id) do nothing;
insert into room_presets (id, label, image_url, wall_x, wall_y, wall_w, wall_h, skew_y, rot_y) values ('r2', 'Bedroom, oblique', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=80', 28, 12, 54, 60, -6, -3) on conflict (id) do nothing;
insert into room_presets (id, label, image_url, wall_x, wall_y, wall_w, wall_h, skew_y, rot_y) values ('r3', 'Dining nook', 'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=1400&q=80', 22, 10, 60, 58, -1, 0) on conflict (id) do nothing;
insert into room_presets (id, label, image_url, wall_x, wall_y, wall_w, wall_h, skew_y, rot_y) values ('r4', 'Studio, side angle', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1400&q=80', 18, 6, 56, 70, -8, 0) on conflict (id) do nothing;
