import Link from 'next/link'
import { logoutAction } from '@/actions/auth'

type BuyerHeaderProps = {
  email?: string
  activePath?: string
}

export function BuyerHeader({ email, activePath }: BuyerHeaderProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '18px 32px',
        background: 'color-mix(in srgb, var(--bone) 88%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--rule-soft)',
      }}
    >
      {/* Left: wordmark */}
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          color: 'var(--ink)',
        }}
      >
        ATELIER
        <sup
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            color: 'var(--ink-mid)',
            top: -10,
            position: 'relative',
          }}
        >
          1/1
        </sup>
      </Link>

      {/* Center: nav */}
      <nav
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          justifySelf: 'center',
        }}
      >
        {(
          [
            { href: '/buyer', label: 'DISCOVER' },
            { href: '/buyer#artists', label: 'ARTISTS' },
          ] as { href: string; label: string }[]
        ).map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--ink)',
              padding: '6px 0',
              position: 'relative',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase' as const,
              textDecoration: activePath === href ? 'underline' : 'none',
              textDecorationColor: 'var(--ink)',
              textUnderlineOffset: 4,
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Right: email + logout */}
      <div
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          justifySelf: 'end',
          fontSize: 12,
        }}
      >
        {email && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-mid)',
              letterSpacing: '0.04em',
              display: 'none',
            }}
            className="sm:block"
          >
            {email}
          </span>
        )}
        {email ? (
          <form action={logoutAction} style={{ display: 'flex' }}>
            <button
              type="submit"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-mid)',
                padding: '6px 0',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="로그아웃"
            >
              로그아웃
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-mid)',
              padding: '6px 0',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  )
}
