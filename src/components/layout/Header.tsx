import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/actions/auth'

export function Header({ email }: { email?: string }) {
  return (
    <header
      className="w-full h-14 flex items-center justify-between px-4 md:px-6"
      style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
    >
      <Link
        href="/"
        className="text-xl font-semibold"
        style={{ color: 'var(--color-foreground)' }}
      >
        ArtBridge
      </Link>

      <div className="flex items-center gap-3">
        {email && (
          <span
            className="hidden sm:inline text-[14px]"
            style={{ color: 'var(--color-muted)' }}
          >
            {email}
          </span>
        )}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="min-h-[44px] text-sm font-semibold"
          >
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  )
}
