import { useState } from 'react'
import { CalendarDots, MapPin, Airplane } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'
import { destinationImage } from '@/lib/destinationImages'

const BG = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=40'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Trip = ReturnType<typeof useApp>['state']['trips'][number]

function tripGradient(name: string): string {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360
  return `linear-gradient(135deg, hsl(${hue},52%,28%), hsl(${(hue + 45) % 360},58%,18%))`
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden lg:h-full">
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border/40 flex-shrink-0">
        {title}
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
        {children}
      </div>
    </div>
  )
}

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
    // Trips with a location show that destination's picture (this replaces the
    // old broken per-trip uploads). Trips with no location keep their own image.
    const locPhoto = loc ? (loc.imageUrl || destinationImage(loc.name, loc.country)) : null
    const photo = locPhoto || trip.image
    return (
      <div key={trip.id} className="rounded-xl overflow-hidden border border-border/30 bg-background/50">
        {/* Photo — CSS background handles load failure silently; gradient always visible underneath */}
        <div
          className="relative w-full h-28 sm:h-32 flex-shrink-0"
          style={{
            backgroundImage: photo
              ? `url("${photo}"), ${tripGradient(trip.name)}`
              : tripGradient(trip.name),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!photo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Airplane className="h-8 w-8 text-white/25" />
            </div>
          )}
          {/* Date badge */}
          {trip.date && (
            <span className="absolute top-2 right-2 text-[10px] font-medium bg-black/50 text-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {new Date(trip.date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        {/* Details */}
        <div className="px-3 py-2.5">
          <p className="font-semibold text-xs sm:text-sm text-foreground leading-snug">{trip.name}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1">
            {loc && (
              <span className="text-[10px] sm:text-xs text-primary flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />{loc.name}, {loc.country}
              </span>
            )}
            {trip.participants.length > 0 && (
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{trip.participants.join(', ')}</span>
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
    /* On lg+: fill the viewport, no page scroll — cards scroll internally.
       On mobile: page scrolls naturally. */
    <div className="relative h-full overflow-auto lg:overflow-hidden">
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

      <div className="relative h-auto lg:h-full lg:flex lg:flex-col py-3 sm:py-5 lg:py-6 xl:py-8 px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="lg:flex-1 lg:min-h-0 lg:flex lg:gap-6 xl:gap-8">

          {/* ── Left sidebar: header + year nav ── */}
          <div className="lg:w-52 xl:w-60 lg:flex-shrink-0 lg:flex lg:flex-col">
            <div className="rounded-2xl bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-3 sm:px-6 sm:py-5 mb-3 sm:mb-4">
              <h2 className="font-gilbert text-xl sm:text-2xl text-foreground leading-tight">By Year</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                {famTrips.length} FAM · {extTrips.length} External · {yearKeys.length} year{yearKeys.length !== 1 ? 's' : ''}
              </p>
            </div>

            {yearKeys.length > 0 && (
              <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0 lg:mb-0 lg:flex-1 lg:min-h-0">
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

          {/* ── Right: FAM | External cards ── */}
          <div className="flex-1 min-w-0 lg:min-h-0 lg:flex lg:flex-col">
            {activeYear && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:flex-1 lg:min-h-0">
                <CardSection key={`fam-${activeYear}`} title={`FAM · ${activeYear}`}>
                  {renderColumn(famYearTrips, allMonthKeys, 'No FAM trips this year')}
                </CardSection>
                <CardSection key={`ext-${activeYear}`} title={`External · ${activeYear}`}>
                  {renderColumn(extYearTrips, allMonthKeys, 'No external trips this year')}
                </CardSection>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
