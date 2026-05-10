import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'

const SALE_TYPE_LABELS: Record<string, string> = {
  fixed: '정찰제',
  auction: '경매',
}

const STATUS_LABELS: Record<string, string> = {
  available: '판매 중',
  auctioning: '경매 중',
  sold: '판매 완료',
  draft: '임시 저장',
  cancelled: '취소됨',
}

function formatKRW(price: number | null): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params

  // Use admin client for public detail page — artwork-originals is private.
  // TODO: replace with public mockup_url once AI generation is wired (Phase 2)
  const admin = createAdminClient()

  const { data: artwork } = await admin
    .from('artworks')
    .select('*, profiles!artworks_artist_id_fkey(email, display_name)')
    .eq('id', id)
    .single()

  if (!artwork) notFound()

  const artworkWithProfile = artwork as typeof artwork & {
    profiles: { email: string; display_name: string | null } | null
  }

  // Resolve image URL: mockup_url first, then signed original
  let imageUrl: string | null = artwork.mockup_url ?? null
  if (!imageUrl && artwork.storage_path) {
    const { data: urlData } = await admin.storage
      .from('artwork-originals')
      .createSignedUrl(artwork.storage_path, 3600)
    imageUrl = urlData?.signedUrl ?? null
  }

  // Compute aspect ratio for image display
  const aspectRatio = artwork.width_cm / artwork.height_cm
  // Clamp to reasonable display range
  const clampedRatio = Math.max(0.4, Math.min(2.5, aspectRatio))
  const paddingTop = `${(1 / clampedRatio) * 100}%`

  const artistLabel =
    artworkWithProfile.profiles?.display_name ?? artworkWithProfile.profiles?.email ?? '작가 정보 없음'

  return (
    <main
      className="min-h-screen px-4 md:px-6 py-10"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="w-full max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          href="/buyer"
          className="inline-block mb-8 text-[14px]"
          style={{ color: 'var(--color-muted)' }}
        >
          ← 둘러보기로 돌아가기
        </Link>

        {/* Two-column layout on lg+ */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Image column */}
          <div className="lg:flex-1">
            <div
              className="relative w-full rounded-xl overflow-hidden"
              style={{
                paddingTop,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`작품 — ${artwork.title}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ color: 'var(--color-muted)' }}
                >
                  <span className="text-sm">이미지 없음</span>
                </div>
              )}
            </div>
          </div>

          {/* Details column */}
          <div className="lg:w-[360px] flex flex-col gap-5">
            {/* Title */}
            <h1
              className="text-[32px] font-semibold leading-[1.2]"
              style={{ color: 'var(--color-foreground)' }}
            >
              {artwork.title}
            </h1>

            {/* Artist */}
            <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
              작가: {artistLabel}
            </p>

            {/* Size */}
            <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
              사이즈: 가로 {artwork.width_cm}cm × 세로 {artwork.height_cm}cm
            </p>

            {/* Status + Sale type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-block text-[13px] font-medium px-3 py-1 rounded"
                style={{
                  background: 'var(--color-border)',
                  color: 'var(--color-muted)',
                }}
              >
                {STATUS_LABELS[artwork.status] ?? artwork.status}
              </span>
              <span
                className="inline-block text-[13px] font-medium px-3 py-1 rounded"
                style={{
                  background: 'var(--color-background)',
                  color: 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {SALE_TYPE_LABELS[artwork.sale_type] ?? artwork.sale_type}
              </span>
            </div>

            {/* Price */}
            <p
              className="text-[26px] font-semibold"
              style={{ color: 'var(--color-foreground)' }}
            >
              {formatKRW(artwork.price)}
            </p>

            {/* Description */}
            {artwork.description && (
              <p
                className="text-[14px] leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--color-muted)' }}
              >
                {artwork.description}
              </p>
            )}

            {/* Action button — placeholder, payment/bidding in future phase */}
            <div className="mt-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="준비 중입니다"
                className="w-full h-12 rounded-lg text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{
                  background: 'var(--color-accent)',
                  color: '#ffffff',
                }}
              >
                {artwork.sale_type === 'auction' ? '입찰하기' : '구매 문의'}
              </button>
              <p className="mt-2 text-center text-[12px]" style={{ color: 'var(--color-muted)' }}>
                준비 중입니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
