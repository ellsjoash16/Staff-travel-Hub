import { useEffect, useState } from 'react'
import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { YearsViewInner } from './YearsView'
import type { Trip, Location } from '@/lib/types'

const BG = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=40'

// Login-free, isolated DAF Adventures page reached via ?view=adventures.
// Data comes from the read-only /api/public-adventures endpoint (completed
// trips only) — there is no sidebar/header, so there is no way to reach the
// rest of the app from here.
export function PublicAdventures() {
  const [data, setData] = useState<{ trips: Trip[]; locations: Location[] } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/public-adventures')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => { if (alive) setData({ trips: d.trips ?? [], locations: d.locations ?? [] }) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [])

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background text-foreground">
      {/* Standalone-page-only background image, behind every state. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(14px) brightness(0.45) saturate(1.2)',
          transform: 'scale(1.1)',
        }} />
      </div>
      <div className="relative z-10 h-full">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/70 px-6 text-center">
            <WarningCircle className="h-10 w-10 text-destructive/70" />
            <p className="font-semibold text-white">Couldn't load DAF Adventures</p>
            <p className="text-sm">Please try again in a moment.</p>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/70">
            <CircleNotch className="h-6 w-6 animate-spin text-primary/70" />
            <p className="text-sm">Loading DAF Adventures…</p>
          </div>
        ) : (
          <YearsViewInner trips={data.trips} locations={data.locations} matchTheme />
        )}
      </div>
    </div>
  )
}
