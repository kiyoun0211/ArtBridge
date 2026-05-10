import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BuyerHeader } from '@/components/layout/BuyerHeader'
import { CountdownTimer } from '@/components/buyer/CountdownTimer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ──────────────────────────────────────────── */
/* Helpers                                       */
/* ──────────────────────────────────────────── */

function formatKRW(price: number | null | undefined): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

// Hardcoded EN name mapping for seeded artists
const ARTIST_EN_NAMES: Record<string, string> = {
  윤아라: 'Yoon Ara',
  김지호: 'Kim Jiho',
  이해온: 'Lee Hae-on',
  박온유: 'Park Onyu',
}

function artistEnName(displayName: string | null | undefined): string {
  if (!displayName) return ''
  return ARTIST_EN_NAMES[displayName] ?? displayName
}

// Artist portrait gradients (design uses CSS gradients as placeholders)
const ARTIST_GRADIENTS = [
  'linear-gradient(140deg,#C9B58A,#6F5A38)',
  'linear-gradient(140deg,#A8B7B2,#3F4D49)',
  'linear-gradient(140deg,#E1B7A1,#7B4C36)',
  'linear-gradient(140deg,#9E9CB4,#3D3956)',
]

/* ──────────────────────────────────────────── */
/* Types                                         */
/* ──────────────────────────────────────────── */

type ArtworkRow = {
  id: string
  title: string
  status: string
  sale_type: string
  price: number | null
  width_cm: number
  height_cm: number
  storage_path: string | null
  mockup_url: string | null
  created_at: string
  auction_ends_at?: string | null
  profiles: { id: string; email: string; display_name: string | null } | null
}

type ArtistProfile = {
  id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
}

/* ──────────────────────────────────────────── */
/* Page                                          */
/* ──────────────────────────────────────────── */

export default async function BuyerPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', userId)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'buyer') redirect('/artist')

  const admin = createAdminClient()

  // Fetch artworks (available + auctioning)
  const { data: artworksRaw } = await admin
    .from('artworks')
    .select(
      'id, title, status, sale_type, price, width_cm, height_cm, storage_path, mockup_url, created_at, auction_ends_at, profiles!artworks_artist_id_fkey(id, email, display_name)',
    )
    .in('status', ['available', 'auctioning'])
    .order('created_at', { ascending: false })
    .limit(60)

  const artworks = (artworksRaw ?? []) as unknown as ArtworkRow[]

  // Resolve thumbnail URLs
  const artworksWithUrls = await Promise.all(
    artworks.map(async (aw) => {
      if (aw.mockup_url) return { ...aw, thumbnailUrl: aw.mockup_url }
      let thumbnailUrl: string | null = null
      if (aw.storage_path) {
        const { data: urlData } = await admin.storage
          .from('artwork-originals')
          .createSignedUrl(aw.storage_path, 3600)
        thumbnailUrl = urlData?.signedUrl ?? null
      }
      return { ...aw, thumbnailUrl }
    }),
  )

  // Fetch artist profiles
  const { data: artistsRaw } = await admin
    .from('profiles')
    .select('id, email, display_name, role, created_at')
    .eq('role', 'artist')
    .order('created_at', { ascending: true })
    .limit(8)

  const artists = (artistsRaw ?? []) as ArtistProfile[]

  // Split artworks
  const featuredArtwork = artworksWithUrls[0] ?? null
  const wallWorks = artworksWithUrls.slice(0, 8) // Long Wall
  const liveWorks = artworksWithUrls.filter((aw) => aw.status === 'auctioning').slice(0, 4)
  const fixedWorks = artworksWithUrls.filter((aw) => aw.status === 'available')

  const totalAuctions = liveWorks.length
  const totalWorks = artworksWithUrls.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)' }}>
      <BuyerHeader email={profile.email} activePath="/buyer" />

      <main>
        {/* ── HERO ── */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            borderBottom: '1px solid var(--rule)',
            minHeight: '78vh',
            alignItems: 'stretch',
          }}
        >
          {/* Left */}
          <div
            style={{
              padding: '56px 48px 40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRight: '1px solid var(--rule-soft)',
            }}
          >
            <div>
              <div className="atelier-label">Now on view · 단 하나뿐인 원화의 마켓플레이스</div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(64px, 8vw, 132px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.03em',
                  margin: '36px 0 0',
                }}
              >
                Each work,
                <br />
                <em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>one of one.</em>
              </h1>
              <p
                style={{
                  maxWidth: '42ch',
                  marginTop: 24,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--ink-soft)',
                }}
              >
                ATELIER 1/1은 작가가 단 한 점만 제작한 작품을 위한 마켓플레이스입니다. 모든 거래는
                일반 판매 또는 라이브 옥션으로 진행되며, 구매 전 내 공간에 작품을 실제 크기로 미리
                걸어볼 수 있습니다.
              </p>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 24,
                marginTop: 32,
                fontSize: 12,
              }}
            >
              <div>
                <div className="atelier-label">Live now</div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    marginTop: 6,
                    color: 'var(--live)',
                  }}
                >
                  {totalAuctions} auctions
                </div>
              </div>
              <div>
                <div className="atelier-label">Available</div>
                <div
                  style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginTop: 6 }}
                >
                  {totalWorks} works
                </div>
              </div>
              <div>
                <div className="atelier-label">Artists</div>
                <div
                  style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginTop: 6 }}
                >
                  {artists.length}
                </div>
              </div>
            </div>
          </div>

          {/* Right: featured artwork */}
          <div
            style={{
              position: 'relative',
              background: 'var(--bone-soft)',
              display: 'grid',
              gridTemplateRows: '1fr auto',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
                padding: 64,
              }}
            >
              {featuredArtwork ? (
                <Link
                  href={`/artwork/${featuredArtwork.id}`}
                  style={{
                    display: 'block',
                    width: 'min(420px, 80%)',
                    aspectRatio: `${featuredArtwork.width_cm}/${featuredArtwork.height_cm}`,
                    position: 'relative',
                    boxShadow:
                      'inset 0 0 0 1px rgba(0,0,0,0.04), 0 22px 36px -28px rgba(0,0,0,0.45), 0 8px 18px -16px rgba(0,0,0,0.25)',
                    background: 'var(--wall)',
                  }}
                >
                  {featuredArtwork.thumbnailUrl ? (
                    <Image
                      src={featuredArtwork.thumbnailUrl}
                      alt={`작품 — ${featuredArtwork.title}`}
                      fill
                      className="object-contain"
                      sizes="420px"
                      priority
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background:
                          'linear-gradient(135deg, var(--bone-deep) 0%, var(--rule) 100%)',
                      }}
                    />
                  )}
                </Link>
              ) : (
                <div
                  style={{
                    width: 'min(420px, 80%)',
                    aspectRatio: '4/5',
                    background: 'var(--bone-deep)',
                  }}
                />
              )}
            </div>

            {/* Featured caption */}
            {featuredArtwork && (
              <div
                style={{
                  padding: '24px 32px',
                  borderTop: '1px solid var(--rule-soft)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  alignItems: 'end',
                }}
              >
                <div>
                  <div className="atelier-label">This week's selection</div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 28,
                      marginTop: 6,
                      lineHeight: 1.05,
                    }}
                  >
                    {featuredArtwork.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-mid)', marginTop: 6 }}>
                    {featuredArtwork.profiles?.display_name ?? featuredArtwork.profiles?.email} ·{' '}
                    {featuredArtwork.width_cm} × {featuredArtwork.height_cm} cm
                  </div>
                </div>
                <Link href={`/artwork/${featuredArtwork.id}`} className="atelier-btn atelier-btn--sm">
                  View work →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── LONG WALL (horizontal scroll) ── */}
        <section
          style={{
            position: 'relative',
            padding: '80px 0 40px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--bone)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: 24,
              alignItems: 'end',
              padding: '0 32px 28px',
            }}
          >
            <div>
              <div className="atelier-label">Exhibition Ⅰ</div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 56,
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                The Long Wall.
              </h2>
            </div>
            <div className="atelier-label" style={{ alignSelf: 'end' }}>
              <span style={{ color: 'var(--ink)' }}>{wallWorks.length}</span> works · scroll →
            </div>
            <div style={{ alignSelf: 'end' }}>
              <Link href="/buyer" className="atelier-btn atelier-btn--ghost atelier-btn--sm">
                All works →
              </Link>
            </div>
          </div>

          {/* Horizontal scroller */}
          <div
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              padding: '24px 32px 24px',
              scrollbarWidth: 'thin',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 64,
                alignItems: 'end',
                minHeight: 540,
              }}
            >
              {wallWorks.map((aw, i) => {
                const heights = [380, 460, 420, 360, 440, 400, 480, 420]
                const tileH = heights[i % 8]
                const aspect = aw.width_cm / aw.height_cm
                const tileW = Math.round(tileH * aspect)

                return (
                  <div
                    key={aw.id}
                    style={{ scrollSnapAlign: 'start', flex: '0 0 auto', cursor: 'pointer' }}
                  >
                    <Link href={`/artwork/${aw.id}`} style={{ display: 'block' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'end',
                          justifyContent: 'center',
                          height: 460,
                        }}
                      >
                        {/* Art frame */}
                        <div
                          style={{
                            width: tileW,
                            height: tileH,
                            background: 'var(--wall)',
                            padding: 8,
                            boxShadow:
                              '0 2px 4px rgba(0,0,0,0.06), 0 18px 30px -22px rgba(0,0,0,0.35)',
                            position: 'relative',
                          }}
                        >
                          {aw.thumbnailUrl ? (
                            <Image
                              src={aw.thumbnailUrl}
                              alt={`작품 — ${aw.title}`}
                              fill
                              className="object-contain"
                              sizes={`${tileW}px`}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background:
                                  'linear-gradient(135deg, var(--bone-deep) 0%, var(--rule) 100%)',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Caption */}
                    <div style={{ marginTop: 18, width: 280, display: 'grid', gap: 4 }}>
                      <div className="atelier-label">
                        {String(i + 1).padStart(2, '0')} / {String(wallWorks.length).padStart(2, '0')}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17 }}>
                        {aw.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-mid)' }}>
                        {aw.profiles?.display_name ?? aw.profiles?.email} · {aw.width_cm} ×{' '}
                        {aw.height_cm} cm
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        {aw.status === 'auctioning' ? (
                          <span style={{ color: 'var(--live)' }}>
                            현재가 {formatKRW(aw.price)} · LIVE
                          </span>
                        ) : (
                          formatKRW(aw.price)
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* See all item */}
              <div style={{ scrollSnapAlign: 'start', flex: '0 0 auto', alignSelf: 'center' }}>
                <Link
                  href="/buyer"
                  className="atelier-btn atelier-btn--ghost"
                  style={{ display: 'inline-flex' }}
                >
                  See all {totalWorks} →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── LIVE AUCTIONS ── */}
        {liveWorks.length > 0 && (
          <section
            style={{
              padding: '80px 32px 60px',
              display: 'grid',
              gap: 28,
              borderBottom: '1px solid var(--rule)',
              background: 'var(--paper)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'end',
                gap: 24,
              }}
            >
              <div>
                <div className="atelier-label" style={{ color: 'var(--live)' }}>
                  ● Live · 진행 중인 옥션
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 48,
                    margin: '8px 0 0',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  Bid before time.
                </h2>
              </div>
              <Link href="/buyer" className="atelier-btn atelier-btn--ghost atelier-btn--sm">
                View all →
              </Link>
            </div>

            {/* Auction grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0,
                borderTop: '1px solid var(--rule)',
              }}
            >
              {liveWorks.map((aw, i) => (
                <Link
                  key={aw.id}
                  href={`/artwork/${aw.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr auto',
                    gap: 24,
                    padding: i % 2 === 0 ? '24px 24px 24px 0' : '24px 0 24px 24px',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--rule-soft)',
                    borderRight: i % 2 === 0 ? '1px solid var(--rule-soft)' : 'none',
                    cursor: 'pointer',
                    transition: 'background .15s',
                    textDecoration: 'none',
                  }}
                >
                  {/* Thumb */}
                  <div
                    style={{
                      width: 110,
                      height: 130,
                      position: 'relative',
                      background: 'var(--wall)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                  >
                    {aw.thumbnailUrl ? (
                      <Image
                        src={aw.thumbnailUrl}
                        alt={`작품 — ${aw.title}`}
                        fill
                        className="object-contain"
                        sizes="110px"
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background:
                            'linear-gradient(135deg, var(--bone-deep) 0%, var(--rule) 100%)',
                        }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <span className="atelier-pill atelier-pill--live">Live</span>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontSize: 22,
                        lineHeight: 1.1,
                        marginTop: 10,
                      }}
                    >
                      {aw.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mid)', marginTop: 6 }}>
                      {aw.profiles?.display_name ?? aw.profiles?.email} · {aw.width_cm} ×{' '}
                      {aw.height_cm} cm
                    </div>
                  </div>

                  {/* Bid / timer */}
                  <div style={{ display: 'grid', gap: 4, textAlign: 'right', alignContent: 'end' }}>
                    <div className="atelier-label">현재가</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>
                      {formatKRW(aw.price)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--live)' }}>
                      <CountdownTimer endsAt={aw.auction_ends_at} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── ARTISTS ── */}
        <section
          id="artists"
          style={{ padding: '80px 32px', borderBottom: '1px solid var(--rule)' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'end',
              gap: 24,
              marginBottom: 32,
            }}
          >
            <div>
              <div className="atelier-label">Represented · 작가</div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 56,
                  margin: '8px 0 0',
                  letterSpacing: '-0.02em',
                }}
              >
                {artists.length} artists.
              </h2>
            </div>
            <Link href="/buyer#artists" className="atelier-btn atelier-btn--ghost atelier-btn--sm">
              Browse all →
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(artists.length, 4)}, 1fr)`,
              borderTop: '1px solid var(--rule)',
            }}
          >
            {artists.slice(0, 4).map((artist, i) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                style={{
                  padding: '40px 24px',
                  borderRight: i < 3 ? '1px solid var(--rule-soft)' : '0',
                  display: 'grid',
                  gap: 18,
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                {/* Portrait placeholder */}
                <div
                  style={{
                    aspectRatio: '1/1.1',
                    width: '100%',
                    background: ARTIST_GRADIENTS[i % ARTIST_GRADIENTS.length],
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: '22% 18% 0 18%',
                      background:
                        'radial-gradient(ellipse 60% 38% at 50% 35%, rgba(255,255,255,.55) 0%, transparent 75%)',
                    }}
                  />
                  <div
                    className="atelier-label"
                    style={{
                      position: 'absolute',
                      left: 12,
                      bottom: 12,
                      color: 'rgba(255,255,255,.85)',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 28,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {artist.display_name ?? artist.email}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                      color: 'var(--ink-mid)',
                      marginTop: 4,
                    }}
                  >
                    {artistEnName(artist.display_name)}
                  </div>
                  <div className="atelier-label" style={{ marginTop: 16 }}>
                    ATELIER 1/1 작가
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── EDITORIAL: AI Room preview ── */}
        <section
          style={{
            padding: '120px 32px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div>
            <div className="atelier-label">Try before you buy · AI Room</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(56px, 7vw, 108px)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                margin: '16px 0 24px',
              }}
            >
              See it on <em style={{ fontStyle: 'italic' }}>your</em> wall.
              <br />
              실제 크기로.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-soft)', maxWidth: '44ch' }}>
              내 공간 사진을 올리면 AI가 벽의 각도와 원근을 인식해 작품을 실제 크기로 합성합니다.
              가구 옆에 걸린 모습으로 비교해보세요.
            </p>
            {featuredArtwork && (
              <Link
                href={`/artwork/${featuredArtwork.id}/preview`}
                className="atelier-btn atelier-btn--xl"
                style={{ marginTop: 32, display: 'inline-flex' }}
              >
                Room Preview 열기 →
              </Link>
            )}
          </div>

          {/* Mock room image */}
          <div
            style={{
              position: 'relative',
              aspectRatio: '4/3',
              overflow: 'hidden',
              background: 'var(--bone-deep)',
            }}
          >
            <Image
              src="https://picsum.photos/seed/atelier-room-living/1600/1200"
              alt="Room preview example"
              fill
              className="object-cover"
              sizes="50vw"
              style={{ filter: 'saturate(0.9) contrast(1.05)' }}
            />
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 16,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--paper)',
                background: 'rgba(0,0,0,0.55)',
                padding: '8px 12px',
                letterSpacing: '0.16em',
              }}
            >
              ROOM PREVIEW · ACTUAL SIZE
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '48px 32px 24px',
          borderTop: '1px solid var(--rule-soft)',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 32,
          fontSize: 12,
          color: 'var(--ink-mid)',
          marginTop: 80,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            ATELIER 1/1
          </div>
          <p style={{ maxWidth: '36ch', lineHeight: 1.65 }}>
            Edition of One. 단 하나뿐인 작품만을 위한 마켓플레이스.
          </p>
        </div>
        <div>
          <h4
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              margin: '0 0 14px',
              fontWeight: 500,
            }}
          >
            Explore
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><Link href="/buyer">Discover</Link></li>
            <li><Link href="/buyer#artists">Artists</Link></li>
          </ul>
        </div>
        <div>
          <h4
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              margin: '0 0 14px',
              fontWeight: 500,
            }}
          >
            Account
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><Link href="/login">로그인</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  )
}
