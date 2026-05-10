import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qbyzqqwkdfclnwqomgde.supabase.co',
      },
    ],
  },
}

export default config
