'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해 주세요.')
    .email('올바른 이메일 형식을 입력해 주세요.'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해 주세요.'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [demoAlert, setDemoAlert] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  function onSubmit(_values: LoginValues) {
    setDemoAlert(true)
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-background)' }}
    >
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
        <h1
          className="text-[20px] font-semibold leading-[1.3] mb-6"
          style={{ color: 'var(--color-foreground)' }}
        >
          로그인
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
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-5"
          >
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--color-foreground)' }}
                  >
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
                  <FormMessage
                    className="text-[14px]"
                    style={{ color: 'var(--color-destructive)' }}
                  />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    비밀번호
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="비밀번호를 입력하세요"
                      className="h-10 text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage
                    className="text-[14px]"
                    style={{ color: 'var(--color-destructive)' }}
                  />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-[14px] font-semibold mt-1"
              style={{ background: 'var(--color-accent)', color: '#ffffff' }}
            >
              로그인하기
            </Button>
          </form>
        </Form>

        <p
          className="mt-5 text-center text-[14px]"
          style={{ color: 'var(--color-muted)' }}
        >
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
