import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BuyerHeader } from '@/components/layout/BuyerHeader'
import { DetailClient } from './DetailClient'

const ARTIST_EN_NAMES: Record<string, string> = {
  윤아라: 'Yoon Ara',
  김지호: 'Kim Jiho',
  이해온: 'Lee Hae-on',
  박온유: 'Park Onyu',
}

function artistEnName(nameKr: string | null | undefined, fallback: string): string {
  if (!nameKr) return fallback
  return ARTIST_EN_NAMES[nameKr] ?? fallback
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: artwork } = await admin
    .from('artworks')
    .select(
      'id, artist_id, title, title_kr, year, medium, medium_kr, width_cm, height_cm, body_text, image_url, mode, price_krw, status, current_bid_krw, auction_ends_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (!artwork) notFound()

  const { data: artist } = await admin
    .from('artists')
    .select('id, name, name_kr')
    .eq('id', artwork.artist_id)
    .maybeSingle()

  const isAuction = artwork.mode === 'auction'
  const status = isAuction ? 'auctioning' : artwork.status ?? 'available'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)' }}>
      <BuyerHeader />
      <DetailClient
        artwork={{
          id: artwork.id,
          title: artwork.title_kr ?? artwork.title,
          status,
          sale_type: isAuction ? 'auction' : 'fixed',
          price: isAuction ? artwork.current_bid_krw : artwork.price_krw,
          width_cm: Number(artwork.width_cm),
          height_cm: Number(artwork.height_cm),
          description: artwork.body_text ?? null,
          imageUrl: artwork.image_url ?? null,
          artistId: artist?.id ?? '',
          artistName: artist?.name_kr ?? artist?.name ?? '작가 정보 없음',
          artistEnName: artistEnName(artist?.name_kr, artist?.name ?? ''),
          year: artwork.year ?? null,
          medium: artwork.medium_kr ?? artwork.medium ?? null,
          auction_ends_at: artwork.auction_ends_at ?? null,
        }}
      />
    </div>
  )
}
