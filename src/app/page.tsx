import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-xl w-full text-center">
        {/* Wordmark */}
        <p className="text-2xl font-semibold mb-20">ArtBridge</p>

        {/* Hero */}
        <h1 className="text-[32px] font-semibold leading-[1.2] mb-4">
          내 공간에서 만나는 원화
        </h1>
        <p className="text-base leading-relaxed mb-12 text-muted-foreground">
          작가와 직접 연결되는 AI 미술 작품 플랫폼
        </p>

        {/* CTAs — using buttonVariants for consistent button styling on Link elements */}
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'min-h-[44px]')}
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-[44px]')}
          >
            회원가입
          </Link>
        </div>
      </div>
    </main>
  )
}
