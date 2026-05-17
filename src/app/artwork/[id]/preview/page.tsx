import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BuyerHeader } from '@/components/layout/BuyerHeader'
import { PreviewClient } from './PreviewClient'

const ARTIST_EN_NAMES: Record<string, string> = {
  윤아라: 'Yoon Ara',
  김지호: 'Kim Jiho',
  이해온: 'Lee Hae-on',
  박온유: 'Park Onyu',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ArtworkPreviewPage({ params }: Props) {
  const { id } = await params

  const admin = createAdminClient()

  const { data: artwork } = await admin
    .from('artworks')
    .select('id, artist_id, title, title_kr, width_cm, height_cm, image_url, mode, price_krw, current_bid_krw')
    .eq('id', id)
    .maybeSingle()

  if (!artwork) notFound()

  const { data: artist } = await admin
    .from('artists')
    .select('name, name_kr')
    .eq('id', artwork.artist_id)
    .maybeSingle()

  const imageUrl: string | null = artwork.image_url ?? null
  const displayName = artist?.name_kr ?? artist?.name ?? '작가'
  const artistName = ARTIST_EN_NAMES[displayName] ?? artist?.name ?? displayName
  const title = artwork.title_kr ?? artwork.title
  const price = artwork.mode === 'auction' ? artwork.current_bid_krw : artwork.price_krw

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          padding: '18px 32px',
          borderBottom: '1px solid var(--rule-soft)',
          alignItems: 'center',
          background: 'color-mix(in srgb, var(--bone) 88%, transparent)',
          backdropFilter: 'blur(14px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          href={`/artwork/${id}`}
          className="atelier-label"
          style={{ color: 'var(--ink-mid)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← 작품 상세로
        </Link>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 20,
            textAlign: 'center',
          }}
        >
          {title}{' '}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.16em',
              color: 'var(--ink-mid)',
              fontStyle: 'normal',
            }}
          >
            · {artwork.height_cm}×{artwork.width_cm} cm
          </span>
        </div>
        <div
          className="atelier-label"
          style={{ textAlign: 'right', color: 'var(--ink-mid)' }}
        >
          AI Room Preview · 내 공간 미리보기
        </div>
      </div>

      <PreviewClient
        artwork={{
          id: artwork.id,
          title,
          width_cm: Number(artwork.width_cm),
          height_cm: Number(artwork.height_cm),
          imageUrl,
          artistName,
          price,
        }}
      />
    </div>
  )
}
