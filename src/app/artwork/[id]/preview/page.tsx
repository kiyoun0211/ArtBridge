import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { PreviewClient } from './PreviewClient'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ArtworkPreviewPage({ params }: Props) {
  const { id } = await params

  const admin = createAdminClient()

  const { data: artwork } = await admin
    .from('artworks')
    .select('id, title, width_cm, height_cm, mockup_url, storage_path')
    .eq('id', id)
    .single()

  if (!artwork) notFound()

  // Resolve artwork image URL: mockup_url first, then signed storage URL
  let imageUrl: string | null = artwork.mockup_url ?? null
  if (!imageUrl && artwork.storage_path) {
    const { data: urlData } = await admin.storage
      .from('artwork-originals')
      .createSignedUrl(artwork.storage_path, 3600)
    imageUrl = urlData?.signedUrl ?? null
  }

  return (
    <main
      className="min-h-screen px-4 md:px-6 py-10"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="w-full max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href={`/artwork/${id}`}
          className="inline-block mb-8 text-[14px]"
          style={{ color: 'var(--color-muted)' }}
        >
          ← 작품 상세로
        </Link>

        {/* Page heading */}
        <div className="mb-8">
          <h1
            className="text-[28px] font-semibold leading-[1.2] mb-2"
            style={{ color: 'var(--color-foreground)' }}
          >
            내 공간에 미리 보기
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
            방 사진과 벽 폭(cm)을 알려주시면, 작품을 정확한 크기로 합성해드립니다.
          </p>
        </div>

        {/* Client component: form + result */}
        <PreviewClient
          artwork={{
            id: artwork.id,
            title: artwork.title,
            width_cm: artwork.width_cm,
            height_cm: artwork.height_cm,
            imageUrl,
          }}
        />
      </div>
    </main>
  )
}
