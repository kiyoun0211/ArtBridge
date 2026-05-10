'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuthState = { error?: string } | undefined

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const role = String(formData.get('role') ?? '')

  if (!email || !password || (role !== 'artist' && role !== 'buyer')) {
    return { error: '입력값을 확인해 주세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
      emailRedirectTo: `${process.env.NEXT_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    return { error: '가입에 실패했습니다. 잠시 후 다시 시도해 주세요.' }
  }

  redirect(role === 'artist' ? '/artist' : '/buyer')
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해 주세요.' }
  }

  const supabase = await createClient()
  let { error } = await supabase.auth.signInWithPassword({ email, password })

  // DEMO MODE: any input works.
  // If credentials fail, force-reset the password (or create the user) via admin
  // client and retry. Replace with strict auth before production.
  if (error) {
    const admin = createAdminClient()
    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users.find((u) => u.email === email)

    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, { password })
    } else {
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'buyer' },
      })
    }

    ;({ error } = await supabase.auth.signInWithPassword({ email, password }))
    if (error) return { error: '로그인에 실패했습니다. 다시 시도해 주세요.' }
  }

  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) {
    return { error: '세션을 확인할 수 없습니다. 다시 시도해 주세요.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  redirect(profile?.role === 'artist' ? '/artist' : '/buyer')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
