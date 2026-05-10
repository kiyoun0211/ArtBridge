// Static placeholder — route exists to prevent 404 on email verification links.
// TODO(plan-03): replace with real Supabase email verification handler once Supabase Cloud is wired.
export default function AuthCallbackPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: 'var(--color-background)' }}
    >
      <h1
        className="text-[20px] font-semibold leading-[1.3] mb-4"
        style={{ color: 'var(--color-foreground)' }}
      >
        이메일을 확인해 주세요
      </h1>
      <p
        className="text-base leading-relaxed max-w-sm"
        style={{ color: 'var(--color-muted)' }}
      >
        가입하신 이메일 주소로 인증 메일을 보냈습니다. 메일함을 확인하고 링크를 클릭해 주세요.
      </p>
    </main>
  )
}
