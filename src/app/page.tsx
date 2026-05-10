import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-xl w-full text-center">
        {/* Wordmark */}
        <p className="text-2xl font-semibold mb-20">ArtBridge</p>

        {/* Hero */}
        <h1
          className="text-[32px] font-semibold leading-[1.2] mb-4"
          style={{ color: 'var(--color-foreground)' }}
        >
          내 공간에서 만나는 원화
        </h1>
        <p
          className="text-base leading-relaxed mb-12"
          style={{ color: 'var(--color-muted)' }}
        >
          작가와 직접 연결되는 AI 미술 작품 플랫폼
        </p>

        {/* CTAs */}
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-[6px] text-sm font-semibold text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-[6px] text-sm font-semibold border"
            style={{
              color: 'var(--color-foreground)',
              borderColor: 'var(--color-border)',
            }}
          >
            회원가입
          </Link>
        </div>
      </div>
    </main>
  )
}
