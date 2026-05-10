// Seed fictional artists + artworks with license-free Picsum images.
// Idempotent — safe to re-run; users matched by email, artworks by title+artist.
//
// Usage: node scripts/seed-demo.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Lightweight .env.local loader (no extra dependency).
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local')
  const text = readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    env[k] = v
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

const ARTISTS = [
  {
    email: 'park.jihye@artbridge-demo.com',
    password: 'DemoArtist!2026',
    display_name: '박지혜',
    bio_seed: 'jihye',
  },
  {
    email: 'kim.minsoo@artbridge-demo.com',
    password: 'DemoArtist!2026',
    display_name: '김민수',
    bio_seed: 'minsoo',
  },
  {
    email: 'lee.haein@artbridge-demo.com',
    password: 'DemoArtist!2026',
    display_name: '이해인',
    bio_seed: 'haein',
  },
  {
    email: 'jung.taeyang@artbridge-demo.com',
    password: 'DemoArtist!2026',
    display_name: '정태양',
    bio_seed: 'taeyang',
  },
]

// Picsum seeds chosen for variety; img URLs are stable for these seeds.
const ARTWORKS = [
  // 박지혜 — minimal abstract, neutral palette
  {
    artist_email: 'park.jihye@artbridge-demo.com',
    title: '여백의 호흡',
    description:
      '비어있는 면이 만들어내는 잔잔한 호흡을 담았습니다. 캔버스에 아크릴, 한지 콜라주.',
    width_cm: 60,
    height_cm: 90,
    sale_type: 'fixed',
    price: 480000,
    seed: 'park-yeobaek',
  },
  {
    artist_email: 'park.jihye@artbridge-demo.com',
    title: '가벼운 오후',
    description: '오후의 빛이 천천히 옮겨가는 순간. 린넨에 유화.',
    width_cm: 45,
    height_cm: 60,
    sale_type: 'fixed',
    price: 320000,
    seed: 'park-afternoon',
  },
  {
    artist_email: 'park.jihye@artbridge-demo.com',
    title: '겹쳐진 침묵',
    description: '여러 겹의 색과 결을 쌓아 만든 침묵의 표면.',
    width_cm: 80,
    height_cm: 80,
    sale_type: 'auction',
    price: 600000,
    seed: 'park-silence',
  },
  // 김민수 — bold color, urban
  {
    artist_email: 'kim.minsoo@artbridge-demo.com',
    title: '도시의 밤 No.7',
    description: '서울 한복판의 야경에서 받은 인상을 그대로 옮긴 작품.',
    width_cm: 100,
    height_cm: 70,
    sale_type: 'fixed',
    price: 720000,
    seed: 'kim-night-7',
  },
  {
    artist_email: 'kim.minsoo@artbridge-demo.com',
    title: '교차로',
    description: '익명의 사람들이 스쳐지나가는 교차로의 한 장면. 캔버스에 혼합 매체.',
    width_cm: 90,
    height_cm: 60,
    sale_type: 'auction',
    price: 850000,
    seed: 'kim-intersection',
  },
  {
    artist_email: 'kim.minsoo@artbridge-demo.com',
    title: '붉은 신호',
    description: '도시의 신호가 만드는 정지의 순간. 강렬한 적색이 중심.',
    width_cm: 50,
    height_cm: 70,
    sale_type: 'fixed',
    price: 410000,
    seed: 'kim-redlight',
  },
  // 이해인 — natural / botanical
  {
    artist_email: 'lee.haein@artbridge-demo.com',
    title: '5월의 정원',
    description: '늦봄의 정원에 핀 흰 꽃들. 종이에 수채.',
    width_cm: 40,
    height_cm: 50,
    sale_type: 'fixed',
    price: 220000,
    seed: 'lee-may-garden',
  },
  {
    artist_email: 'lee.haein@artbridge-demo.com',
    title: '잎의 결',
    description: '한 장의 잎에 새겨진 시간의 결을 클로즈업.',
    width_cm: 30,
    height_cm: 40,
    sale_type: 'fixed',
    price: 150000,
    seed: 'lee-leaf-grain',
  },
  {
    artist_email: 'lee.haein@artbridge-demo.com',
    title: '비 온 뒤의 뜰',
    description: '비가 멈춘 직후 정원에 남은 물기와 빛.',
    width_cm: 70,
    height_cm: 50,
    sale_type: 'auction',
    price: 380000,
    seed: 'lee-after-rain',
  },
  // 정태양 — large-scale, warm tones
  {
    artist_email: 'jung.taeyang@artbridge-demo.com',
    title: '해 질 무렵',
    description: '바다 위 해 질 무렵의 따뜻한 색면을 그대로 담은 대형작.',
    width_cm: 120,
    height_cm: 90,
    sale_type: 'fixed',
    price: 1450000,
    seed: 'jung-sunset',
  },
  {
    artist_email: 'jung.taeyang@artbridge-demo.com',
    title: '여름의 끝',
    description: '여름의 잔영이 남아있는 늦오후. 캔버스에 유화.',
    width_cm: 80,
    height_cm: 100,
    sale_type: 'auction',
    price: 980000,
    seed: 'jung-end-of-summer',
  },
  {
    artist_email: 'jung.taeyang@artbridge-demo.com',
    title: '바람의 형태',
    description: '눈에 보이지 않는 바람을 색의 흐름으로 시각화.',
    width_cm: 60,
    height_cm: 80,
    sale_type: 'fixed',
    price: 540000,
    seed: 'jung-wind',
  },
]

function picsumUrl(seed, width, height) {
  // Lorem Picsum: deterministic, license-free, no API key required.
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`
}

function imageDimensions(width_cm, height_cm) {
  // Map cm to a reasonable hosted-image pixel size, preserving aspect ratio.
  const longestPx = 1200
  const longestCm = Math.max(width_cm, height_cm)
  const ratio = longestPx / longestCm
  return {
    width: Math.round(width_cm * ratio),
    height: Math.round(height_cm * ratio),
  }
}

async function ensureArtist(artist) {
  // Find existing user by email
  const { data: list, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) throw listErr
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
    console.log(`  + created user ${artist.email} (${user.id})`)
  } else {
    console.log(`  = user exists ${artist.email} (${user.id})`)
  }

  // Update profile to ensure role=artist + display_name
  const { error: updErr } = await admin
    .from('profiles')
    .update({ role: 'artist', display_name: artist.display_name })
    .eq('id', user.id)
  if (updErr) throw updErr

  return user
}

async function ensureArtwork(artwork, artistId) {
  // Idempotent: check if (artist_id, title) pair exists
  const { data: existing } = await admin
    .from('artworks')
    .select('id, mockup_url')
    .eq('artist_id', artistId)
    .eq('title', artwork.title)
    .maybeSingle()

  const dims = imageDimensions(artwork.width_cm, artwork.height_cm)
  const url = picsumUrl(artwork.seed, dims.width, dims.height)

  if (existing) {
    // Make sure mockup_url is up-to-date (e.g., if seed changed)
    if (existing.mockup_url !== url) {
      await admin.from('artworks').update({ mockup_url: url }).eq('id', existing.id)
      console.log(`    ~ updated artwork mockup_url: ${artwork.title}`)
    } else {
      console.log(`    = artwork exists: ${artwork.title}`)
    }
    return existing.id
  }

  const { data, error } = await admin
    .from('artworks')
    .insert({
      artist_id: artistId,
      title: artwork.title,
      description: artwork.description,
      width_cm: artwork.width_cm,
      height_cm: artwork.height_cm,
      sale_type: artwork.sale_type,
      price: artwork.price,
      status: 'available',
      storage_path: null,
      mockup_url: url,
    })
    .select('id')
    .single()
  if (error) throw error
  console.log(`    + inserted artwork: ${artwork.title} (${data.id})`)
  return data.id
}

async function main() {
  console.log('Seeding artists...')
  const artistIdByEmail = {}
  for (const artist of ARTISTS) {
    const user = await ensureArtist(artist)
    artistIdByEmail[artist.email] = user.id
  }

  console.log('\nSeeding artworks...')
  for (const artwork of ARTWORKS) {
    const artistId = artistIdByEmail[artwork.artist_email]
    if (!artistId) {
      console.warn(`  skip — no artist for ${artwork.artist_email}`)
      continue
    }
    await ensureArtwork(artwork, artistId)
  }

  // Final count
  const { count } = await admin
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'available')
  console.log(`\nDone. Total available artworks: ${count}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
