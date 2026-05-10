import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SALE_TYPE_LABELS: Record<string, string> = {
  fixed: '정찰제',
  auction: '경매',
}

function formatKRW(price: number | null): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

type ArtworkRow = {
  id: string
  title: string
  status: string
  sale_type: string
  price: number | null
  storage_path: string | null
  mockup_url: string | null
  created_at: string
  profiles: { email: string; display_name: string | null } | null
}

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

  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, status, sale_type, price, storage_path, mockup_url, created_at, profiles!artworks_artist_id_fkey(email, display_name)')
    .in('status', ['available', 'auctioning'])
    .order('created_at', { ascending: false })
    .limit(60)

  const typedArtworks = (artworks ?? []) as unknown as ArtworkRow[]

  // Fetch thumbnail URLs — use mockup_url if available, otherwise fall back to
  // signed URL via admin client (artwork-originals is private; admin bypasses bucket RLS).
  // TODO: replace with public mockup_url once AI generation is wired (Phase 2)
  const admin = createAdminClient()

  const artworksWithUrls = await Promise.all(
    typedArtworks.map(async (artwork) => {
      if (artwork.mockup_url) {
        return { ...artwork, thumbnailUrl: artwork.mockup_url }
      }
      let thumbnailUrl: string | null = null
      if (artwork.storage_path) {
        const { data: urlData } = await admin.storage
          .from('artwork-originals')
          .createSignedUrl(artwork.storage_path, 3600)
        thumbnailUrl = urlData?.signedUrl ?? null
      }
      return { ...artwork, thumbnailUrl }
    }),
  )

  return (
    <>
      <Header email={profile.email} role="buyer" />
      <main
        className="min-h-[calc(100vh-56px)] px-4 md:px-6 pt-10 pb-16"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="w-full max-w-5xl mx-auto">
          <h1
            className="text-2xl font-semibold mb-8"
            style={{ color: 'var(--color-foreground)' }}
          >
            작품 둘러보기
          </h1>

          {artworksWithUrls.length === 0 ? (
            <div
              className="rounded-xl p-10 flex flex-col items-center text-center"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p className="text-[16px]" style={{ color: 'var(--color-muted)' }}>
                아직 판매 중인 작품이 없습니다.
              </p>
            </div>
          ) : (
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
                      {artwork.thumbnailUrl ? (
                        <Image
                          src={artwork.thumbnailUrl}
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

                      <p
                        className="text-[15px] font-semibold"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {formatKRW(artwork.price)}
                      </p>

                      {artwork.profiles && (
                        <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
                          {artwork.profiles.display_name ?? artwork.profiles.email}
                        </p>
                      )}
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
