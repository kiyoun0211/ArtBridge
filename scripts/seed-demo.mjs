// Seed ATELIER 1/1 design's mock data into Supabase: 4 artists, 14 artworks,
// 3 auctions (artworks with mode='auction'). Idempotent — wipes prior demo
// users (@atelier.demo and legacy @artbridge-demo.com) and re-inserts fresh.
//
// Usage: node scripts/seed-demo.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local')
  const text = readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// ── ARTISTS ─────────────────────────────────────────────────────────────────
const ARTISTS = [
  {
    key: 'ya',
    email: 'yoon.ara@atelier.demo',
    password: 'AtelierDemo!2026',
    display_name: '윤아라',
    en_name: 'Yoon Ara',
    location: 'Seoul, KR',
    born: 1989,
    activeSince: 2014,
    bio: '윤아라는 도시의 표면과 빛이 만들어내는 미세한 진동을 색면 회화로 옮긴다. 두꺼운 안료의 반복된 레이어 사이로 발견되는 ‘우연한 시간’이 그녀의 화면을 지배한다.',
    medium: 'Oil, pigment on linen',
  },
  {
    key: 'kj',
    email: 'kim.jiho@atelier.demo',
    password: 'AtelierDemo!2026',
    display_name: '김지호',
    en_name: 'Kim Jiho',
    location: 'Busan, KR',
    born: 1992,
    activeSince: 2017,
    bio: '정물과 인물의 경계를 흐리며, 사물의 ‘초상화’를 그린다.',
    medium: 'Oil on canvas',
  },
  {
    key: 'lh',
    email: 'lee.haeon@atelier.demo',
    password: 'AtelierDemo!2026',
    display_name: '이해온',
    en_name: 'Lee Hae-on',
    location: 'Jeju, KR',
    born: 1985,
    activeSince: 2010,
    bio: '제주의 풍경을 추상으로 환원한다.',
    medium: 'Acrylic, sand on board',
  },
  {
    key: 'po',
    email: 'park.onyu@atelier.demo',
    password: 'AtelierDemo!2026',
    display_name: '박온유',
    en_name: 'Park Onyu',
    location: 'Berlin / Seoul',
    born: 1991,
    activeSince: 2016,
    bio: '텍스트와 이미지를 충돌시키는 미니멀 컴포지션.',
    medium: 'Mixed media on paper',
  },
]

// ── ARTWORKS (verbatim from design data.js) ─────────────────────────────────
// price = sale price OR auction start bid (current_bid stored on auctions row)
const ARTWORKS = [
  { id:'w01', title:'Burnt Hour, no. 4',  artistKey:'ya', year:2025, medium:'린넨에 유채',
    w:89, h:116, mode:'auction', currentBid:4_200_000, startBid:2_800_000, endsInMs: 6*3600*1000 + 12*60*1000 + 41*1000,
    seed:'burnt-hour-amber',
    description:'두꺼운 안료로 쌓아 올린 색면. 빛이 가장 길게 머무르던 한 시간의 잔영.' },
  { id:'w02', title:'Blue Hours',         artistKey:'ya', year:2024, medium:'린넨에 유채',
    w:73, h:92, mode:'sale', price:5_400_000, seed:'blue-hours-cobalt',
    description:'푸른 시간의 표면. 한 면을 천천히 덮어가는 안료의 호흡.' },
  { id:'w03', title:'Ochre Window',       artistKey:'ya', year:2025, medium:'보드에 안료',
    w:60, h:80, mode:'auction', currentBid:1_900_000, startBid:1_200_000, endsInMs: 45*60*1000,
    seed:'ochre-window-warm',
    description:'창을 통해 들어오는 늦은 오후의 황토색.' },
  { id:'w04', title:'Dust III',           artistKey:'kj', year:2024, medium:'캔버스에 유채',
    w:50, h:65, mode:'sale', price:2_800_000, seed:'dust-iii-still',
    description:'정물과 인물 사이를 떠도는 먼지의 초상.' },
  { id:'w05', title:'Unspoken',           artistKey:'po', year:2025, medium:'혼합 매체',
    w:42, h:60, mode:'sale', price:1_400_000, seed:'unspoken-mono',
    description:'한 번도 / 말하지 / 않은 채로.' },
  { id:'w06', title:'Field, Slowly',      artistKey:'lh', year:2024, medium:'아크릴, 모래',
    w:120, h:80, mode:'sale', price:6_900_000, seed:'field-slowly-sage',
    description:'제주의 들판이 천천히 사라져가는 시간의 결.' },
  { id:'w07', title:'Pomegranate',        artistKey:'kj', year:2024, medium:'캔버스에 유채',
    w:40, h:50, mode:'auction', currentBid:880_000, startBid:600_000, endsInMs: 22*3600*1000,
    seed:'pomegranate-still',
    description:'한 알의 석류, 그 안의 작은 우주.' },
  { id:'w08', title:'After the Rain',     artistKey:'lh', year:2025, medium:'아크릴, 모래',
    w:90, h:120, mode:'sale', price:8_200_000, seed:'after-rain-pink',
    description:'비가 멎은 직후 풍경의 잔상. 분홍빛이 천천히 가라앉는다.' },
  { id:'w09', title:'Two Figures',        artistKey:'kj', year:2024, medium:'캔버스에 유채',
    w:80, h:100, mode:'sale', price:4_100_000, seed:'two-figures-portrait',
    description:'두 사람 사이의 여백. 그것이 곧 형태가 된다.' },
  { id:'w10', title:'Stripes (Dust)',     artistKey:'po', year:2025, medium:'안료, 젯소',
    w:55, h:70, mode:'sale', price:2_200_000, seed:'stripes-dust',
    description:'먼지처럼 가라앉는 줄무늬. 한 호흡의 결.' },
  { id:'w11', title:'Threshold',          artistKey:'po', year:2024, medium:'잉크, 젯소',
    w:46, h:64, mode:'sale', price:1_650_000, seed:'threshold-mono',
    description:'안과 밖이 서로를 통과하는 한 점.' },
  { id:'w12', title:'Half-Sun',           artistKey:'lh', year:2025, medium:'아크릴, 모래',
    w:100, h:100, mode:'sale', price:5_200_000, seed:'half-sun-orb',
    description:'반쪽만 떠오른 해. 그 부재가 풍경을 완성한다.' },
  { id:'w13', title:'Two Blocks',         artistKey:'po', year:2024, medium:'린넨에 유채',
    w:80, h:100, mode:'sale', price:3_700_000, seed:'two-blocks',
    description:'두 개의 색 블록. 그 사이에 머무는 빛.' },
  { id:'w14', title:'Veil',               artistKey:'ya', year:2025, medium:'보드에 안료',
    w:70, h:90, mode:'sale', price:3_400_000, seed:'veil-bone',
    description:'얇은 막처럼 덮인 본화이트의 표면.' },
]

function picsumUrl(seed, w, h) {
  const longestPx = 1400
  const longestCm = Math.max(w, h)
  const ratio = longestPx / longestCm
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${Math.round(w*ratio)}/${Math.round(h*ratio)}`
}

// ── ENSURE ARTIST USER + PROFILE ────────────────────────────────────────────
async function ensureArtist(artist) {
  const { data: list } = await admin.auth.admin.listUsers()
  let user = list.users.find((u) => u.email === artist.email)

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: artist.email,
      password: artist.password,
      email_confirm: true,
      user_metadata: { role: 'artist' },
    })
    if (error) throw error
    user = data.user
    console.log(`  + created ${artist.email} (${user.id})`)
  } else {
    console.log(`  = exists ${artist.email} (${user.id})`)
  }

  // Update profile (display name only — schema has no en_name/bio columns yet)
  await admin
    .from('profiles')
    .update({ role: 'artist', display_name: artist.display_name })
    .eq('id', user.id)

  return user
}

// ── DELETE OLD LEGACY DEMO USERS (@artbridge-demo.com) ──────────────────────
async function purgeLegacy() {
  const { data: list } = await admin.auth.admin.listUsers()
  const legacy = list.users.filter((u) =>
    u.email && u.email.endsWith('@artbridge-demo.com'),
  )
  for (const u of legacy) {
    console.log(`  - removing legacy user ${u.email}`)
    await admin.auth.admin.deleteUser(u.id)
  }
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Removing legacy demo users (@artbridge-demo.com)...')
  await purgeLegacy()

  console.log('\nSeeding ATELIER 1/1 artists...')
  const artistIdByKey = {}
  for (const artist of ARTISTS) {
    const user = await ensureArtist(artist)
    artistIdByKey[artist.key] = user.id
  }

  console.log('\nSeeding artworks + auctions...')
  for (const a of ARTWORKS) {
    const artistId = artistIdByKey[a.artistKey]
    if (!artistId) {
      console.warn(`  skip ${a.title} — artist key ${a.artistKey} not found`)
      continue
    }

    const url = picsumUrl(a.seed, a.w, a.h)
    const status = a.mode === 'auction' ? 'auctioning' : 'available'
    const price = a.mode === 'auction' ? a.startBid : a.price
    const sale_type = a.mode === 'auction' ? 'auction' : 'fixed'

    // Find existing artwork by (artist, title) — idempotent
    const { data: existing } = await admin
      .from('artworks')
      .select('id')
      .eq('artist_id', artistId)
      .eq('title', a.title)
      .maybeSingle()

    let artworkId
    if (existing) {
      artworkId = existing.id
      await admin
        .from('artworks')
        .update({
          description: a.description,
          width_cm: a.w,
          height_cm: a.h,
          sale_type,
          price,
          status,
          mockup_url: url,
        })
        .eq('id', artworkId)
      console.log(`    ~ updated ${a.title}`)
    } else {
      const { data, error } = await admin
        .from('artworks')
        .insert({
          artist_id: artistId,
          title: a.title,
          description: a.description,
          width_cm: a.w,
          height_cm: a.h,
          sale_type,
          price,
          status,
          storage_path: null,
          mockup_url: url,
        })
        .select('id')
        .single()
      if (error) throw error
      artworkId = data.id
      console.log(`    + inserted ${a.title} (${artworkId})`)
    }

    // For auction mode: ensure auctions row
    if (a.mode === 'auction') {
      const startAt = new Date().toISOString()
      const endAt = new Date(Date.now() + a.endsInMs).toISOString()

      const { data: existingAuction } = await admin
        .from('auctions')
        .select('id')
        .eq('artwork_id', artworkId)
        .maybeSingle()

      if (existingAuction) {
        await admin
          .from('auctions')
          .update({
            start_bid: a.startBid,
            current_bid: a.currentBid,
            status: 'active',
            start_at: startAt,
            end_at: endAt,
          })
          .eq('id', existingAuction.id)
        console.log(`      ~ auction updated`)
      } else {
        const { error: aerr } = await admin.from('auctions').insert({
          artwork_id: artworkId,
          start_bid: a.startBid,
          current_bid: a.currentBid,
          status: 'active',
          start_at: startAt,
          end_at: endAt,
        })
        if (aerr) throw aerr
        console.log(`      + auction created (ends in ${Math.round(a.endsInMs/60000)}min)`)
      }
    }
  }

  // Final counts
  const { count: artworkCount } = await admin
    .from('artworks').select('id', { count: 'exact', head: true })
  const { count: auctionCount } = await admin
    .from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active')
  console.log(`\nDone. Artworks: ${artworkCount} · Active auctions: ${auctionCount}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
