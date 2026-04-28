import { useState, useEffect } from 'react'
import { MapPin, Calendar, Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'
import type { Trip, Location } from '@/lib/types'

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
    <div className="flex flex-col items-center gap-1">
      <div className="bg-primary/10 border border-primary/25 rounded-xl w-14 sm:w-16 py-2 text-center">
        <span className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
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
    <div className="flex gap-2 sm:gap-3">
      <CountdownUnit value={time.days}    label="days" />
      <CountdownUnit value={time.hours}   label="hours" />
      <CountdownUnit value={time.minutes} label="min" />
      <CountdownUnit value={time.seconds} label="sec" />
    </div>
  )
}

// ── Featured card (next / soonest trip) ───────────────────────────────────────

function FeaturedTripCard({ trip, location }: { trip: Trip; location: Location | null }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-card shadow-lg mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="flex flex-col md:flex-row min-h-[300px]">

        {/* Image */}
        <div className="relative md:w-2/5 flex-shrink-0 min-h-[200px] md:min-h-0">
          {trip.image ? (
            <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Plane className="h-16 w-16 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/60 hidden md:block" />
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow">
            Next Trip
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-5 sm:p-8 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Departing in</p>
            <CountdownTimer dateStr={trip.date} />
          </div>

          <div>
            <h2 className="font-gilbert text-2xl sm:text-3xl 2xl:text-4xl mb-2 leading-tight">{trip.name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
              {location && (
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 flex-shrink-0" />{location.name}</span>
              )}
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 flex-shrink-0" />{fmtDate(trip.date)}</span>
            </div>
            {trip.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{trip.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Regular trip card ─────────────────────────────────────────────────────────

function TripCard({ trip, location }: { trip: Trip; location: Location | null }) {
  function registerInterest() {
    toast.success('Interest registered! The admin team will be in touch.')
  }

  return (
    <div className="flex flex-col sm:flex-row rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">

      {/* Image */}
      <div className="relative sm:w-[200px] md:w-[240px] 2xl:w-[280px] flex-shrink-0 min-h-[160px] sm:min-h-0">
        {trip.image ? (
          <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <Plane className="h-10 w-10 text-primary/25" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 p-4 sm:p-5 2xl:p-6 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-gilbert text-lg sm:text-xl 2xl:text-2xl mb-1.5 leading-tight">{trip.name}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
            {location && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" />{location.name}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 flex-shrink-0" />{fmtDate(trip.date)}</span>
          </div>
          {trip.description && (
            <p className="text-sm 2xl:text-base text-muted-foreground leading-relaxed line-clamp-2">{trip.description}</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={registerInterest} className="gap-1.5">
            <Plane className="h-3.5 w-3.5" /> Register Interest
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function UpcomingTripsView() {
  const { state } = useApp()
  const { trips, locations } = state

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcoming = trips
    .filter(t => t.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  function getLocation(locationId: string | null): Location | null {
    return locationId ? (locations.find(l => l.id === locationId) ?? null) : null
  }

  const [featured, ...rest] = upcoming

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Plane className="h-10 w-10 text-primary/50" />
        </div>
        <h3 className="font-gilbert text-xl mb-1 text-foreground">No upcoming trips</h3>
        <p className="text-sm text-center max-w-xs">Check back soon — new trips will be added by the admin team</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="w-full mb-6">
        <h2 className="font-gilbert text-3xl 2xl:text-4xl text-foreground leading-tight">Upcoming Trips</h2>
        <p className="text-sm text-muted-foreground mt-1">Register your interest in any of our upcoming adventures</p>
      </div>

      {featured && <FeaturedTripCard trip={featured} location={getLocation(featured.locationId)} />}

      {rest.length > 0 && (
        <div className="flex flex-col gap-4">
          {rest.map(trip => (
            <TripCard key={trip.id} trip={trip} location={getLocation(trip.locationId)} />
          ))}
        </div>
      )}
    </div>
  )
}
