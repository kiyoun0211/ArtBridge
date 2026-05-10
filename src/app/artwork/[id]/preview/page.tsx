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
    .select('id, title, width_cm, height_cm, mockup_url, storage_path, price, profiles!artworks_artist_id_fkey(display_name, email)')
    .eq('id', id)
    .single()

  if (!artwork) notFound()

  const artworkWithProfile = artwork as typeof artwork & {
    profiles: { display_name: string | null; email: string } | null
  }

  // Resolve artwork image URL
  let imageUrl: string | null = artwork.mockup_url ?? null
  if (!imageUrl && artwork.storage_path) {
    const { data: urlData } = await admin.storage
      .from('artwork-originals')
      .createSignedUrl(artwork.storage_path, 3600)
    imageUrl = urlData?.signedUrl ?? null
  }

  const displayName = artworkWithProfile.profiles?.display_name ?? artworkWithProfile.profiles?.email ?? '작가'
  const artistName = (ARTIST_EN_NAMES[displayName] ?? '') || displayName

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
          {artwork.title}{' '}
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
          title: artwork.title,
          width_cm: artwork.width_cm,
          height_cm: artwork.height_cm,
          imageUrl,
          artistName,
          price: (artwork as unknown as { price?: number }).price ?? null,
        }}
      />
    </div>
  )
}
