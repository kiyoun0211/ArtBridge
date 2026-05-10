// Render the design's CSS-gradient "paintings" (fieldClass) as SVG → PNG via sharp,
// upload to Supabase Storage public bucket `artwork-mockups`, and update each
// artwork row's mockup_url. Idempotent.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const text = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
  const env = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return env
}

const env = loadEnv()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── ARTWORK → fieldClass map (from design data.js) ─────────────────────────
const FIELDS = {
  'Burnt Hour, no. 4': 'art-rothko-amber',
  'Blue Hours': 'art-rothko-blue',
  'Ochre Window': 'art-field-ochre',
  'Dust III': 'art-still',
  'Unspoken': 'art-text',
  'Field, Slowly': 'art-field-sage',
  'Pomegranate': 'art-still',
  'After the Rain': 'art-rothko-pink',
  'Two Figures': 'art-portrait',
  'Stripes (Dust)': 'art-stripes',
  'Threshold': 'art-mono-x',
  'Half-Sun': 'art-orb',
  'Two Blocks': 'art-blocks',
  'Veil': 'art-field-bone',
}

const TEXT_BODY = {
  'Unspoken': '한 번도\n말하지\n않은 채로',
}

// ── SVG generators per fieldClass (W×H in pixels) ──────────────────────────

function svgRothkoAmber(W, H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="g1" cx="50%" cy="32%" rx="40%" ry="35%">
        <stop offset="0%" stop-color="#C97328"/>
        <stop offset="60%" stop-color="#A95018"/>
        <stop offset="100%" stop-color="#87330C"/>
      </radialGradient>
      <radialGradient id="g2" cx="50%" cy="78%" rx="45%" ry="40%">
        <stop offset="0%" stop-color="#E6B361"/>
        <stop offset="60%" stop-color="#C68538"/>
        <stop offset="100%" stop-color="#8E5418"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#1B0F08"/>
    <rect y="0"           width="${W}" height="${H*0.6}" fill="url(#g1)"/>
    <rect y="${H*0.6}"    width="${W}" height="${H*0.5}" fill="url(#g2)"/>
  </svg>`
}

function svgRothkoBlue(W, H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="g1" cx="50%" cy="30%" rx="40%" ry="30%">
        <stop offset="0%" stop-color="#2F4A66"/>
        <stop offset="60%" stop-color="#1E3147"/>
        <stop offset="100%" stop-color="#0F1E33"/>
      </radialGradient>
      <radialGradient id="g2" cx="50%" cy="75%" rx="40%" ry="35%">
        <stop offset="0%" stop-color="#6B889E"/>
        <stop offset="60%" stop-color="#3E5A75"/>
        <stop offset="100%" stop-color="#1A2D44"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#07111E"/>
    <rect y="0"           width="${W}" height="${H*0.55}" fill="url(#g1)"/>
    <rect y="${H*0.65}"   width="${W}" height="${H*0.5}"  fill="url(#g2)"/>
  </svg>`
}

function svgRothkoPink(W, H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="g1" cx="50%" cy="30%" rx="40%" ry="30%">
        <stop offset="0%" stop-color="#E8B7AC"/>
        <stop offset="60%" stop-color="#C7836F"/>
        <stop offset="100%" stop-color="#9C503B"/>
      </radialGradient>
      <radialGradient id="g2" cx="50%" cy="75%" rx="40%" ry="30%">
        <stop offset="0%" stop-color="#B83F2A"/>
        <stop offset="60%" stop-color="#8C2918"/>
        <stop offset="100%" stop-color="#561409"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#2A0C06"/>
    <rect y="0"          width="${W}" height="${H*0.55}" fill="url(#g1)"/>
    <rect y="${H*0.65}"  width="${W}" height="${H*0.5}"  fill="url(#g2)"/>
  </svg>`
}

function svgFieldOchre(W, H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#D6A04F"/>
        <stop offset="55%" stop-color="#C68A35"/>
        <stop offset="100%" stop-color="#8B5A20"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="${W*0.22}" y="${H*0.18}" width="${W*0.56}" height="${H*0.64}" fill="#2A1B0B" opacity="0.55"/>
  </svg>`
}

function svgFieldSage(W, H) {
  const ix = W*0.18, iy = H*0.14, iw = W*0.64, ih = H*0.72
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="20%" y2="100%">
        <stop offset="0%" stop-color="#B7BBA0"/>
        <stop offset="50%" stop-color="#8E9479"/>
        <stop offset="100%" stop-color="#5C6249"/>
      </linearGradient>
      <linearGradient id="inner" x1="0%" y1="0%" x2="30%" y2="100%">
        <stop offset="0%" stop-color="#E1DCC3"/>
        <stop offset="100%" stop-color="#BBB59A"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#inner)" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
  </svg>`
}

function svgFieldBone(W, H) {
  const ix = W*0.30, iy = H*0.22, iw = W*0.40, ih = H*0.56
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#EAE3D0"/>
    <g transform="translate(${ix},${iy})">
      <defs>
        <radialGradient id="d1" cx="40%" cy="40%" r="38%">
          <stop offset="0%" stop-color="#2A2520"/>
          <stop offset="100%" stop-color="#2A2520" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="d2" cx="65%" cy="60%" r="35%">
          <stop offset="0%" stop-color="#B23A1F"/>
          <stop offset="100%" stop-color="#B23A1F" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${iw}" height="${ih}" fill="url(#d1)"/>
      <rect width="${iw}" height="${ih}" fill="url(#d2)"/>
      <rect x="${iw*0.50}" y="0" width="${iw*0.02}" height="${ih}" fill="#2A2520"/>
    </g>
  </svg>`
}

function svgStripes(W, H) {
  // repeating: 16 black, 6 orange, 16 black, 6 grey-tan
  const period = 44
  const stripes = []
  let y = 0
  while (y < H) {
    stripes.push(`<rect x="0" y="${y}"      width="${W}" height="16" fill="#1A1614"/>`)
    stripes.push(`<rect x="0" y="${y+16}"   width="${W}" height="6"  fill="#C16B2C"/>`)
    stripes.push(`<rect x="0" y="${y+22}"   width="${W}" height="16" fill="#1A1614"/>`)
    stripes.push(`<rect x="0" y="${y+38}"   width="${W}" height="6"  fill="#6B6151"/>`)
    y += period
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${stripes.join('')}</svg>`
}

function svgStill(W, H) {
  // Background top tan, bottom dark; pomegranate-ish red ellipse near bottom-center
  const ex = W*0.50, ey = H*0.78, exr = W*0.12, eyr = H*0.15
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#C5B79B"/>
        <stop offset="64%" stop-color="#C5B79B"/>
        <stop offset="64%" stop-color="#4A3F2E"/>
        <stop offset="100%" stop-color="#2C2418"/>
      </linearGradient>
      <radialGradient id="fruit" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#8A2418"/>
        <stop offset="80%" stop-color="#4A1208"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="${ex}" cy="${ey-eyr*0.1}" rx="${exr*1.6}" ry="${exr*0.18}" fill="rgba(0,0,0,0.20)"/>
    <ellipse cx="${ex}" cy="${ey}" rx="${exr}" ry="${eyr}" fill="url(#fruit)"/>
  </svg>`
}

function svgPortrait(W, H) {
  const px = W*0.28, py = H*0.16, pw = W*0.44, ph = H*0.84
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3B2E22"/>
        <stop offset="100%" stop-color="#1A140F"/>
      </linearGradient>
      <radialGradient id="head" cx="50%" cy="22%" r="50%">
        <stop offset="0%" stop-color="#C99974"/>
        <stop offset="70%" stop-color="#8A5C3A"/>
        <stop offset="100%" stop-color="#8A5C3A" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="body" cx="50%" cy="60%" r="60%">
        <stop offset="0%" stop-color="#5D2A1A"/>
        <stop offset="80%" stop-color="#2C1108"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="url(#head)"/>
    <rect x="${px}" y="${py+ph*0.45}" width="${pw}" height="${ph*0.55}" fill="url(#body)"/>
  </svg>`
}

function svgMonoX(W, H) {
  // black background, two thin diagonal lines
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0B0A09"/>
    <g stroke="#E8DDC3" stroke-width="2">
      <line x1="${W*0.12}" y1="${H*0.25}" x2="${W*0.88}" y2="${H*0.13}"/>
      <line x1="${W*0.12}" y1="${H*0.83}" x2="${W*0.88}" y2="${H*0.95}"/>
    </g>
  </svg>`
}

function svgOrb(W, H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="g" cx="50%" cy="56%" r="60%">
        <stop offset="0%" stop-color="#F1E2C4"/>
        <stop offset="30%" stop-color="#C68F46"/>
        <stop offset="60%" stop-color="#6B3A14"/>
        <stop offset="100%" stop-color="#1C0B05"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`
}

function svgBlocks(W, H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#F0E8D2"/>
    <rect x="${W*0.12}" y="${H*0.14}" width="${W*0.36}" height="${H*0.38}" fill="#B23A1F"/>
    <rect x="${W*0.56}" y="${H*0.40}" width="${W*0.30}" height="${H*0.44}" fill="#1C2E47"/>
  </svg>`
}

function svgText(W, H, body) {
  const lines = body.split('\n')
  const fontSize = Math.round(Math.min(W, H) * 0.085)
  const lineHeight = fontSize * 1.15
  const totalH = lines.length * lineHeight
  const startY = (H - totalH) / 2 + fontSize
  const tspans = lines
    .map((line, i) => `<tspan x="${W/2}" y="${startY + i*lineHeight}">${line}</tspan>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#F4EDD9"/>
    <text font-family="serif" font-style="italic" font-size="${fontSize}" fill="#1B1612" text-anchor="middle">${tspans}</text>
  </svg>`
}

function generateSvg(fieldClass, W, H, title) {
  switch (fieldClass) {
    case 'art-rothko-amber': return svgRothkoAmber(W, H)
    case 'art-rothko-blue':  return svgRothkoBlue(W, H)
    case 'art-rothko-pink':  return svgRothkoPink(W, H)
    case 'art-field-ochre':  return svgFieldOchre(W, H)
    case 'art-field-sage':   return svgFieldSage(W, H)
    case 'art-field-bone':   return svgFieldBone(W, H)
    case 'art-stripes':      return svgStripes(W, H)
    case 'art-still':        return svgStill(W, H)
    case 'art-portrait':     return svgPortrait(W, H)
    case 'art-mono-x':       return svgMonoX(W, H)
    case 'art-orb':          return svgOrb(W, H)
    case 'art-blocks':       return svgBlocks(W, H)
    case 'art-text':         return svgText(W, H, TEXT_BODY[title] ?? '')
    default:                 return svgFieldOchre(W, H)
  }
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const { data: artworks, error } = await admin
    .from('artworks')
    .select('id, title, width_cm, height_cm')
    .order('created_at', { ascending: true })

  if (error) throw error

  for (const a of artworks) {
    const fieldClass = FIELDS[a.title]
    if (!fieldClass) {
      console.log(`  skip ${a.title} (no fieldClass mapping)`)
      continue
    }
    // Render at ~1400px on the longest side, preserving aspect ratio
    const longest = 1400
    const longestCm = Math.max(a.width_cm, a.height_cm)
    const ratio = longest / longestCm
    const W = Math.round(a.width_cm * ratio)
    const H = Math.round(a.height_cm * ratio)

    const svg = generateSvg(fieldClass, W, H, a.title)
    const png = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer()

    const path = `seeded/${a.id}.png`
    const { error: upErr } = await admin.storage
      .from('artwork-mockups')
      .upload(path, png, { contentType: 'image/png', upsert: true })

    if (upErr) {
      console.error(`  ! upload failed for ${a.title}: ${upErr.message}`)
      continue
    }

    const { data: pub } = admin.storage.from('artwork-mockups').getPublicUrl(path)
    const publicUrl = pub.publicUrl

    await admin
      .from('artworks')
      .update({ mockup_url: publicUrl })
      .eq('id', a.id)

    console.log(`  + ${a.title} → ${fieldClass} (${W}×${H})`)
  }

  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
