import { useState, useEffect } from 'react'
import { CalendarDots, MapPin, Airplane } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'

const BG = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=40'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function YearsView() {
  const { state } = useApp()
  const { trips, locations } = state
  const [tab, setTab] = useState<'fam' | 'external'>('fam')
  const [selectedYear, setSelectedYear] = useState<string | null>(null)

  const completedTrips = trips.filter((t) => t.completed)
  const visibleTrips = tab === 'external'
    ? completedTrips.filter((t) => t.external)
    : completedTrips.filter((t) => !t.external)

  const sorted = [...visibleTrips].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

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

  const activeYear = selectedYear && yearKeys.includes(selectedYear) ? selectedYear : yearKeys[0] ?? null

  useEffect(() => {
    setSelectedYear(null)
  }, [tab])

  if (completedTrips.length === 0) {
    return (
      <div className="relative h-full overflow-auto">
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(14px) brightness(0.45) saturate(1.2)', transform: 'scale(1.1)' }} />
        </div>
        <div className="relative flex flex-col items-center justify-center h-full text-white/70">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-5">
            <CalendarDots className="h-10 w-10 text-white/50" />
          </div>
          <h3 className="font-gilbert text-xl mb-1 text-white">No completed trips yet</h3>
          <p className="text-sm">Trips will appear here once marked as complete</p>
        </div>
      </div>
    )
  }

  const yearTrips = activeYear ? yearMap.get(activeYear)! : new Map<string, typeof sorted>()
  const monthKeys = [...yearTrips.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="relative h-full overflow-auto">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(14px) brightness(0.45) saturate(1.2)',
          transform: 'scale(1.1)',
        }} />
      </div>

      <div className="relative py-3 sm:py-5 lg:py-6 xl:py-8 px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="lg:flex lg:gap-6 xl:gap-8 items-start">

          {/* ── Left: header + year nav ── */}
          <div className="lg:w-52 xl:w-60 lg:flex-shrink-0">
            {/* Header */}
            <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-3 sm:px-6 sm:py-5 mb-3 sm:mb-4">
              <h2 className="font-gilbert text-xl sm:text-2xl text-foreground leading-tight">By Year</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                {visibleTrips.length} trip{visibleTrips.length !== 1 ? 's' : ''} · {yearKeys.length} year{yearKeys.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1 bg-card/60 border border-border rounded-lg p-0.5 mt-3">
                {(['fam', 'external'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-md transition-all ${
                      tab === t
                        ? 'bg-primary/10 border border-primary/30 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'fam' ? 'FAM' : 'External'}
                  </button>
                ))}
              </div>
            </div>

            {/* Year nav: horizontal scroll on mobile, vertical list on desktop */}
            {yearKeys.length > 0 && (
              <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-x-visible lg:pb-0 lg:mb-0">
                {yearKeys.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`flex-shrink-0 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border transition-all lg:w-full lg:text-left ${
                      year === activeYear
                        ? 'bg-background/90 backdrop-blur-xl border-primary/30 text-primary shadow-lg'
                        : 'bg-background/50 backdrop-blur-md border-white/10 text-white/70 hover:text-white hover:bg-background/70'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: timeline ── */}
          <div className="flex-1 min-w-0">
            {activeYear && (
              <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-4 sm:px-6 sm:py-5 space-y-5 sm:space-y-6">
                <h3 className="font-gilbert text-lg sm:text-xl text-foreground">{activeYear}</h3>
                <div className="space-y-5 sm:space-y-6 pl-3 sm:pl-4 border-l-2 border-primary/30">
                  {monthKeys.map(monthKey => {
                    const mTrips    = yearTrips.get(monthKey)!
                    const monthName = monthKey === 'unknown'
                      ? 'Unknown Date'
                      : MONTH_NAMES[parseInt(monthKey.split('-')[1], 10) - 1]
                    return (
                      <div key={monthKey}>
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2 sm:mb-3">{monthName}</p>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                          {mTrips.map(trip => {
                            const loc = trip.locationId ? locations.find(l => l.id === trip.locationId) : null
                            return (
                              <div key={trip.id} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-background/50 rounded-xl border border-border/30">
                                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden">
                                  {trip.image ? (
                                    <img src={trip.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                      <Airplane className="h-4 w-4 sm:h-5 sm:w-5 text-primary/50" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{trip.name}</p>
                                    {trip.external && (
                                      <span className="flex-shrink-0 text-[9px] sm:text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                                        External
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                                    {loc && (
                                      <span className="text-[10px] sm:text-xs text-primary flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />{loc.name}, {loc.country}
                                      </span>
                                    )}
                                    {trip.participants.length > 0 && (
                                      <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{trip.participants.join(', ')}</span>
                                    )}
                                    {trip.date && (
                                      <span className="text-[10px] sm:text-[11px] text-muted-foreground/60">
                                        {new Date(trip.date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                      </span>
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
            )}

            {activeYear === null && visibleTrips.length === 0 && (
              <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-4 sm:px-6 py-8 sm:py-10 text-center text-muted-foreground text-sm">
                No trips in this category yet.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
