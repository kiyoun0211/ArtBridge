import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BuyerHeader } from '@/components/layout/BuyerHeader'

const ARTIST_GRADIENTS = [
  'linear-gradient(140deg,#C9B58A,#6F5A38)',
  'linear-gradient(140deg,#A8B7B2,#3F4D49)',
  'linear-gradient(140deg,#E1B7A1,#7B4C36)',
  'linear-gradient(140deg,#9E9CB4,#3D3956)',
]

export default async function ArtistsPage() {
  const admin = createAdminClient()
  const { data: artists } = await admin
    .from('artists')
    .select('id, name, name_kr, location, active_since, medium, works_count, sold_count, followers')
    .order('created_at', { ascending: true })

  const rows = artists ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)' }}>
      <BuyerHeader activePath="/artists" />
      <main style={{ padding: '64px 32px 120px' }}>
        <section style={{ marginBottom: 48 }}>
          <div className="atelier-label">Represented · 작가</div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(56px, 8vw, 120px)',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              margin: '12px 0 0',
            }}
          >
            {rows.length} artists.
          </h1>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            borderTop: '1px solid var(--rule)',
          }}
        >
          {rows.map((artist, i) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              style={{
                padding: '40px 24px',
                borderRight: '1px solid var(--rule-soft)',
                borderBottom: '1px solid var(--rule-soft)',
                display: 'grid',
                gap: 18,
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  aspectRatio: '1/1.1',
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

              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {artist.name_kr ?? artist.name}
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
                  {artist.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginTop: 14,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-mid)',
                    letterSpacing: '0.06em',
                  }}
                >
                  <span>{artist.location ?? '—'}</span>
                  <span>·</span>
                  <span>since {artist.active_since ?? '—'}</span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-mid)',
                    marginTop: 8,
                  }}
                >
                  {artist.medium ?? ''}
                </div>
                <div className="atelier-label" style={{ marginTop: 16 }}>
                  {artist.works_count ?? 0} works · {artist.sold_count ?? 0} sold
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
