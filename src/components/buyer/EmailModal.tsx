'use client'

import Image from 'next/image'

type ArtworkInfo = {
  id: string
  title: string
  width_cm: number
  height_cm: number
  price: number | null
  imageUrl: string | null
  artistName: string
  year?: number | null
  medium?: string | null
}

type Props = {
  type: 'purchase' | 'auction-end'
  artwork: ArtworkInfo
  onClose: () => void
}

function formatKRW(price: number | null | undefined): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

export function EmailModal({ type, artwork, onClose }: Props) {
  const isSale = type === 'purchase'
  const orderNum = Math.floor((parseInt(artwork.id.replace(/-/g, '').slice(0, 8), 16) % 9000) + 1000)
  const subj = isSale
    ? `구매가 완료되었습니다 — ${artwork.title}, ${artwork.artistName}`
    : `옥션 종료: 낙찰 — ${artwork.title}, ${artwork.artistName}`

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={subj}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: 'rgba(20,18,15,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        animation: 'emailIn .25s ease both',
        padding: 40,
      }}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--rule-soft)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase' as const,
            color: 'var(--ink-mid)',
          }}
        >
          <span>Auto-email · 자동 발송</span>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'var(--ink-mid)',
            }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Header */}
        <div
          style={{
            padding: '28px 36px 20px',
            borderBottom: '1px solid var(--rule-soft)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mid)' }}>
            from <strong>orders@atelier1of1.com</strong>
            <br />
            to <strong>you@gmail.com</strong>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {subj}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '28px 36px',
            fontSize: 14,
            lineHeight: 1.7,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-mid)',
              letterSpacing: '0.16em',
            }}
          >
            ATELIER 1/1 · ORDER #A1-{artwork.id.toUpperCase().slice(0, 8)}-{orderNum}
          </div>
          <p style={{ marginTop: 12 }}>
            안녕하세요,
            <br />
            {isSale ? (
              <>
                축하합니다.{' '}
                <strong
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    fontWeight: 400,
                  }}
                >
                  {artwork.title}
                </strong>{' '}
                ({artwork.artistName}, {artwork.year})의 구매가 완료되었습니다.
              </>
            ) : (
              <>
                축하합니다.{' '}
                <strong
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    fontWeight: 400,
                  }}
                >
                  {artwork.title}
                </strong>{' '}
                ({artwork.artistName}, {artwork.year}) 옥션이 종료되었으며, 회원님이 낙찰자로
                결정되었습니다.
              </>
            )}
          </p>

          {/* Artwork image */}
          <div
            style={{
              margin: '18px -36px 24px',
              height: 280,
              background: 'var(--bone-deep)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {artwork.imageUrl ? (
              <div
                style={{
                  width: 180,
                  aspectRatio: `${artwork.width_cm}/${artwork.height_cm}`,
                  position: 'relative',
                }}
              >
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  className="object-contain"
                  sizes="180px"
                />
              </div>
            ) : (
              <div
                style={{
                  width: 180,
                  aspectRatio: '4/5',
                  background: 'linear-gradient(135deg, var(--bone-deep), var(--rule))',
                }}
              />
            )}
          </div>

          {/* Detail grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              padding: '16px 0',
              borderTop: '1px solid var(--rule-soft)',
              borderBottom: '1px solid var(--rule-soft)',
            }}
          >
            <div>
              <div className="atelier-label">Work · 작품</div>
              <div style={{ marginTop: 6 }}>
                {artwork.title}, {artwork.year}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-mid)' }}>
                {artwork.height_cm} × {artwork.width_cm} cm · {artwork.medium}
              </div>
            </div>
            <div>
              <div className="atelier-label">{isSale ? 'Final price' : 'Hammer price'}</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  marginTop: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                {formatKRW(artwork.price)}
              </div>
            </div>
            <div>
              <div className="atelier-label">Ships from</div>
              <div style={{ marginTop: 6 }}>Seoul, KR</div>
            </div>
            <div>
              <div className="atelier-label">ETA · 도착 예정</div>
              <div style={{ marginTop: 6 }}>7–14일 (국내)</div>
            </div>
          </div>

          <p style={{ color: 'var(--ink-soft)', marginTop: 16, lineHeight: 1.7 }}>
            결제는 등록하신 카드로 자동 진행되며, 24시간 내 운송 일정이 발송됩니다. 작품 수령 후 7일
            이내 컨디션 이슈가 있을 경우 보증 환불이 적용됩니다.
          </p>

          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 18,
              lineHeight: 1.5,
              marginTop: 24,
              color: 'var(--ink-soft)',
            }}
          >
            "Each work, one of one. Thank you for collecting."
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 36px',
            borderTop: '1px solid var(--rule-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span className="atelier-label" style={{ alignSelf: 'center' }}>
            · 작가에게도 동일한 알림이 발송됩니다
          </span>
          <button
            onClick={onClose}
            className="atelier-btn atelier-btn--sm"
            aria-label="모달 닫기"
            style={{ minHeight: 44 }}
          >
            Close ✕
          </button>
        </div>
      </div>
    </div>
  )
}
