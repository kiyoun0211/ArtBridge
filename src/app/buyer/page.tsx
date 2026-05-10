import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <>
      <Header email={profile.email} />
      <main
        className="min-h-[calc(100vh-56px)] flex flex-col items-center px-4 pt-12"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="w-full max-w-2xl">
          <div
            className="rounded-xl p-6 sm:p-8"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h1
              className="text-[20px] font-semibold leading-[1.3] mb-3"
              style={{ color: 'var(--color-foreground)' }}
            >
              반갑습니다, {profile.email}님
            </h1>
            <p
              className="text-base leading-relaxed"
              style={{ color: 'var(--color-muted)' }}
            >
              구매자 화면입니다. 이번 단계에서는 빈 영역입니다 — 다음 단계에서 작품 탐색/입찰 화면이 추가됩니다.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
