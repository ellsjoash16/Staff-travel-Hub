import { useState, useEffect } from 'react'
import { MapPin, Calendar, Airplane, Star, Buildings, Users, Medal, Clock } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'
import { RegisterInterestDialog } from './RegisterInterestDialog'
import type { Trip, Location } from '@/lib/types'

function openLotusPassport(trip: Trip) {
  window.open(`http://lotusprofiles/PassportDetails?tripId=${encodeURIComponent(trip.id)}&tripName=${encodeURIComponent(trip.name)}`, '_blank')
}

// ── Countdown ─────────────────────────────────────────────────────────────────

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(dateStr: string): TimeLeft | null {
  const target = new Date(dateStr + 'T00:00:00')
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000)  / 60000),
    seconds: Math.floor((diff % 60000)    / 1000),
  }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
      <div className="bg-primary/10 border border-primary/25 rounded-xl w-11 sm:w-14 lg:w-16 py-1.5 sm:py-2 text-center">
        <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  )
}

function CountdownTimer({ dateStr }: { dateStr: string }) {
  const [time, setTime] = useState<TimeLeft | null>(() => getTimeLeft(dateStr))
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(dateStr)), 1000)
    return () => clearInterval(id)
  }, [dateStr])
  if (!time) return <p className="text-sm text-muted-foreground italic">This trip has departed</p>
  return (
    <div className="flex gap-1.5 sm:gap-2 lg:gap-3">
      <CountdownUnit value={time.days}    label="days" />
      <CountdownUnit value={time.hours}   label="hrs" />
      <CountdownUnit value={time.minutes} label="min" />
      <CountdownUnit value={time.seconds} label="sec" />
    </div>
  )
}

// ── Featured card (next / soonest trip) ───────────────────────────────────────

function FeaturedTripCard({ trip, locations }: { trip: Trip; locations: Location[] }) {
  const location = locations[0] ?? null
  const [dialogOpen, setDialogOpen] = useState(false)
  const todayStr = new Date().toISOString().slice(0, 10)
  const registrationOpen = trip.showRegisterInterest && (!trip.registrationDeadline || trip.registrationDeadline >= todayStr)
  return (
    <>
    <RegisterInterestDialog trip={trip} open={dialogOpen} onOpenChange={setDialogOpen} />
    <div className="relative rounded-2xl overflow-hidden bg-background/80 backdrop-blur-xl border border-white/10 shadow-lg mb-4 sm:mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="flex flex-col md:flex-row min-h-0 sm:min-h-[280px] lg:min-h-[340px] xl:min-h-[380px] 2xl:min-h-[420px]">

        {/* Image */}
        <div className="relative md:w-2/5 flex-shrink-0 h-28 sm:h-48 md:h-auto">
          {trip.image ? (
            <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Airplane className="h-12 w-12 sm:h-16 sm:w-16 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/60 hidden md:block" />
          <div className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow">
            Next Trip
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-3.5 sm:p-6 lg:p-8 flex flex-col justify-between gap-2.5 sm:gap-5">
          <div className="space-y-1 sm:space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Departing in</p>
            <CountdownTimer dateStr={trip.date} />
          </div>

          <div>
            <h2 className="font-gilbert text-xl sm:text-2xl xl:text-3xl mb-1.5 leading-tight">{trip.name}</h2>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              {location && (
                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 flex-shrink-0" />{locations.map(l => l.name).join(' · ')}</span>
              )}
              <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 flex-shrink-0" />{fmtDate(trip.date)}{trip.endDate ? ` – ${fmtDate(trip.endDate)}` : ''}</span>
              {trip.registrationDeadline && (
                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 flex-shrink-0" />Register by {fmtDate(trip.registrationDeadline)}</span>
              )}
            </div>
            {trip.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">{trip.description}</p>
            )}
            {registrationOpen && (
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
                  <Airplane className="h-4 w-4" /> Register Interest
                </Button>
                <Button size="sm" variant="outline" onClick={() => openLotusPassport(trip)} className="gap-2 text-muted-foreground">
                  Update passport info
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ── Regular trip card ─────────────────────────────────────────────────────────

function TripCard({ trip, locations, showRegisterInterest }: { trip: Trip; locations: Location[]; showRegisterInterest: boolean }) {
  const location = locations[0] ?? null
  const [dialogOpen, setDialogOpen] = useState(false)
  const todayStr = new Date().toISOString().slice(0, 10)
  const registrationOpen = showRegisterInterest && (!trip.registrationDeadline || trip.registrationDeadline >= todayStr)

  return (
    <>
    <RegisterInterestDialog trip={trip} open={dialogOpen} onOpenChange={setDialogOpen} />
    <div className="flex flex-col rounded-2xl overflow-hidden bg-background/80 backdrop-blur-xl border border-white/10 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">

      {/* Image */}
      <div className="relative w-full h-32 sm:h-40 lg:h-44 2xl:h-52 flex-shrink-0">
        {trip.image ? (
          <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <Airplane className="h-8 w-8 sm:h-10 sm:w-10 text-primary/25" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 p-3 sm:p-5 2xl:p-6 flex flex-col justify-between gap-2 sm:gap-3">
        <div>
          <h3 className="font-gilbert text-base sm:text-lg lg:text-xl 2xl:text-2xl mb-1 leading-tight">{trip.name}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground mb-1.5">
            {location && (
              <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />{locations.map(l => l.name).join(' · ')}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />{fmtDate(trip.date)}{trip.endDate ? ` – ${fmtDate(trip.endDate)}` : ''}</span>
            {trip.registrationDeadline && (
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />By {fmtDate(trip.registrationDeadline)}</span>
            )}
          </div>
          {trip.description && (
            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">{trip.description}</p>
          )}
        </div>
        {registrationOpen && (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openLotusPassport(trip)} className="text-xs h-7 sm:h-9 sm:text-sm px-2.5 sm:px-3 text-muted-foreground">
              Update passport info
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1 text-xs h-7 sm:h-9 sm:text-sm px-2.5 sm:px-3">
              <Airplane className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Register
            </Button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ trip, location }: { trip: Trip; location: Location | null }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const todayStr = new Date().toISOString().slice(0, 10)
  const registrationOpen = trip.showRegisterInterest && (!trip.registrationDeadline || trip.registrationDeadline >= todayStr)
  const full = trip.eventSpaces != null && trip.participants.length >= trip.eventSpaces

  const dateStr = trip.endDate
    ? `${fmtDate(trip.date)} – ${fmtDate(trip.endDate)}`
    : fmtDate(trip.date)

  const venueLabel = trip.eventVenue || location?.name || null

  return (
    <>
      <RegisterInterestDialog trip={trip} open={dialogOpen} onOpenChange={setDialogOpen} />
      {/* Mobile: horizontal list row */}
      <div className="sm:hidden flex rounded-2xl overflow-hidden bg-background/80 backdrop-blur-xl border border-white/10 shadow-sm h-[104px]">
        <div className="relative w-28 flex-shrink-0">
          {trip.image ? (
            <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-violet-600/5 flex items-center justify-center">
              <Star className="h-7 w-7 text-violet-500/25" />
            </div>
          )}
          <span className="absolute top-2 left-2 bg-violet-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none shadow">
            {trip.eventType || 'Event'}
          </span>
        </div>

        <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
          <div>
            <h3 className="font-gilbert text-sm leading-tight line-clamp-2 mb-1">{trip.name}</h3>
            <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1 truncate"><Calendar className="h-2.5 w-2.5 flex-shrink-0" />{dateStr}</span>
              {venueLabel && (
                <span className="flex items-center gap-1 truncate"><MapPin className="h-2.5 w-2.5 flex-shrink-0" />{venueLabel}</span>
              )}
              {trip.eventSpaces != null && (
                <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5 flex-shrink-0" />{Math.max(0, trip.eventSpaces - trip.participants.length)}/{trip.eventSpaces} spaces</span>
              )}
            </div>
          </div>
          {registrationOpen && (
            <div className="flex justify-end">
              {full ? (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Full</span>
              ) : (
                <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1 text-[10px] h-6 px-2 bg-violet-600 hover:bg-violet-700 text-white">
                  <Star className="h-2.5 w-2.5" /> Register
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tablet+: vertical card */}
      <div className="hidden sm:flex flex-col rounded-2xl overflow-hidden bg-background/80 backdrop-blur-xl border border-white/10 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
        <div className="relative w-full h-40 lg:h-44 2xl:h-52 flex-shrink-0">
          {trip.image ? (
            <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-violet-600/5 flex items-center justify-center">
              <Star className="h-10 w-10 text-violet-500/25" />
            </div>
          )}
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-violet-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
              {trip.eventType || 'Event'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-5 2xl:p-6 flex flex-col justify-between gap-3">
          <div>
            <h3 className="font-gilbert text-lg lg:text-xl 2xl:text-2xl mb-1 leading-tight">{trip.name}</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mb-1.5">
              {location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" />{location.name}</span>}
              {trip.eventBuilding && trip.eventBuilding.length > 0 && (
                <span className="flex items-center gap-1"><Buildings className="h-3 w-3 flex-shrink-0" />{trip.eventBuilding.join(', ')}</span>
              )}
              {trip.eventVenue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" />{trip.eventVenue}</span>}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3 flex-shrink-0" />{dateStr}</span>
              {trip.eventSpaces != null && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3 flex-shrink-0" />{Math.max(0, trip.eventSpaces - trip.participants.length)}/{trip.eventSpaces} spaces</span>
              )}
              {trip.eventSponsor && <span className="flex items-center gap-1"><Medal className="h-3 w-3 flex-shrink-0" />{trip.eventSponsor}</span>}
              {trip.registrationDeadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3 flex-shrink-0" />By {fmtDate(trip.registrationDeadline)}</span>}
            </div>
            {trip.description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{trip.description}</p>
            )}
          </div>
          {registrationOpen && (
            <div className="flex justify-end">
              {full ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Fully Booked</span>
              ) : (
                <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1 text-xs h-9 px-3 bg-violet-600 hover:bg-violet-700 text-white">
                  <Star className="h-3.5 w-3.5" /> Register
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const BG = 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=400&q=40'

// ── Main view ─────────────────────────────────────────────────────────────────

export function UpcomingTripsView() {
  const { state } = useApp()
  const { trips, locations } = state
  const [tab, setTab] = useState<'trips' | 'events'>('trips')

  const todayStr = new Date().toISOString().slice(0, 10)

  const upcoming = trips
    .filter(t => t.date >= todayStr && !t.completed && !t.isEvent)
    .sort((a, b) => a.date.localeCompare(b.date))

  const events = trips
    .filter(t => t.isEvent && !t.completed && (t.endDate ?? t.date) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  function getLocation(locationId: string | null): Location | null {
    return locationId ? (locations.find(l => l.id === locationId) ?? null) : null
  }

  function getTripLocations(trip: Trip): Location[] {
    const ids = trip.locationIds?.length ? trip.locationIds : (trip.locationId ? [trip.locationId] : [])
    return ids.map(id => locations.find(l => l.id === id)).filter(Boolean) as Location[]
  }

  const [featured, ...rest] = upcoming
  const isEmpty = tab === 'trips' ? upcoming.length === 0 : events.length === 0

  return (
    <div className="dark relative h-full overflow-auto text-foreground">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(14px) brightness(0.45) saturate(1.2)', transform: 'scale(1.1)' }} />
      </div>
      <div className="relative flex flex-col px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-5 lg:py-6 xl:py-8" style={{ zIndex: 1 }}>

        {/* Header + tabs */}
        <div className="w-full mb-3 sm:mb-6 flex items-center justify-between gap-3">
          <h2 className="font-gilbert text-2xl sm:text-3xl xl:text-4xl text-white leading-tight drop-shadow">
            {tab === 'trips' ? 'Upcoming Trips' : 'Events'}
          </h2>
          <div className="flex gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-1 flex-shrink-0">
            <button
              onClick={() => setTab('trips')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                tab === 'trips'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Airplane className="h-3.5 w-3.5" /> Trips
            </button>
            <button
              onClick={() => setTab('events')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                tab === 'events'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Star className="h-3.5 w-3.5" /> Events
            </button>
          </div>
        </div>

        {/* Trips tab */}
        {tab === 'trips' && (
          isEmpty ? (
            <div className="flex flex-col items-center justify-center py-24 text-white/70">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-5">
                <Airplane className="h-10 w-10 text-white/50" />
              </div>
              <h3 className="font-gilbert text-xl mb-1 text-white">No upcoming trips</h3>
              <p className="text-sm text-center max-w-xs">Check back soon — new trips will be added by the admin team</p>
            </div>
          ) : (
            <>
              {featured && <FeaturedTripCard trip={featured} locations={getTripLocations(featured)} />}
              {rest.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {rest.map(trip => (
                    <TripCard key={trip.id} trip={trip} locations={getTripLocations(trip)} showRegisterInterest={trip.showRegisterInterest} />
                  ))}
                </div>
              )}
            </>
          )
        )}

        {/* Events tab */}
        {tab === 'events' && (
          isEmpty ? (
            <div className="flex flex-col items-center justify-center py-24 text-white/70">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-5">
                <Star className="h-10 w-10 text-white/50" />
              </div>
              <h3 className="font-gilbert text-xl mb-1 text-white">No upcoming events</h3>
              <p className="text-sm text-center max-w-xs">Check back soon — events will be added by the admin team</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {events.map(trip => (
                <EventCard key={trip.id} trip={trip} location={getLocation(trip.locationId)} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
