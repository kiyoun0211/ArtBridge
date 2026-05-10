import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/actions/auth'

type HeaderProps = {
  email?: string
  role?: 'artist' | 'buyer'
}

export function Header({ email, role }: HeaderProps) {
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
        {/* Role-specific navigation links */}
        {role === 'artist' && (
          <Link
            href="/artist/upload"
            className="hidden sm:inline text-[14px] font-medium min-h-[44px] flex items-center px-2"
            style={{ color: 'var(--color-foreground)' }}
          >
            작품 등록
          </Link>
        )}
        {role === 'buyer' && (
          <Link
            href="/buyer"
            className="hidden sm:inline text-[14px] font-medium min-h-[44px] flex items-center px-2"
            style={{ color: 'var(--color-foreground)' }}
          >
            둘러보기
          </Link>
        )}

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
