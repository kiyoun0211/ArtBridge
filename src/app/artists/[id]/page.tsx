import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { BuyerHeader } from '@/components/layout/BuyerHeader'

// EN name mapping for seeded artists
const ARTIST_EN_NAMES: Record<string, string> = {
  윤아라: 'Yoon Ara',
  김지호: 'Kim Jiho',
  이해온: 'Lee Hae-on',
  박온유: 'Park Onyu',
}

function artistEnName(displayName: string | null | undefined): string {
  if (!displayName) return ''
  return ARTIST_EN_NAMES[displayName] ?? ''
}

function formatKRW(price: number | null | undefined): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

type Props = {
  params: Promise<{ id: string }>
}

// Placeholder CV data per artist (same for all since we don't have real CV data)
const MOCK_CV = [
  ['2025', "'Long Hours'", 'Gallery Inkblot, Seoul', 'Solo'],
  ['2024', "'New Surfaces'", 'Doosan Art Center, Seoul', 'Group'],
  ['2024', "'Pigment, Time'", 'Kukje Project Space', 'Solo'],
  ['2023', "'The Slow Show'", 'Hapjeong Studio', 'Group'],
  ['2022', "'Rooms'", 'Atelier 1/1 Online', 'Solo'],
  ['2021', "'Color, Year One'", 'Gallery Inkblot, Seoul', 'Solo'],
]

const MOCK_SALES = [
  ["'Burnt Hour, no. 2'", '2024', '₩6,200,000', '+24%'],
  ["'Long Window'", '2024', '₩4,800,000', '+12%'],
  ["'Pigment Study 04'", '2023', '₩3,100,000', '+9%'],
  ["'Blue Hours, study'", '2023', '₩2,400,000', '—'],
]

export default async function ArtistProfilePage({ params }: Props) {
  const { id } = await params

  const admin = createAdminClient()

  // Fetch artist profile
  const { data: artist } = await admin
    .from('profiles')
    .select('id, email, display_name, role, created_at')
    .eq('id', id)
    .single()

  if (!artist || artist.role !== 'artist') notFound()

  // Fetch artist's artworks
  const { data: artworksRaw } = await admin
    .from('artworks')
    .select('id, title, status, sale_type, price, width_cm, height_cm, storage_path, mockup_url, created_at')
    .eq('artist_id', id)
    .in('status', ['available', 'auctioning', 'sold'])
    .order('created_at', { ascending: false })

  const artworks = artworksRaw ?? []

  // Resolve artwork URLs
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

  const displayName = artist.display_name ?? artist.email
  const enName = artistEnName(artist.display_name)
  const worksCount = artworks.length
  const soldCount = artworks.filter((aw) => aw.status === 'sold').length

  // Artist portrait gradient (cycle through by id hash)
  const idHash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const gradients = [
    'linear-gradient(140deg,#C9B58A,#6F5A38)',
    'linear-gradient(140deg,#A8B7B2,#3F4D49)',
    'linear-gradient(140deg,#E1B7A1,#7B4C36)',
    'linear-gradient(140deg,#9E9CB4,#3D3956)',
  ]
  const portraitGradient = gradients[idHash % gradients.length]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)' }}>
      <BuyerHeader />

      {/* ── HERO ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid var(--rule)',
          minHeight: '64vh',
        }}
      >
        {/* Left: text */}
        <div
          style={{
            padding: '56px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid var(--rule-soft)',
          }}
        >
          <Link
            href="/buyer#artists"
            className="atelier-label"
            style={{ cursor: 'pointer', display: 'inline-block' }}
          >
            ← Back to discovery
          </Link>

          <div>
            <div className="atelier-label">Artist · 작가</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(72px, 9vw, 160px)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                margin: '16px 0 8px',
              }}
            >
              {enName || displayName}
            </h1>
            {enName && (
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 32,
                  color: 'var(--ink-mid)',
                }}
              >
                {displayName}
              </div>
            )}
            <div style={{ display: 'flex', gap: 24, marginTop: 28, fontSize: 13 }}>
              <span>
                <span className="atelier-label">Based </span> Seoul, KR
              </span>
              <span>
                <span className="atelier-label">Active </span> since 2018
              </span>
            </div>
          </div>

          <div style={{ maxWidth: '44ch' }}>
            <p style={{ fontSize: 16, lineHeight: 1.7 }}>
              단 한 점만 제작된 원화를 통해, 작가와 컬렉터를 직접 연결합니다.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-mid)', marginTop: 14 }}>
              Each work in the collection is a unique, signed original. ATELIER 1/1 represents
              artists whose practice centres on the singular artwork.
            </p>
          </div>
        </div>

        {/* Right: portrait + stats */}
        <div
          style={{
            background: 'var(--bone-soft)',
            display: 'grid',
            gridTemplateRows: '1fr auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              padding: 64,
            }}
          >
            <div
              style={{
                width: 'min(360px, 70%)',
                aspectRatio: '4/5',
                background: portraitGradient,
                position: 'relative',
                boxShadow: '0 22px 36px -16px rgba(0,0,0,0.45)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '22% 18% 0 18%',
                  background:
                    'radial-gradient(ellipse 60% 38% at 50% 35%, #E5C9AC 0%, #8B5C3C 80%)',
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              padding: '24px 32px',
              borderTop: '1px solid var(--rule-soft)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
            }}
          >
            {[
              { label: 'Works', value: worksCount },
              { label: 'Sold', value: soldCount },
              { label: 'Followers', value: '—' },
              { label: 'Avg. price', value: '₩3.4M' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="atelier-label">{label}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    marginTop: 4,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXHIBITION WALL ── */}
      <section
        style={{ padding: '80px 32px 40px', borderBottom: '1px solid var(--rule)' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'end',
            marginBottom: 36,
          }}
        >
          <div>
            <div className="atelier-label">Available · 판매 중인 작품</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 56,
                margin: '8px 0 0',
                letterSpacing: '-0.02em',
              }}
            >
              On the wall.
            </h2>
          </div>
          <div className="atelier-label">{worksCount} works</div>
        </div>

        {artworksWithUrls.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--ink-mid)' }}>등록된 작품이 없습니다.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 32,
              alignItems: 'end',
              minHeight: 460,
              paddingBottom: 24,
              borderBottom: '1px solid var(--ink)',
            }}
          >
            {artworksWithUrls.map((aw, i) => {
              const span = aw.width_cm >= 90 ? 4 : aw.width_cm >= 70 ? 3 : 2
              const baselineOffset = [0, 30, 14, 56, 22, 0, 38][i % 7]
              const heightPx = Math.min(420, aw.height_cm * 3.2)
              const widthPx = Math.min(380, aw.width_cm * 3.6)

              return (
                <div
                  key={aw.id}
                  style={{
                    gridColumn: `span ${span}`,
                    marginBottom: baselineOffset,
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 14,
                  }}
                >
                  <Link
                    href={`/artwork/${aw.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'end',
                      justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: widthPx,
                        height: heightPx,
                        background: 'var(--wall)',
                        padding: 8,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 18px 30px -22px rgba(0,0,0,0.35)',
                        position: 'relative',
                      }}
                    >
                      {aw.thumbnailUrl ? (
                        <Image
                          src={aw.thumbnailUrl}
                          alt={`작품 — ${aw.title}`}
                          fill
                          className="object-contain"
                          sizes={`${widthPx}px`}
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
                  </Link>

                  {/* Caption */}
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      lineHeight: 1.55,
                      color: 'var(--ink-soft)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontSize: 16,
                        color: 'var(--ink)',
                      }}
                    >
                      {aw.title}
                    </div>
                    <div>
                      {new Date(aw.created_at).getFullYear()} · {aw.width_cm} × {aw.height_cm} cm
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {aw.status === 'auctioning' ? (
                        <span style={{ color: 'var(--live)' }}>
                          현재가 {formatKRW(aw.price)} · LIVE
                        </span>
                      ) : aw.status === 'sold' ? (
                        <span style={{ color: 'var(--ink-mid)' }}>SOLD</span>
                      ) : (
                        formatKRW(aw.price)
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── CV / PAST SALES ── */}
      <section
        style={{
          padding: '80px 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          borderBottom: '1px solid var(--rule)',
        }}
      >
        {/* CV */}
        <div>
          <div className="atelier-label">Selected exhibitions</div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              margin: '12px 0 24px',
              letterSpacing: '-0.02em',
            }}
          >
            CV.
          </h3>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {MOCK_CV.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                  <td
                    style={{
                      padding: '14px 0',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--ink-mid)',
                      width: 60,
                    }}
                  >
                    {row[0]}
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                    }}
                  >
                    {row[1]}
                  </td>
                  <td style={{ padding: '14px 12px' }}>{row[2]}</td>
                  <td
                    style={{
                      padding: '14px 0',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--ink-mid)',
                      textAlign: 'right',
                    }}
                  >
                    {row[3]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Past sales */}
        <div>
          <div className="atelier-label">Past results · 낙찰 기록</div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              margin: '12px 0 24px',
              letterSpacing: '-0.02em',
            }}
          >
            Hammered.
          </h3>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {MOCK_SALES.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                  <td
                    style={{
                      padding: '14px 0',
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                    }}
                  >
                    {row[0]}
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--ink-mid)',
                    }}
                  >
                    {row[1]}
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                    }}
                  >
                    {row[2]}
                  </td>
                  <td
                    style={{
                      padding: '14px 0',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--live)',
                      textAlign: 'right',
                    }}
                  >
                    {row[3]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
