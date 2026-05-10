'use client'

import { useActionState, useRef } from 'react'
import Image from 'next/image'
import { generateMockup, type MockupState } from '@/actions/mockup'

type ArtworkPreviewInfo = {
  id: string
  title: string
  width_cm: number
  height_cm: number
  imageUrl: string | null
}

type Props = {
  artwork: ArtworkPreviewInfo
}

const initialState: MockupState = { status: 'idle' }

export function PreviewClient({ artwork }: Props) {
  const [state, formAction, isPending] = useActionState(generateMockup, initialState)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-8">
      {/* Error alert */}
      {state.status === 'error' && (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 text-[14px]"
          style={{
            background: 'color-mix(in oklch, var(--color-destructive) 12%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-destructive) 40%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          {state.error}
        </div>
      )}

      {/* Form card */}
      <div
        className="rounded-xl p-6 flex flex-col gap-6"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Artwork thumbnail + title */}
        <div className="flex items-center gap-4">
          {artwork.imageUrl && (
            <div
              className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0"
              style={{ background: 'var(--color-border)' }}
            >
              <Image
                src={artwork.imageUrl}
                alt={`작품 — ${artwork.title}`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {artwork.title}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
              가로 {artwork.width_cm}cm × 세로 {artwork.height_cm}cm
            </p>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-5">
          {/* Hidden artwork ID */}
          <input type="hidden" name="artworkId" value={artwork.id} />

          {/* Room image upload */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="roomImage"
              className="text-[14px] font-medium"
              style={{ color: 'var(--color-foreground)' }}
            >
              방 사진 업로드
            </label>
            <input
              ref={fileInputRef}
              id="roomImage"
              name="roomImage"
              type="file"
              accept="image/*"
              required
              className="block w-full min-h-[44px] rounded-lg px-3 py-2 text-[14px] cursor-pointer focus:outline-none focus-visible:ring-2"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              aria-describedby="roomImage-hint"
            />
            <p
              id="roomImage-hint"
              className="text-[12px]"
              style={{ color: 'var(--color-muted)' }}
            >
              JPG/PNG, 10MB 이하 — 작품을 걸 벽이 잘 보이는 사진을 사용해 주세요.
            </p>
          </div>

          {/* Wall width input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="roomWidthCm"
              className="text-[14px] font-medium"
              style={{ color: 'var(--color-foreground)' }}
            >
              벽 폭 (cm)
            </label>
            <input
              id="roomWidthCm"
              name="roomWidthCm"
              type="number"
              min={50}
              max={1000}
              defaultValue={300}
              required
              className="block w-full h-11 rounded-lg px-3 text-[14px] focus:outline-none focus-visible:ring-2"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              aria-describedby="roomWidthCm-hint"
            />
            <p
              id="roomWidthCm-hint"
              className="text-[12px]"
              style={{ color: 'var(--color-muted)' }}
            >
              사진에 보이는 벽의 실제 가로 길이를 입력해 주세요.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 rounded-lg text-[14px] font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2"
            style={{
              background: 'var(--color-accent)',
              color: '#ffffff',
            }}
          >
            {isPending ? '합성 중...' : '합성 미리보기 생성'}
          </button>
        </form>
      </div>

      {/* Result area */}
      {state.status === 'success' && (
        <div className="flex flex-col gap-4">
          {/* Scale warning */}
          {state.warning && (
            <div
              role="note"
              className="rounded-lg px-4 py-3 text-[13px]"
              style={{
                background: '#fefce8',
                border: '1px solid #fde68a',
                color: '#92400e',
              }}
            >
              {state.warning}
            </div>
          )}

          {/* Composite image */}
          <div
            className="relative w-full rounded-xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.url}
              alt="내 공간 미리보기 합성 결과"
              className="w-full object-contain"
              style={{ maxHeight: '80vh', display: 'block' }}
            />
          </div>

          {/* Meta info */}
          <p className="text-[12px] text-center" style={{ color: 'var(--color-muted)' }}>
            원본 작품 크기: {artwork.width_cm}cm × {artwork.height_cm}cm
            &nbsp;·&nbsp;합성 결과 픽셀: {state.meta.artworkPxW} × {state.meta.artworkPxH}
          </p>

          {/* Save hint */}
          <p className="text-[12px] text-center" style={{ color: 'var(--color-muted)' }}>
            이미지 위에 우클릭(또는 길게 눌러) 저장하실 수 있습니다.
          </p>
        </div>
      )}
    </div>
  )
}
