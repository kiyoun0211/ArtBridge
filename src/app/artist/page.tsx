import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

const STATUS_LABELS: Record<string, string> = {
  available: '판매 중',
  auctioning: '경매 중',
  sold: '판매 완료',
  draft: '임시 저장',
  cancelled: '취소됨',
}

const SALE_TYPE_LABELS: Record<string, string> = {
  fixed: '정찰제',
  auction: '경매',
}

function formatKRW(price: number | null): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

export default async function ArtistPage() {
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
  if (profile.role !== 'artist') redirect('/buyer')

  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, status, sale_type, price, storage_path, created_at')
    .eq('artist_id', userId)
    .order('created_at', { ascending: false })

  // Fetch signed URLs for each artwork (private bucket — artist-only access)
  const artworksWithUrls = await Promise.all(
    (artworks ?? []).map(async (artwork) => {
      let signedUrl: string | null = null
      if (artwork.storage_path) {
        const { data: urlData } = await supabase.storage
          .from('artwork-originals')
          .createSignedUrl(artwork.storage_path, 3600)
        signedUrl = urlData?.signedUrl ?? null
      }
      return { ...artwork, signedUrl }
    }),
  )

  return (
    <>
      <Header email={profile.email} role="artist" />
      <main
        className="min-h-[calc(100vh-56px)] px-4 md:px-6 pt-10 pb-16"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="w-full max-w-5xl mx-auto">
          {/* Hero row */}
          <div className="flex items-center justify-between mb-8 gap-4">
            <h1
              className="text-2xl font-semibold"
              style={{ color: 'var(--color-foreground)' }}
            >
              내 작품
            </h1>
            <Link href="/artist/upload">
              <Button
                className="h-11 px-5 text-[14px] font-semibold"
                style={{ background: 'var(--color-accent)', color: '#ffffff' }}
              >
                작품 등록하기
              </Button>
            </Link>
          </div>

          {artworksWithUrls.length === 0 ? (
            /* Empty state */
            <div
              className="rounded-xl p-10 flex flex-col items-center text-center gap-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p className="text-[16px]" style={{ color: 'var(--color-muted)' }}>
                아직 등록한 작품이 없습니다. 첫 작품을 올려보세요.
              </p>
              <Link href="/artist/upload">
                <Button
                  className="h-11 px-5 text-[14px] font-semibold"
                  style={{ background: 'var(--color-accent)', color: '#ffffff' }}
                >
                  작품 등록하기
                </Button>
              </Link>
            </div>
          ) : (
            /* Artwork grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {artworksWithUrls.map((artwork) => (
                <Link key={artwork.id} href={`/artwork/${artwork.id}`} className="group block">
                  <div
                    className="rounded-xl overflow-hidden transition-shadow group-hover:shadow-md"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative w-full aspect-square"
                      style={{ background: 'var(--color-border)' }}
                    >
                      {artwork.signedUrl ? (
                        <Image
                          src={artwork.signedUrl}
                          alt={`작품 — ${artwork.title}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          <span className="text-sm">이미지 없음</span>
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="p-4 flex flex-col gap-2">
                      <p
                        className="text-[15px] font-semibold truncate"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {artwork.title}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status badge */}
                        <span
                          className="inline-block text-[12px] font-medium px-2 py-0.5 rounded"
                          style={{
                            background: 'var(--color-border)',
                            color: 'var(--color-muted)',
                          }}
                        >
                          {STATUS_LABELS[artwork.status] ?? artwork.status}
                        </span>
                        {/* Sale type label */}
                        <span
                          className="inline-block text-[12px] font-medium px-2 py-0.5 rounded"
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
                        className="text-[15px] font-semibold"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {formatKRW(artwork.price)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
