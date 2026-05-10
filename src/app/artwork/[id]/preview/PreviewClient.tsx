'use client'

import { useActionState, useRef, useState } from 'react'
import Image from 'next/image'
import { generateMockup, type MockupState } from '@/actions/mockup'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILE_SIZE_MB = 10

type ArtworkPreviewInfo = {
  id: string
  title: string
  width_cm: number
  height_cm: number
  imageUrl: string | null
  artistName: string
  price: number | null
}

type Props = {
  artwork: ArtworkPreviewInfo
}

const initialState: MockupState = { status: 'idle' }

type PresetRoom = 'living' | 'bedroom' | 'studio' | 'loft'

const PRESETS: Array<{ id: PresetRoom; label: string; seed: string }> = [
  { id: 'living', label: 'LIVING', seed: 'atelier-room-living' },
  { id: 'bedroom', label: 'BEDROOM', seed: 'atelier-room-bedroom' },
  { id: 'studio', label: 'STUDIO', seed: 'atelier-room-studio' },
  { id: 'loft', label: 'LOFT', seed: 'atelier-room-loft' },
]

function formatKRW(price: number | null | undefined): string {
  if (price == null) return '가격 미정'
  return `₩${new Intl.NumberFormat('ko-KR').format(price)}`
}

export function PreviewClient({ artwork }: Props) {
  const [state, formAction, isPending] = useActionState(generateMockup, initialState)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  // Controls state
  const [selectedPreset, setSelectedPreset] = useState<PresetRoom | null>('living')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [view, setView] = useState<'flat' | 'perspective'>('flat')
  const [roomWidthCm, setRoomWidthCm] = useState(300)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [showSilhouette, setShowSilhouette] = useState(false)
  const [showGuides, setShowGuides] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setClientError(null)
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1)
      setClientError(
        `사진이 너무 큽니다 (${mb}MB). ${MAX_FILE_SIZE_MB}MB 이하로 줄여서 다시 올려주세요.`,
      )
      e.target.value = ''
      return
    }
    setUploadedFile(file)
    setSelectedPreset(null)
  }

  function handlePresetSelect(preset: PresetRoom) {
    setSelectedPreset(preset)
    setUploadedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setClientError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setClientError(`사진이 너무 큽니다. ${MAX_FILE_SIZE_MB}MB 이하로 줄여서 다시 올려주세요.`)
      return
    }
    setUploadedFile(file)
    setSelectedPreset(null)
    setClientError(null)
    // Inject into the file input (for form submission)
    if (fileInputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      fileInputRef.current.files = dt.files
    }
  }

  const errorMessage = clientError ?? (state.status === 'error' ? state.error : null)

  // Determine active room image for preview display
  const activeRoomUrl =
    uploadedFile
      ? URL.createObjectURL(uploadedFile)
      : selectedPreset
        ? `https://picsum.photos/seed/atelier-room-${selectedPreset}/1600/1200`
        : null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        minHeight: 'calc(100vh - 60px)',
      }}
    >
      {/* ── LEFT: Preview canvas ── */}
      <div
        style={{
          position: 'relative',
          background: '#0E0C0A',
          overflow: 'hidden',
          minHeight: 600,
        }}
      >
        {/* Room photo */}
        {activeRoomUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url('${activeRoomUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'saturate(0.95) contrast(1.02)',
            }}
          />
        )}

        {/* AI guidelines overlay */}
        {showGuides && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <rect
                x="18" y="8" width="62" height="72"
                fill="none"
                stroke="rgba(178,58,31,0.7)"
                strokeWidth="0.2"
                strokeDasharray="0.6 0.4"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: '18%',
                top: '5%',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.16em',
              }}
            >
              WALL · {roomWidthCm} cm
            </div>
          </div>
        )}

        {/* HUD */}
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 24,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--paper)',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            padding: '8px 12px',
            display: 'grid',
            gap: 4,
            zIndex: 10,
          }}
        >
          <strong style={{ color: '#E0D6BC', fontWeight: 500 }}>SCENE</strong>
          <div>ROOM · {selectedPreset ? selectedPreset.toUpperCase() : uploadedFile ? '내 공간' : '—'}</div>
          <div>VIEW · {view === 'flat' ? 'PLAN-ON / 평면' : 'OBLIQUE / 원근'}</div>
          <div>
            WORK · {artwork.height_cm}×{artwork.width_cm} cm
          </div>
          <div>WALL · {roomWidthCm} cm</div>
        </div>

        {/* Result composite image — shown after generation */}
        {state.status === 'success' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.url}
              alt="내 공간 미리보기 합성 결과"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Idle placeholder */}
        {state.status === 'idle' && !activeRoomUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.16em' }}>
              STEP 01 · 프리셋 룸을 선택하거나 사진을 업로드하세요
            </div>
          </div>
        )}

        {/* Scale reference — bottom right */}
        {showSilhouette && (
          <div
            style={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              display: 'flex',
              gap: 14,
              alignItems: 'end',
              color: 'var(--paper)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <span>≈ 170 cm</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>HUMAN REFERENCE</span>
            </div>
            <div
              style={{
                width: 38,
                height: 168,
                background: 'rgba(255,255,255,0.55)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  top: 0,
                  height: 14,
                  background: 'rgba(255,255,255,0.55)',
                  borderRadius: '50%',
                  width: 22,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Controls panel ── */}
      <aside
        style={{
          background: 'var(--paper)',
          borderLeft: '1px solid var(--rule-soft)',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          overflowY: 'auto',
          height: 'calc(100vh - 60px)',
          position: 'sticky',
          top: 60,
        }}
      >
        <form ref={formRef} action={formAction}>
          {/* Hidden fields */}
          <input type="hidden" name="artworkId" value={artwork.id} />
          <input type="hidden" name="presetRoom" value={selectedPreset ?? ''} />
          <input type="hidden" name="offsetX" value={offsetX} />
          <input type="hidden" name="offsetY" value={offsetY} />
          <input type="hidden" name="showSilhouette" value={showSilhouette ? 'true' : 'false'} />

          {/* ── Step 01: Pick a scene ── */}
          <div>
            <div className="atelier-label">Step 01 · Pick a scene</div>

            {/* Preset row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                marginTop: 12,
              }}
            >
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id)}
                  aria-pressed={selectedPreset === p.id}
                  aria-label={`${p.label} 프리셋 룸`}
                  style={{
                    aspectRatio: '4/3',
                    backgroundImage: `url('https://picsum.photos/seed/${p.seed}/400/300')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: selectedPreset === p.id ? '2px solid var(--ink)' : '2px solid transparent',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 0,
                    minHeight: 44,
                  }}
                >
                  <span
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
                    {p.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Upload drop zone */}
            <div
              style={{
                border: '1px dashed var(--rule)',
                background: uploadedFile ? 'color-mix(in srgb, var(--ink) 4%, var(--bone-soft))' : 'var(--bone-soft)',
                padding: 24,
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--ink-mid)',
                cursor: 'pointer',
                display: 'grid',
                gap: 8,
                marginTop: 12,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="내 공간 사진 업로드"
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: 'var(--ink)',
                  fontWeight: 400,
                }}
              >
                {uploadedFile ? `✓ ${uploadedFile.name}` : '내 공간 사진 업로드'}
              </div>
              <div>드래그 또는 클릭 · JPG, PNG (10MB 이하)</div>
              <input
                ref={fileInputRef}
                id="roomImage"
                name="roomImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                aria-label="방 사진 파일 선택"
              />
            </div>
          </div>

          {/* ── Step 02: View ── */}
          <div>
            <div className="atelier-label">Step 02 · View</div>
            <div className="atelier-toggle" style={{ marginTop: 10 }}>
              <button
                type="button"
                className={view === 'flat' ? 'is-on' : ''}
                onClick={() => setView('flat')}
                aria-pressed={view === 'flat'}
                style={{ minHeight: 44 }}
              >
                평면 · Plan-on
              </button>
              <button
                type="button"
                className={view === 'perspective' ? 'is-on' : ''}
                onClick={() => setView('perspective')}
                aria-pressed={view === 'perspective'}
                style={{ minHeight: 44 }}
              >
                원근 · Oblique
              </button>
            </div>
          </div>

          {/* ── Step 03: Wall width ── */}
          <div>
            <label htmlFor="roomWidthCm" className="atelier-label">
              Step 03 · 벽 폭 (cm)
            </label>
            <input
              id="roomWidthCm"
              name="roomWidthCm"
              type="number"
              min={50}
              max={1000}
              value={roomWidthCm}
              onChange={(e) => setRoomWidthCm(Number(e.target.value))}
              required
              style={{
                display: 'block',
                width: '100%',
                height: 44,
                marginTop: 10,
                padding: '0 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                background: 'var(--bone-soft)',
                border: '1px solid var(--rule)',
                outline: 'none',
                color: 'var(--ink)',
              }}
            />
            <div className="atelier-label" style={{ marginTop: 6, color: 'var(--ink-mid)' }}>
              사진에 보이는 벽의 실제 가로 길이
            </div>
          </div>

          {/* ── Step 04: Position ── */}
          <div>
            <div className="atelier-label">Step 04 · Position</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
              <div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={Math.round(offsetX * 100)}
                  onChange={(e) => setOffsetX(Number(e.target.value) / 100)}
                  className="atelier-range"
                  aria-label="가로 위치 조정"
                />
                <div className="atelier-label" style={{ marginTop: 6 }}>
                  가로 · {offsetX >= 0 ? '+' : ''}{Math.round(offsetX * 100)}%
                </div>
              </div>
              <div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  value={Math.round(offsetY * 100)}
                  onChange={(e) => setOffsetY(Number(e.target.value) / 100)}
                  className="atelier-range"
                  aria-label="세로 위치 조정"
                />
                <div className="atelier-label" style={{ marginTop: 6 }}>
                  세로 · {offsetY >= 0 ? '+' : ''}{Math.round(offsetY * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* ── Toggles ── */}
          <div
            style={{
              paddingTop: 8,
              borderTop: '1px solid var(--rule-soft)',
              display: 'grid',
              gap: 12,
            }}
          >
            <label style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', minHeight: 44 }}>
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
                style={{ width: 16, height: 16 }}
                aria-label="AI 가이드라인 표시"
              />
              가이드라인 · AI detected wall
            </label>
            <label style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', minHeight: 44 }}>
              <input
                type="checkbox"
                checked={showSilhouette}
                onChange={(e) => setShowSilhouette(e.target.checked)}
                style={{ width: 16, height: 16 }}
                aria-label="170cm 사람 비교 표시"
              />
              170cm 사람 비교 · Human reference
            </label>
          </div>

          {/* ── Error ── */}
          {errorMessage && (
            <div
              role="alert"
              style={{
                background: 'color-mix(in srgb, var(--live) 8%, var(--paper))',
                border: '1px solid var(--live-soft)',
                color: 'var(--live)',
                padding: '12px 14px',
                fontSize: 13,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* ── Scale warning ── */}
          {state.status === 'success' && state.warning && (
            <div
              role="note"
              style={{
                background: '#fefce8',
                border: '1px solid #fde68a',
                color: '#92400e',
                padding: '12px 14px',
                fontSize: 13,
              }}
            >
              {state.warning}
            </div>
          )}

          {/* ── Generate button ── */}
          <button
            type="submit"
            disabled={isPending || (!selectedPreset && !uploadedFile)}
            className="atelier-btn atelier-btn--xl"
            style={{
              width: '100%',
              justifyContent: 'center',
              minHeight: 44,
              opacity: isPending || (!selectedPreset && !uploadedFile) ? 0.45 : 1,
              cursor: isPending || (!selectedPreset && !uploadedFile) ? 'not-allowed' : 'pointer',
            }}
            aria-disabled={isPending || (!selectedPreset && !uploadedFile)}
          >
            {isPending ? '합성 중...' : 'AI 합성 미리보기 생성'}
          </button>
        </form>

        {/* ── Artwork info (bottom of panel) ── */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 24,
            borderTop: '1px solid var(--rule-soft)',
            display: 'grid',
            gap: 10,
          }}
        >
          <div className="atelier-label">작품 정보</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontStyle: 'italic',
              lineHeight: 1.1,
            }}
          >
            {artwork.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-mid)' }}>
            {artwork.artistName} · {artwork.width_cm} × {artwork.height_cm} cm
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {formatKRW(artwork.price)}
          </div>

          {/* Meta info when result available */}
          {state.status === 'success' && (
            <>
              <div className="atelier-label" style={{ color: 'var(--ink-mid)', marginTop: 8 }}>
                합성 결과: {state.meta.artworkPxW} × {state.meta.artworkPxH} px
              </div>
              <p className="atelier-label" style={{ color: 'var(--ink-mid)' }}>
                이미지 위에 우클릭(또는 길게 눌러) 저장하실 수 있습니다.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
