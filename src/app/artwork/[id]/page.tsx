import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BuyerHeader } from '@/components/layout/BuyerHeader'
import { DetailClient } from './DetailClient'

// EN name mapping for seeded artists
const ARTIST_EN_NAMES: Record<string, string> = {
  박지혜: 'Park Jihye',
  김민수: 'Kim Minsoo',
  이해인: 'Lee Haein',
  정태양: 'Jung Taeyang',
}

function artistEnName(displayName: string | null | undefined): string {
  if (!displayName) return ''
  return ARTIST_EN_NAMES[displayName] ?? ''
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params

  const admin = createAdminClient()

  const { data: artwork } = await admin
    .from('artworks')
    .select('*, profiles!artworks_artist_id_fkey(id, email, display_name)')
    .eq('id', id)
    .single()

  if (!artwork) notFound()

  const artworkWithProfile = artwork as typeof artwork & {
    profiles: { id: string; email: string; display_name: string | null } | null
  }

  // Resolve image URL
  let imageUrl: string | null = artwork.mockup_url ?? null
  if (!imageUrl && artwork.storage_path) {
    const { data: urlData } = await admin.storage
      .from('artwork-originals')
      .createSignedUrl(artwork.storage_path, 3600)
    imageUrl = urlData?.signedUrl ?? null
  }

  const artistName =
    artworkWithProfile.profiles?.display_name ?? artworkWithProfile.profiles?.email ?? '작가 정보 없음'
  const artistId = artworkWithProfile.profiles?.id ?? ''

  // Extract year from created_at if DB field not present
  const year = (artwork as unknown as { year?: number })?.year
    ?? new Date(artwork.created_at).getFullYear()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)' }}>
      <BuyerHeader />
      <DetailClient
        artwork={{
          id: artwork.id,
          title: artwork.title,
          status: artwork.status,
          sale_type: artwork.sale_type,
          price: artwork.price,
          width_cm: artwork.width_cm,
          height_cm: artwork.height_cm,
          description: artwork.description,
          imageUrl,
          artistId,
          artistName,
          artistEnName: artistEnName(artworkWithProfile.profiles?.display_name),
          year,
          medium: (artwork as unknown as { medium?: string })?.medium ?? null,
          auction_ends_at:
            (artwork as unknown as { auction_ends_at?: string })?.auction_ends_at ?? null,
        }}
      />
    </div>
  )
}
