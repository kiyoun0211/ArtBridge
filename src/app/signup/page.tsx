'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const signupSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해 주세요.')
    .email('올바른 이메일 형식을 입력해 주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.'),
  role: z.enum(['artist', 'buyer'], {
    error: '계정 유형을 선택해 주세요.',
  }),
})

type SignupValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [demoAlert, setDemoAlert] = useState(false)

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      role: undefined,
    },
  })

  const role = form.watch('role')

  function onSubmit(_values: SignupValues) {
    setDemoAlert(true)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-background)' }}>
      {/* Wordmark */}
      <Link
        href="/"
        className="text-2xl font-semibold mb-8"
        style={{ color: 'var(--color-foreground)' }}
      >
        ArtBridge
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-xl p-6 sm:p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h1 className="text-[20px] font-semibold leading-[1.3] mb-6"
          style={{ color: 'var(--color-foreground)' }}>
          회원가입
        </h1>

        {/* Demo alert */}
        {demoAlert && (
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
              데모 모드 — Supabase 미연결
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel className="text-[14px] font-semibold"
                    style={{ color: 'var(--color-foreground)' }}>
                    이메일
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      className="h-10 text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[14px]"
                    style={{ color: 'var(--color-destructive)' }} />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel className="text-[14px] font-semibold"
                    style={{ color: 'var(--color-foreground)' }}>
                    비밀번호
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="8자 이상"
                      className="h-10 text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[14px]"
                    style={{ color: 'var(--color-destructive)' }} />
                </FormItem>
              )}
            />

            {/* Role selector */}
            <FormField
              control={form.control}
              name="role"
              render={({ fieldState }) => (
                <FormItem className="flex flex-col gap-2">
                  <Label className="text-[14px] font-semibold"
                    style={{ color: 'var(--color-foreground)' }}>
                    계정 유형 선택
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={role === 'artist'}
                      onClick={() => form.setValue('role', 'artist', { shouldValidate: form.formState.submitCount > 0 })}
                      className="flex-1 h-11 rounded-md text-[14px] font-semibold border transition-colors"
                      style={{
                        background: role === 'artist' ? 'var(--color-accent)' : 'var(--color-surface)',
                        color: role === 'artist' ? '#ffffff' : 'var(--color-foreground)',
                        borderColor: role === 'artist' ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      작가
                    </button>
                    <button
                      type="button"
                      aria-pressed={role === 'buyer'}
                      onClick={() => form.setValue('role', 'buyer', { shouldValidate: form.formState.submitCount > 0 })}
                      className="flex-1 h-11 rounded-md text-[14px] font-semibold border transition-colors"
                      style={{
                        background: role === 'buyer' ? 'var(--color-accent)' : 'var(--color-surface)',
                        color: role === 'buyer' ? '#ffffff' : 'var(--color-foreground)',
                        borderColor: role === 'buyer' ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      구매자
                    </button>
                  </div>
                  {fieldState.error && (
                    <p
                      role="alert"
                      className="text-[14px]"
                      style={{ color: 'var(--color-destructive)' }}
                    >
                      {fieldState.error.message}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-[14px] font-semibold mt-1"
              style={{ background: 'var(--color-accent)', color: '#ffffff' }}
            >
              가입하기
            </Button>
          </form>
        </Form>

        <p className="mt-5 text-center text-[14px]"
          style={{ color: 'var(--color-muted)' }}>
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="font-semibold underline underline-offset-2"
            style={{ color: 'var(--color-foreground)' }}
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
  )
}
