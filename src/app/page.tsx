import Link from 'next/link'

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bone)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
      }}
    >
      <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
        {/* Wordmark */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 64px)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          ATELIER
          <sup
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(10px, 1.4vw, 16px)',
              letterSpacing: '0.18em',
              color: 'var(--ink-mid)',
              position: 'relative',
              top: '-12px',
            }}
          >
            1/1
          </sup>
        </div>

        {/* Brand line */}
        <div
          className="atelier-label"
          style={{ marginBottom: 64, color: 'var(--ink-mid)' }}
        >
          Edition of One
        </div>

        {/* Hero headline in Instrument Serif italic */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 6vw, 80px)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            margin: '0 0 24px',
          }}
        >
          단 하나뿐인
          <br />
          <em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>
            작품의 마켓플레이스.
          </em>
        </h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: 'var(--ink-soft)',
            maxWidth: '46ch',
            margin: '0 auto 48px',
          }}
        >
          작가와 직접 연결되는 원화 컬렉션. 구매 전 내 공간에서 실제 크기로 미리 확인하세요.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/buyer"
            className="atelier-btn atelier-btn--xl"
            style={{ minHeight: 44 }}
          >
            Discover works →
          </Link>
          <Link
            href="/login"
            className="atelier-btn atelier-btn--ghost atelier-btn--xl"
            style={{ minHeight: 44 }}
          >
            로그인
          </Link>
        </div>

        {/* Hairline divider + tagline */}
        <div
          style={{
            marginTop: 80,
            paddingTop: 32,
            borderTop: '1px solid var(--rule-soft)',
          }}
        >
          <div
            className="atelier-label"
            style={{
              color: 'var(--ink-mute)',
              display: 'flex',
              gap: 24,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span>작가 등록</span>
            <span style={{ color: 'var(--rule)' }}>·</span>
            <Link href="/signup" style={{ color: 'var(--ink-mid)' }}>
              회원가입
            </Link>
            <span style={{ color: 'var(--rule)' }}>·</span>
            <Link href="/artist" style={{ color: 'var(--ink-mid)' }}>
              작가 대시보드
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
