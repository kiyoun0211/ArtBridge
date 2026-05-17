import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'

export default async function ArtistPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) redirect('/login')

  const { data: userData } = await supabase.auth.getUser()
  const email = userData.user?.email ?? ''

  return (
    <>
      <Header email={email} role="artist" />
      <main
        style={{
          minHeight: 'calc(100vh - 56px)',
          padding: '64px 32px',
          background: 'var(--bone)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <div className="atelier-label">Artist · 작가</div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 6vw, 88px)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              margin: '16px 0 24px',
            }}
          >
            Studio.
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: 'var(--ink-mid)',
              marginBottom: 32,
            }}
          >
            작품 등록 · 옥션 개설 · 판매 관리 기능은 곧 오픈됩니다. 지금은 마켓플레이스 미리보기를
            둘러볼 수 있어요.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/buyer" className="atelier-btn">
              마켓플레이스 둘러보기 →
            </Link>
            <Link href="/artists" className="atelier-btn atelier-btn--ghost">
              작가 목록
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
