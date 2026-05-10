'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction, type AuthState } from '@/actions/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    loginAction,
    undefined,
  )

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-background)' }}
    >
      <Link
        href="/"
        className="text-2xl font-semibold mb-8"
        style={{ color: 'var(--color-foreground)' }}
      >
        ArtBridge
      </Link>

      <div
        className="w-full max-w-sm rounded-xl p-6 sm:p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h1 className="text-[20px] font-semibold leading-[1.3] mb-6"
          style={{ color: 'var(--color-foreground)' }}>
          로그인
        </h1>

        {state?.error && (
          <Alert
            role="alert"
            aria-live="assertive"
            className="mb-4 border-l-4"
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-[14px] font-semibold"
              style={{ color: 'var(--color-foreground)' }}>
              이메일
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="you@example.com"
              className="h-10 text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-[14px] font-semibold"
              style={{ color: 'var(--color-foreground)' }}>
              비밀번호
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="비밀번호를 입력하세요"
              className="h-10 text-base"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 text-[14px] font-semibold mt-1"
            style={{ background: 'var(--color-accent)', color: '#ffffff' }}
          >
            {isPending ? '로그인 중…' : '로그인하기'}
          </Button>
        </form>

        <p className="mt-5 text-center text-[14px]"
          style={{ color: 'var(--color-muted)' }}>
          계정이 없으신가요?{' '}
          <Link
            href="/signup"
            className="font-semibold underline underline-offset-2"
            style={{ color: 'var(--color-foreground)' }}
          >
            회원가입
          </Link>
        </p>
      </div>
    </main>
  )
}
