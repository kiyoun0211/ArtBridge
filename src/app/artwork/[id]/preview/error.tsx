'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function PreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[preview/error]', error)
  }, [error])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8 flex flex-col gap-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <h1 className="text-[20px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
          문제가 발생했습니다
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          미리보기 합성 중에 오류가 발생했습니다. 잠시 후 다시 시도하시거나 다른 사진으로 시도해 주세요.
        </p>
        {error.message && (
          <pre
            className="text-[12px] rounded p-3 overflow-x-auto whitespace-pre-wrap break-all"
            style={{
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ''}
          </pre>
        )}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 h-11 rounded-lg text-[14px] font-semibold"
            style={{ background: 'var(--color-accent)', color: '#ffffff' }}
          >
            다시 시도
          </button>
          <Link
            href="/buyer"
            className="flex-1 h-11 rounded-lg flex items-center justify-center text-[14px] font-semibold"
            style={{
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          >
            둘러보기로
          </Link>
        </div>
      </div>
    </main>
  )
}
