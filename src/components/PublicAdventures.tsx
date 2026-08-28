import { useEffect, useState } from 'react'
import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { YearsViewInner } from './YearsView'
import type { Trip, Location } from '@/lib/types'

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
    <div className="h-dvh w-screen overflow-hidden bg-background text-foreground">
      {error ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-6 text-center">
          <WarningCircle className="h-10 w-10 text-destructive/70" />
          <p className="font-semibold text-foreground">Couldn't load DAF Adventures</p>
          <p className="text-sm">Please try again in a moment.</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
          <CircleNotch className="h-6 w-6 animate-spin text-primary/70" />
          <p className="text-sm">Loading DAF Adventures…</p>
        </div>
      ) : (
        <YearsViewInner trips={data.trips} locations={data.locations} matchTheme />
      )}
    </div>
  )
}
