'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { EmailModal } from '@/components/buyer/EmailModal'
import { CountdownTimer } from '@/components/buyer/CountdownTimer'

function formatKRW(price: number | null | undefined): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

// Generate deterministic mock bid history from artwork id
function genMockBids(artworkId: string, startBid: number): Array<{ user: string; amt: number; ago: string }> {
  const names = ['M. Cho', 'S. Im', 'L. Yoon', 'anon_412', 'K. Hwang', 'H. Park']
  // simple hash from id
  const seed = artworkId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const count = (seed % 5) + 3 // 3-7 bids
  const bids = []
  let current = startBid
  const agoLabels = ['방금', '1분 전', '3분 전', '8분 전', '20분 전', '45분 전', '1시간 전']
  for (let i = 0; i < count; i++) {
    const inc = [100000, 200000, 300000, 500000][(seed * (i + 1)) % 4]
    current += inc
    bids.push({
      user: names[(seed * (i + 3)) % names.length],
      amt: current,
      ago: agoLabels[i] ?? `${i + 1}시간 전`,
    })
  }
  return bids.reverse()
}

type ArtworkDetail = {
  id: string
  title: string
  status: string
  sale_type: string
  price: number | null
  width_cm: number
  height_cm: number
  description: string | null
  imageUrl: string | null
  artistId: string
  artistName: string
  artistEnName: string
  year: number | null
  medium: string | null
  auction_ends_at: string | null
}

type Props = {
  artwork: ArtworkDetail
}

type TabMode = 'info' | 'auction' | 'room'

export function DetailClient({ artwork }: Props) {
  const isAuction = artwork.sale_type === 'auction' && artwork.status === 'auctioning'
  const [mode, setMode] = useState<TabMode>(isAuction ? 'auction' : 'info')
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailType, setEmailType] = useState<'purchase' | 'auction-end'>('purchase')

  const mockBids = useMemo(
    () => genMockBids(artwork.id, artwork.price ?? 1000000),
    [artwork.id, artwork.price],
  )
  const currentBid = isAuction ? mockBids[0]?.amt ?? artwork.price ?? 0 : artwork.price ?? 0
  const startBid = artwork.price ?? 0
  const [bidAmt, setBidAmt] = useState(currentBid + 100000)

  return (
    <>
      {/* 3-col layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 380px',
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        {/* ── LEFT: artwork meta ── */}
        <aside
          style={{
            padding: '48px 32px',
            borderRight: '1px solid var(--rule-soft)',
            position: 'sticky',
            top: 60,
            height: 'calc(100vh - 60px)',
            overflowY: 'auto',
            background: 'var(--bone)',
          }}
        >
          {/* Breadcrumb */}
          <div
            className="atelier-label"
            style={{
              marginBottom: 28,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Link href="/buyer" style={{ color: 'var(--ink-mute)' }}>
              DISCOVER
            </Link>
            <span style={{ color: 'var(--ink-mute)' }}>/</span>
            <Link href={`/artists/${artwork.artistId}`} style={{ color: 'var(--ink-mute)' }}>
              {artwork.artistName}
            </Link>
            <span style={{ color: 'var(--ink-mute)' }}>/</span>
            <span style={{ color: 'var(--ink)' }}>{artwork.year}</span>
          </div>

          <div className="atelier-label" style={{ marginBottom: 12 }}>
            #{artwork.id.toUpperCase().slice(0, 8)} · ATELIER 1/1
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 44,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: '0 0 4px',
            }}
          >
            <em style={{ fontStyle: 'italic' }}>{artwork.title}</em>
          </h1>

          <p style={{ fontSize: 13, color: 'var(--ink-mid)', margin: '0 0 24px' }}>
            <Link
              href={`/artists/${artwork.artistId}`}
              style={{
                textDecoration: 'underline',
                textDecorationColor: 'var(--rule)',
                textUnderlineOffset: 4,
              }}
            >
              {artwork.artistName}
            </Link>
            {' '}·{' '}
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              {artwork.artistEnName}
            </span>
            {' '}· {artwork.year}
          </p>

          <dl style={{ display: 'grid', gap: 16, marginTop: 24 }}>
            <div>
              <dt className="atelier-label">Medium · 매체</dt>
              <dd style={{ margin: '4px 0 0', fontSize: 13 }}>{artwork.medium ?? '—'}</dd>
            </div>
            <div>
              <dt className="atelier-label">Dimensions · 크기</dt>
              <dd
                style={{
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                }}
              >
                {artwork.height_cm} × {artwork.width_cm} cm
              </dd>
            </div>
            <div>
              <dt className="atelier-label">Provenance · 출처</dt>
              <dd style={{ margin: '4px 0 0', fontSize: 13 }}>Artist&apos;s studio, Seoul</dd>
            </div>
            <div>
              <dt className="atelier-label">Edition · 에디션</dt>
              <dd style={{ margin: '4px 0 0', fontSize: 13 }}>1 of 1 — unique work</dd>
            </div>
          </dl>

          {artwork.description && (
            <p
              style={{
                marginTop: 24,
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--ink-soft)',
                borderTop: '1px solid var(--rule-soft)',
                paddingTop: 20,
              }}
            >
              {artwork.description}
            </p>
          )}

          <div
            style={{
              marginTop: 32,
              borderTop: '1px solid var(--rule-soft)',
              paddingTop: 20,
              fontSize: 11,
              color: 'var(--ink-mid)',
              display: 'grid',
              gap: 8,
            }}
          >
            <div>· 작가 서명 및 진품 인증서 동봉</div>
            <div>· 무료 픽업 + 보험 적용 항공 운송 가능</div>
            <div>· 7일 이내 컨디션 리포트 보증</div>
          </div>
        </aside>

        {/* ── CENTER: artwork image ── */}
        <div
          style={{
            background: 'var(--bone-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
            position: 'relative',
            minHeight: 720,
          }}
        >
          <div
            style={{
              width: 'min(560px, 80%)',
              aspectRatio: `${artwork.width_cm}/${artwork.height_cm}`,
              background: 'var(--wall)',
              padding: 8,
              boxShadow:
                '0 2px 4px rgba(0,0,0,0.06), 0 18px 30px -22px rgba(0,0,0,0.35)',
              position: 'relative',
            }}
          >
            {artwork.imageUrl ? (
              <Image
                src={artwork.imageUrl}
                alt={`작품 — ${artwork.title}`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 80vw, 560px"
                priority
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, var(--bone-deep) 0%, var(--rule) 100%)',
                }}
              />
            )}
          </div>

          {/* Floor shadow */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60%',
              height: 22,
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.18), transparent 70%)',
              filter: 'blur(2px)',
              pointerEvents: 'none',
            }}
          />

          {/* Dimension label */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 16,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-mid)',
              letterSpacing: '0.16em',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            ← {artwork.width_cm} cm →
          </div>
        </div>

        {/* ── RIGHT: mode tabs + content ── */}
        <aside
          style={{
            borderLeft: '1px solid var(--rule-soft)',
            position: 'sticky',
            top: 60,
            height: 'calc(100vh - 60px)',
            overflowY: 'auto',
            background: 'var(--bone)',
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isAuction ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              borderBottom: '1px solid var(--rule-soft)',
            }}
          >
            {(
              [
                { key: 'info', label: 'Info' },
                ...(isAuction ? [{ key: 'auction', label: 'Auction · Live' }] : []),
                { key: 'room', label: 'In My Room' },
              ] as { key: TabMode; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  padding: '18px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase' as const,
                  color: mode === key ? 'var(--ink)' : 'var(--ink-mid)',
                  borderBottom: mode === key ? '1px solid var(--ink)' : '1px solid transparent',
                  marginBottom: mode === key ? -1 : 0,
                  minHeight: 44,
                  cursor: 'pointer',
                  transition: 'color .12s',
                }}
                aria-selected={mode === key}
                role="tab"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 32, overflowY: 'auto' }}>
            {/* ── INFO tab ── */}
            {mode === 'info' && (
              <div>
                {/* Price line */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div className="atelier-label" style={{ marginBottom: 8 }}>
                      {isAuction ? '현재가 · Current bid' : 'Price · 판매가'}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 44,
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        color: isAuction ? 'var(--live)' : 'var(--ink)',
                      }}
                    >
                      {formatKRW(isAuction ? currentBid : artwork.price)}
                    </div>
                  </div>
                  {!isAuction && (
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--ink-mid)',
                        letterSpacing: '0.16em',
                      }}
                    >
                      VAT incl.
                    </div>
                  )}
                  {isAuction && (
                    <span className="atelier-pill atelier-pill--live">
                      Live · {mockBids.length} 입찰
                    </span>
                  )}
                </div>

                {/* Rows */}
                <div style={{ marginTop: 28 }}>
                  {[
                    { l: 'Status', v: isAuction ? '옥션 진행 중' : '판매 중' },
                    { l: 'Ships from', v: 'Seoul, KR' },
                    { l: 'Delivery', v: '7–14일 (국내) / 14–28일 (해외)' },
                    { l: 'Returns', v: '7일 이내 컨디션 보증' },
                  ].map(({ l, v }) => (
                    <div
                      key={l}
                      style={{
                        padding: '18px 0',
                        borderBottom: '1px solid var(--rule-soft)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                      }}
                    >
                      <span
                        className="atelier-label"
                        style={{ color: 'var(--ink-mid)' }}
                      >
                        {l}
                      </span>
                      <span style={{ fontSize: 13 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
                  {isAuction ? (
                    <>
                      <button
                        className="atelier-btn atelier-btn--live atelier-btn--xl"
                        style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                        onClick={() => setMode('auction')}
                      >
                        옥션 입장 · Enter auction
                      </button>
                      <button
                        className="atelier-btn atelier-btn--ghost"
                        style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                        onClick={() => setMode('room')}
                      >
                        내 공간에 미리보기
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="atelier-btn atelier-btn--xl"
                        style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                        disabled
                        title="준비 중입니다"
                        aria-disabled="true"
                      >
                        구매 · Purchase
                      </button>
                      <p
                        style={{
                          textAlign: 'center',
                          fontSize: 11,
                          color: 'var(--ink-mid)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        준비 중입니다
                      </p>
                      <button
                        className="atelier-btn atelier-btn--ghost"
                        style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                        onClick={() => setMode('room')}
                      >
                        내 공간에 미리보기
                      </button>
                    </>
                  )}
                </div>

                {/* Room mini teaser */}
                <div
                  style={{
                    margin: '24px -32px 0',
                    background: 'var(--bone-deep)',
                    position: 'relative',
                    aspectRatio: '4/3',
                    overflow: 'hidden',
                    borderTop: '1px solid var(--rule-soft)',
                    borderBottom: '1px solid var(--rule-soft)',
                  }}
                >
                  <Image
                    src="https://picsum.photos/seed/atelier-room-living/1600/1200"
                    alt="Room preview"
                    fill
                    className="object-cover"
                    sizes="380px"
                    style={{ filter: 'saturate(0.95) contrast(1.02)' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 12,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--paper)',
                      background: 'rgba(0,0,0,0.55)',
                      padding: '5px 8px',
                      letterSpacing: '0.16em',
                    }}
                  >
                    ROOM PREVIEW · ACTUAL SIZE
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      bottom: 16,
                      background:
                        'color-mix(in srgb, var(--paper) 92%, transparent)',
                      backdropFilter: 'blur(8px)',
                      padding: 14,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div className="atelier-label" style={{ color: 'var(--ink-mid)' }}>
                        Try it on your wall
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 18,
                          marginTop: 2,
                        }}
                      >
                        내 공간 미리보기
                      </div>
                    </div>
                    <Link
                      href={`/artwork/${artwork.id}/preview`}
                      className="atelier-btn atelier-btn--sm"
                      style={{ minHeight: 44 }}
                    >
                      Open →
                    </Link>
                  </div>
                </div>

                {/* Email preview button */}
                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: '1px solid var(--rule-soft)',
                  }}
                >
                  <button
                    className="atelier-btn atelier-btn--ghost atelier-btn--sm"
                    style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                    onClick={() => {
                      setEmailType(isAuction ? 'auction-end' : 'purchase')
                      setEmailModalOpen(true)
                    }}
                  >
                    {isAuction ? '옥션 종료 이메일 미리보기' : '구매 완료 이메일 미리보기'}
                  </button>
                </div>
              </div>
            )}

            {/* ── AUCTION tab ── */}
            {mode === 'auction' && isAuction && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span className="atelier-pill atelier-pill--live">Live · 진행중</span>
                  <span className="atelier-label">Lot #{artwork.id.toUpperCase().slice(0, 8)}</span>
                </div>

                {/* Current bid */}
                <div style={{ marginTop: 14 }}>
                  <div className="atelier-label" style={{ marginBottom: 6 }}>
                    현재가 · Current bid
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 44,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      color: 'var(--live)',
                    }}
                  >
                    {formatKRW(currentBid)}
                  </div>
                  <div className="atelier-label" style={{ marginTop: 6 }}>
                    by {mockBids[0]?.user ?? '—'}
                  </div>
                </div>

                {/* Meta grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1,
                    background: 'var(--rule-soft)',
                    margin: '24px -32px 0',
                  }}
                >
                  {/* Countdown */}
                  <div
                    style={{ background: 'var(--paper)', padding: '18px 32px' }}
                  >
                    <div className="atelier-label">남은 시간</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 22,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        marginTop: 6,
                        color: 'var(--live)',
                      }}
                    >
                      <CountdownTimer endsAt={artwork.auction_ends_at} />
                    </div>
                  </div>
                  {/* Bid count */}
                  <div style={{ background: 'var(--paper)', padding: '18px 32px' }}>
                    <div className="atelier-label">입찰 · Bids</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 28,
                        marginTop: 6,
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {mockBids.length}
                    </div>
                  </div>
                  {/* Start bid */}
                  <div style={{ background: 'var(--paper)', padding: '18px 32px' }}>
                    <div className="atelier-label">시작가</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 18,
                        marginTop: 6,
                      }}
                    >
                      {formatKRW(startBid)}
                    </div>
                  </div>
                  {/* Estimate */}
                  <div style={{ background: 'var(--paper)', padding: '18px 32px' }}>
                    <div className="atelier-label">예상가</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        marginTop: 6,
                        color: 'var(--ink-mid)',
                      }}
                    >
                      {formatKRW(Math.round(startBid * 1.5))}
                      <br />— {formatKRW(Math.round(startBid * 2.2))}
                    </div>
                  </div>
                </div>

                {/* Bid input (disabled — 준비 중) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 0,
                    marginTop: 18,
                    border: '1px solid var(--ink)',
                    opacity: 0.5,
                  }}
                  title="준비 중입니다"
                  aria-label="입찰 입력 (준비 중)"
                >
                  <input
                    type="number"
                    value={bidAmt}
                    step={100000}
                    min={currentBid + 100000}
                    onChange={(e) => setBidAmt(parseInt(e.target.value || '0', 10))}
                    disabled
                    aria-disabled="true"
                    style={{
                      border: 0,
                      padding: '16px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 18,
                      background: 'transparent',
                      outline: 'none',
                      color: 'var(--ink)',
                    }}
                  />
                  <button
                    disabled
                    aria-disabled="true"
                    style={{
                      background: 'var(--live)',
                      color: 'var(--paper)',
                      padding: '0 22px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase' as const,
                      fontWeight: 600,
                      cursor: 'not-allowed',
                    }}
                  >
                    입찰하기
                  </button>
                </div>

                {/* Quick bids */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {[0, 100000, 200000, 500000].map((inc) => (
                    <button
                      key={inc}
                      disabled
                      title="준비 중입니다"
                      aria-disabled="true"
                      style={{
                        padding: '8px 12px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.06em',
                        border: '1px solid var(--rule)',
                        background: 'var(--paper)',
                        cursor: 'not-allowed',
                        opacity: 0.5,
                        minHeight: 44,
                      }}
                    >
                      +{((currentBid + 100000 + inc) / 10000).toFixed(0)}만
                    </button>
                  ))}
                </div>

                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: 'var(--ink-mid)',
                    marginTop: 8,
                  }}
                >
                  입찰 기능 준비 중입니다 · 최소 입찰 단위 ₩100,000
                </p>

                {/* Bid history */}
                <div
                  style={{
                    paddingTop: 24,
                    display: 'grid',
                    gap: 0,
                    maxHeight: 240,
                    overflow: 'auto',
                    borderTop: '1px solid var(--rule-soft)',
                    marginTop: 24,
                    scrollbarWidth: 'thin',
                  }}
                >
                  {mockBids.map((b, i) => (
                    <div
                      key={`${i}-${b.user}-${b.amt}`}
                      className="bid-row-animate"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr auto auto',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px dashed var(--rule-soft)',
                        fontSize: 12,
                        alignItems: 'center',
                        background:
                          i === 0
                            ? 'color-mix(in srgb, var(--ink) 4%, transparent)'
                            : 'transparent',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '999px',
                          background: 'var(--bone-deep)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--ink-soft)',
                        }}
                      >
                        {b.user[0].toUpperCase()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)' }}>
                        {b.user}
                        {i === 0 && (
                          <span
                            style={{
                              color: 'var(--live)',
                              marginLeft: 6,
                              fontFamily: 'var(--font-mono)',
                              fontSize: 9,
                            }}
                          >
                            · LEADER
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {i === 0 && (
                          <span style={{ color: 'var(--live)', marginRight: 2 }}>▲ </span>
                        )}
                        {formatKRW(b.amt)}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--ink-mute)',
                        }}
                      >
                        {b.ago}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--rule-soft)',
                    marginTop: 18,
                    paddingTop: 18,
                  }}
                >
                  <button
                    className="atelier-btn atelier-btn--ghost atelier-btn--sm"
                    style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                    onClick={() => setMode('room')}
                  >
                    내 공간에 미리보기
                  </button>
                </div>

                <div
                  className="atelier-label"
                  style={{ marginTop: 18, lineHeight: 1.7, color: 'var(--ink-mid)' }}
                >
                  · 옥션 종료 시 자동 결제 · 이메일 통지
                  <br />
                  · 낙찰 후 7일 이내 컨디션 보증
                  <br />· 종료 5분 전 입찰 시 5분 자동 연장
                </div>

                {/* Email preview */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--rule-soft)' }}>
                  <button
                    className="atelier-btn atelier-btn--ghost atelier-btn--sm"
                    style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                    onClick={() => {
                      setEmailType('auction-end')
                      setEmailModalOpen(true)
                    }}
                  >
                    옥션 종료 이메일 미리보기
                  </button>
                </div>
              </div>
            )}

            {/* ── IN MY ROOM tab ── */}
            {mode === 'room' && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  See <em style={{ fontStyle: 'italic' }}>{artwork.title}</em>
                  <br />
                  on your wall.
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--ink-soft)',
                    marginTop: 14,
                    lineHeight: 1.65,
                  }}
                >
                  내 공간 사진을 올리면 AI가 벽의 각도와 원근을 인식해 작품을 실제 크기(
                  {artwork.height_cm}×{artwork.width_cm} cm)로 합성합니다. 프리셋 룸으로 먼저
                  살펴볼 수도 있어요.
                </p>

                {/* 4 preset room thumbnails */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8,
                    marginTop: 20,
                  }}
                >
                  {[
                    { seed: 'atelier-room-living', label: 'LIVING' },
                    { seed: 'atelier-room-bedroom', label: 'BEDROOM' },
                    { seed: 'atelier-room-studio', label: 'STUDIO' },
                    { seed: 'atelier-room-loft', label: 'LOFT' },
                  ].map(({ seed, label }) => (
                    <div key={seed} style={{ aspectRatio: '4/3', position: 'relative', overflow: 'hidden' }}>
                      <Image
                        src={`https://picsum.photos/seed/${seed}/400/300`}
                        alt={`${label} preset`}
                        fill
                        className="object-cover"
                        sizes="90px"
                        style={{ filter: 'saturate(0.85)' }}
                      />
                      <div
                        className="atelier-label"
                        style={{
                          position: 'absolute',
                          left: 4,
                          bottom: 4,
                          color: 'var(--paper)',
                          background: 'rgba(0,0,0,0.55)',
                          padding: '2px 5px',
                          fontSize: 8,
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/artwork/${artwork.id}/preview`}
                  className="atelier-btn atelier-btn--xl"
                  style={{ display: 'flex', width: '100%', justifyContent: 'center', marginTop: 16, minHeight: 44 }}
                >
                  내 사진으로 보기 →
                </Link>

                <div className="atelier-label" style={{ marginTop: 20, color: 'var(--ink-mid)', lineHeight: 1.7 }}>
                  · 평면 · 원근 (살짝 옆에서) 두 가지 뷰
                  <br />
                  · 가구와 사이즈 비교
                  <br />· 내 사진 업로드 · 4개 프리셋 룸
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Email modal */}
      {emailModalOpen && (
        <EmailModal
          type={emailType}
          artwork={{
            id: artwork.id,
            title: artwork.title,
            width_cm: artwork.width_cm,
            height_cm: artwork.height_cm,
            price: artwork.price,
            imageUrl: artwork.imageUrl,
            artistName: artwork.artistName,
            year: artwork.year,
            medium: artwork.medium,
          }}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
    </>
  )
}
