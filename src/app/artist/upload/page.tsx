import Link from 'next/link'

export default function ArtistUploadPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bone)',
        display: 'grid',
        placeItems: 'center',
        padding: '64px 32px',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <Link
          href="/artist"
          className="atelier-label"
          style={{ display: 'inline-block', marginBottom: 24, color: 'var(--ink-mid)' }}
        >
          ← Studio로
        </Link>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 5vw, 64px)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            margin: '0 0 16px',
          }}
        >
          Upload, soon.
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-mid)', marginBottom: 24 }}>
          작품 업로드 · AI 목업 생성 기능은 준비 중입니다.
        </p>
      </div>
    </main>
  )
}
