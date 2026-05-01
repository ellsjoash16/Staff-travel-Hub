import { useState } from 'react'
import { CalendarDays, MapPin, Plane } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'

const BG = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function YearsView() {
  const { state } = useApp()
  const { trips, locations } = state
  const [externalOnly, setExternalOnly] = useState(false)

  const completedTrips = trips.filter((t) => t.completed)
  const visibleTrips = externalOnly ? completedTrips.filter((t) => t.external) : completedTrips

  const sorted = [...visibleTrips].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Group by year → month
  const yearMap = new Map<string, Map<string, typeof sorted>>()
  sorted.forEach(trip => {
    const year  = trip.date?.slice(0, 4) || 'Unknown'
    const month = trip.date?.length >= 7 ? trip.date.slice(0, 7) : 'unknown'
    if (!yearMap.has(year)) yearMap.set(year, new Map())
    const mMap = yearMap.get(year)!
    if (!mMap.has(month)) mMap.set(month, [])
    mMap.get(month)!.push(trip)
  })
  const yearKeys = [...yearMap.keys()].sort((a, b) => b.localeCompare(a))

  if (trips.length === 0) {
    return (
      <div className="relative h-full overflow-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(14px) brightness(0.45) saturate(1.2)', transform: 'scale(1.1)' }} />
        </div>
        <div className="relative flex flex-col items-center justify-center h-full text-white/70">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-5">
            <CalendarDays className="h-10 w-10 text-white/50" />
          </div>
          <h3 className="font-gilbert text-xl mb-1 text-white">No completed trips yet</h3>
          <p className="text-sm">Trips will appear here once marked as complete</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-auto">
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

      <div className="relative flex justify-center py-5 lg:py-6 xl:py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="w-full max-w-[680px]">

          {/* Header */}
          <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-6 py-5 mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-gilbert text-2xl text-foreground leading-tight">By Year</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {visibleTrips.length} trip{visibleTrips.length !== 1 ? 's' : ''} across {yearKeys.length} year{yearKeys.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setExternalOnly((v) => !v)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                externalOnly
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-card/60 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              External only
            </button>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-6 py-5 space-y-8">
            {yearKeys.map(year => {
              const mMap   = yearMap.get(year)!
              const mKeys  = [...mMap.keys()].sort((a, b) => b.localeCompare(a))
              return (
                <div key={year}>
                  <h3 className="font-gilbert text-xl text-foreground mb-4">{year}</h3>
                  <div className="space-y-6 pl-4 border-l-2 border-primary/30">
                    {mKeys.map(monthKey => {
                      const mTrips    = mMap.get(monthKey)!
                      const monthName = monthKey === 'unknown'
                        ? 'Unknown Date'
                        : MONTH_NAMES[parseInt(monthKey.split('-')[1], 10) - 1]
                      return (
                        <div key={monthKey}>
                          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-3">{monthName}</p>
                          <div className="space-y-2">
                            {mTrips.map(trip => {
                              const loc = trip.locationId ? locations.find(l => l.id === trip.locationId) : null
                              return (
                                <div key={trip.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/30">
                                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                                    {trip.image ? (
                                      <img src={trip.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                        <Plane className="h-5 w-5 text-primary/50" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-semibold text-sm text-foreground truncate">{trip.name}</p>
                                      {trip.external && (
                                        <span className="flex-shrink-0 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                                          External
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                      {loc && (
                                        <span className="text-xs text-primary flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />{loc.name}, {loc.country}
                                        </span>
                                      )}
                                      {trip.participants.length > 0 && (
                                        <span className="text-xs text-muted-foreground">{trip.participants.join(', ')}</span>
                                      )}
                                      {trip.date && (
                                        <span className="text-[11px] text-muted-foreground/60">{fmtDate(trip.date)}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
