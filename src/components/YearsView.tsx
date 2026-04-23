import { useState } from 'react'
import { CalendarDays, MapPin, Plane } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function YearsView() {
  const { state } = useApp()
  const { trips, locations } = state

  const years = [...new Set(
    trips.map((t) => t.date?.slice(0, 4) || 'Unknown')
  )].sort((a, b) => b.localeCompare(a))

  const [activeYear, setActiveYear] = useState(years[0] || '')

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <CalendarDays className="h-10 w-10 text-primary/50" />
        </div>
        <h3 className="font-gilbert text-xl mb-1 text-foreground">No trips yet</h3>
        <p className="text-sm">An admin can add trips in the Admin Panel → Trips tab</p>
      </div>
    )
  }

  const yearTrips = [...trips]
    .filter((t) => (t.date?.slice(0, 4) || 'Unknown') === activeYear)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const monthMap = new Map<string, typeof yearTrips>()
  yearTrips.forEach(trip => {
    const key = trip.date?.length >= 7 ? trip.date.slice(0, 7) : 'unknown'
    if (!monthMap.has(key)) monthMap.set(key, [])
    monthMap.get(key)!.push(trip)
  })
  const monthKeys = [...monthMap.keys()].sort()

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-gilbert text-3xl text-foreground mb-1">By Year</h2>
      <p className="text-muted-foreground text-sm mb-6">
        {trips.length} trip{trips.length !== 1 ? 's' : ''} across {years.length} year{years.length !== 1 ? 's' : ''}
      </p>

      {/* Year pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setActiveYear(year)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              activeYear === year
                ? 'btn-gradient text-white shadow-sm'
                : 'bg-card border border-border text-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {monthKeys.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No trips in {activeYear}</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-8">
            {monthKeys.map(monthKey => {
              const mTrips = monthMap.get(monthKey)!
              const monthName = monthKey === 'unknown'
                ? 'Unknown Date'
                : MONTH_NAMES[parseInt(monthKey.split('-')[1], 10) - 1]

              return (
                <div key={monthKey}>
                  {/* Month marker */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/15 flex-shrink-0 z-10" />
                    <h3 className="font-gilbert text-base text-foreground">{monthName}</h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {mTrips.length} trip{mTrips.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Trip cards */}
                  <div className="ml-7 space-y-3">
                    {mTrips.map(trip => {
                      const loc = trip.locationId ? locations.find(l => l.id === trip.locationId) : null
                      return (
                        <div
                          key={trip.id}
                          className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/60"
                        >
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden">
                            {trip.image ? (
                              <img
                                src={trip.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <Plane className="h-6 w-6 text-primary/50" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate leading-tight">{trip.name}</p>
                            {loc && (
                              <p className="text-xs text-primary flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {loc.name}, {loc.country}
                              </p>
                            )}
                            {trip.participants.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {trip.participants.join(', ')}
                              </p>
                            )}
                            {trip.date && (
                              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{fmtDate(trip.date)}</p>
                            )}
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
    </div>
  )
}
