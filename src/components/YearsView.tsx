import { useState } from 'react'
import { CalendarDots, MapPin, Airplane } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'

const BG = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=40'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Trip = ReturnType<typeof useApp>['state']['trips'][number]

function buildYearMap(ts: Trip[]) {
  const sorted = [...ts].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const map = new Map<string, Map<string, Trip[]>>()
  sorted.forEach(trip => {
    const year  = trip.date?.slice(0, 4) || 'Unknown'
    const month = trip.date?.length >= 7 ? trip.date.slice(0, 7) : 'unknown'
    if (!map.has(year)) map.set(year, new Map())
    const mMap = map.get(year)!
    if (!mMap.has(month)) mMap.set(month, [])
    mMap.get(month)!.push(trip)
  })
  return map
}

export function YearsView() {
  const { state } = useApp()
  const { trips, locations } = state
  const [selectedYear, setSelectedYear] = useState<string | null>(null)

  const completedTrips = trips.filter(t => t.completed)
  const famTrips = completedTrips.filter(t => !t.external)
  const extTrips = completedTrips.filter(t => t.external)

  const famMap = buildYearMap(famTrips)
  const extMap = buildYearMap(extTrips)
  const yearKeys = [...new Set([...famMap.keys(), ...extMap.keys()])].sort((a, b) => b.localeCompare(a))
  const activeYear = selectedYear && yearKeys.includes(selectedYear) ? selectedYear : yearKeys[0] ?? null

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

  const famYearTrips = activeYear ? (famMap.get(activeYear) ?? new Map<string, Trip[]>()) : new Map<string, Trip[]>()
  const extYearTrips = activeYear ? (extMap.get(activeYear) ?? new Map<string, Trip[]>()) : new Map<string, Trip[]>()
  const allMonthKeys = [...new Set([...famYearTrips.keys(), ...extYearTrips.keys()])].sort((a, b) => b.localeCompare(a))

  function renderTrip(trip: Trip) {
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
          <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{trip.name}</p>
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
  }

  function renderColumn(yearTrips: Map<string, Trip[]>, monthKeys: string[], emptyLabel: string) {
    if (yearTrips.size === 0) {
      return <p className="text-muted-foreground text-sm py-4 pl-4">{emptyLabel}</p>
    }
    return (
      <div className="space-y-5 pl-3 sm:pl-4 border-l-2 border-primary/30">
        {monthKeys.filter(mk => yearTrips.has(mk)).map(monthKey => {
          const mTrips = yearTrips.get(monthKey)!
          const monthName = monthKey === 'unknown'
            ? 'Unknown Date'
            : MONTH_NAMES[parseInt(monthKey.split('-')[1], 10) - 1]
          return (
            <div key={monthKey}>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2 sm:mb-3">{monthName}</p>
              <div className="space-y-2">{mTrips.map(renderTrip)}</div>
            </div>
          )
        })}
      </div>
    )
  }

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

          {/* ── Left sidebar: header + year nav (sticky on desktop) ── */}
          <div className="lg:w-52 xl:w-60 lg:flex-shrink-0 lg:sticky lg:top-4">
            <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-3 sm:px-6 sm:py-5 mb-3 sm:mb-4">
              <h2 className="font-gilbert text-xl sm:text-2xl text-foreground leading-tight">By Year</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                {famTrips.length} FAM · {extTrips.length} External · {yearKeys.length} year{yearKeys.length !== 1 ? 's' : ''}
              </p>
            </div>

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

          {/* ── Right: FAM | External columns ── */}
          <div className="flex-1 min-w-0">
            {activeYear && (
              <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-4 sm:px-6 sm:py-5">
                <h3 className="font-gilbert text-lg sm:text-xl text-foreground mb-5">{activeYear}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50 mb-3 pb-2 border-b border-border/40">FAM</p>
                    {renderColumn(famYearTrips, allMonthKeys, 'No FAM trips this year')}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50 mb-3 pb-2 border-b border-border/40">External</p>
                    {renderColumn(extYearTrips, allMonthKeys, 'No external trips this year')}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
