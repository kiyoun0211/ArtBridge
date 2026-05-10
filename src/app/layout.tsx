import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ArtBridge',
  description: '내 공간에서 만나는 원화',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
