import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export function Header() {
  return (
    <header
      className="w-full h-14 flex items-center justify-between px-4 md:px-6"
      style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
    >
      {/* Wordmark */}
      <Link
        href="/"
        className="text-xl font-semibold"
        style={{ color: 'var(--color-foreground)' }}
      >
        ArtBridge
      </Link>

      {/* Logout — routes to / with no Server Action in UI-only mode */}
      <Link
        href="/"
        className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-[44px] text-sm font-semibold')}
      >
        로그아웃
      </Link>
    </header>
  )
}
