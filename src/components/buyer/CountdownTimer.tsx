'use client'

import { useState, useEffect } from 'react'

type Props = {
  /** ISO string or ms timestamp. If null, shows em-dash. */
  endsAt?: string | number | null
}

export function CountdownTimer({ endsAt }: Props) {
  const [label, setLabel] = useState('—')

  useEffect(() => {
    if (!endsAt) return
    const target = typeof endsAt === 'string' ? new Date(endsAt).getTime() : endsAt

    function tick() {
      const ms = Math.max(0, target - Date.now())
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setLabel(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      )
      if (ms === 0) clearInterval(id)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return <span style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
}
