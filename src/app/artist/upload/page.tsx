'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadArtwork, type ArtworkState } from '@/actions/artwork'

export default function ArtistUploadPage() {
  const [state, formAction, isPending] = useActionState<ArtworkState, FormData>(
    uploadArtwork,
    undefined,
  )

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="w-full max-w-lg">
        {/* Back link */}
        <Link
          href="/artist"
          className="inline-block mb-6 text-[14px]"
          style={{ color: 'var(--color-muted)' }}
        >
          ← 내 작품으로
        </Link>

        <div
          className="rounded-xl p-6 sm:p-8"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h1
            className="text-[20px] font-semibold leading-[1.3] mb-6"
            style={{ color: 'var(--color-foreground)' }}
          >
            작품 등록
          </h1>

          {state?.error && (
            <Alert
              role="alert"
              aria-live="assertive"
              className="mb-5 border-l-4"
              style={{
                background: 'var(--color-destructive-muted)',
                borderLeftColor: 'var(--color-destructive)',
                color: 'var(--color-destructive)',
              }}
            >
              <AlertDescription style={{ color: 'var(--color-destructive)' }}>
                {state.error}
              </AlertDescription>
            </Alert>
          )}

          <form action={formAction} className="flex flex-col gap-5">
            {/* Image file */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="image" className="text-[14px] font-semibold"
                style={{ color: 'var(--color-foreground)' }}>
                이미지 파일
              </Label>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                required
                className="h-10 text-base cursor-pointer"
              />
              <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
                JPG / PNG / WebP, 25MB 이하
              </p>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="text-[14px] font-semibold"
                style={{ color: 'var(--color-foreground)' }}>
                제목
              </Label>
              <Input
                id="title"
                name="title"
                type="text"
                maxLength={120}
                required
                placeholder="작품 제목을 입력하세요"
                className="h-10 text-base"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description" className="text-[14px] font-semibold"
                style={{ color: 'var(--color-foreground)' }}>
                설명 <span className="font-normal" style={{ color: 'var(--color-muted)' }}>(선택)</span>
              </Label>
              <textarea
                id="description"
                name="description"
                maxLength={500}
                rows={4}
                placeholder="작품에 대한 설명을 입력하세요"
                className="w-full rounded-lg border px-3 py-2 text-base resize-none outline-none transition-colors focus-visible:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-foreground)',
                }}
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="width_cm" className="text-[14px] font-semibold"
                  style={{ color: 'var(--color-foreground)' }}>
                  가로 (cm)
                </Label>
                <Input
                  id="width_cm"
                  name="width_cm"
                  type="number"
                  min={0.1}
                  max={1000}
                  step={0.1}
                  required
                  placeholder="예: 60"
                  className="h-10 text-base"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="height_cm" className="text-[14px] font-semibold"
                  style={{ color: 'var(--color-foreground)' }}>
                  세로 (cm)
                </Label>
                <Input
                  id="height_cm"
                  name="height_cm"
                  type="number"
                  min={0.1}
                  max={1000}
                  step={0.1}
                  required
                  placeholder="예: 90"
                  className="h-10 text-base"
                />
              </div>
            </div>

            {/* Sale type */}
            <div className="flex flex-col gap-2">
              <span className="text-[14px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
                판매 방식
              </span>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    name="sale_type"
                    value="fixed"
                    defaultChecked
                    className="accent-[var(--color-accent)] w-4 h-4"
                  />
                  <span className="text-[14px]" style={{ color: 'var(--color-foreground)' }}>정찰제</span>
                </label>
                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    name="sale_type"
                    value="auction"
                    className="accent-[var(--color-accent)] w-4 h-4"
                  />
                  <span className="text-[14px]" style={{ color: 'var(--color-foreground)' }}>경매</span>
                </label>
              </div>
            </div>

            {/* Price */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="price" className="text-[14px] font-semibold"
                style={{ color: 'var(--color-foreground)' }}>
                가격
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={1000}
                  step={1}
                  required
                  placeholder="예: 500000"
                  className="h-10 text-base pr-8"
                />
                <span
                  className="absolute right-3 text-[14px]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  원
                </span>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 text-[14px] font-semibold mt-2"
              style={{ background: 'var(--color-accent)', color: '#ffffff' }}
            >
              {isPending ? '등록 중…' : '등록하기'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
