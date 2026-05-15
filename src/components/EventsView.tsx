import { useState } from 'react'
import { MapPin, Calendar, Star, Building2, Users, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'
import { RegisterInterestDialog } from './RegisterInterestDialog'
import type { Trip, Location } from '@/lib/types'

const BG = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=40'

function EventCard({ trip, location }: { trip: Trip; location: Location | null }) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const dateStr = trip.endDate
    ? `${fmtDate(trip.date)} – ${fmtDate(trip.endDate)}`
    : fmtDate(trip.date)

  return (
    <>
      <RegisterInterestDialog trip={trip} open={dialogOpen} onOpenChange={setDialogOpen} />
      <div className="flex flex-col rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
        <div className="relative w-full h-44 2xl:h-52 flex-shrink-0">
          {trip.image ? (
            <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-violet-600/5 flex items-center justify-center">
              <Star className="h-10 w-10 text-violet-500/25" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-violet-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
              {trip.eventType || 'Event'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5 2xl:p-6 flex flex-col justify-between gap-3">
          <div>
            <h3 className="font-gilbert text-lg sm:text-xl 2xl:text-2xl mb-1.5 leading-tight">{trip.name}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
              {location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" />{location.name}</span>
              )}
              {trip.eventBuilding && (
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3 flex-shrink-0" />{trip.eventBuilding}</span>
              )}
              {trip.eventVenue && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" />{trip.eventVenue}</span>
              )}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3 flex-shrink-0" />{dateStr}</span>
              {trip.eventSpaces != null && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 flex-shrink-0" />
                  {Math.max(0, trip.eventSpaces - trip.participants.length)} of {trip.eventSpaces} spaces remaining
                </span>
              )}
              {trip.eventSponsor && (
                <span className="flex items-center gap-1"><Award className="h-3 w-3 flex-shrink-0" />Sponsored by {trip.eventSponsor}</span>
              )}
            </div>
            {trip.description && (
              <p className="text-sm 2xl:text-base text-muted-foreground leading-relaxed line-clamp-2">{trip.description}</p>
            )}
          </div>
          {trip.showRegisterInterest && (() => {
            const full = trip.eventSpaces != null && trip.participants.length >= trip.eventSpaces
            return (
              <div className="flex justify-end">
                {full ? (
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground">Fully Booked</span>
                ) : (
                  <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                    <Star className="h-3.5 w-3.5" /> Register Interest
                  </Button>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}

export function EventsView() {
  const { state } = useApp()
  const { trips, locations } = state

  const todayStr = new Date().toISOString().slice(0, 10)
  const events = trips
    .filter(t => t.isEvent && !t.completed && (t.endDate ?? t.date) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  function getLocation(locationId: string | null): Location | null {
    return locationId ? (locations.find(l => l.id === locationId) ?? null) : null
  }

  if (events.length === 0) {
    return (
      <div className="relative h-full overflow-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(14px) brightness(0.45) saturate(1.2)', transform: 'scale(1.1)' }} />
        </div>
        <div className="relative flex flex-col items-center justify-center h-full text-white/70" style={{ zIndex: 1 }}>
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-5">
            <Star className="h-10 w-10 text-white/50" />
          </div>
          <h3 className="font-gilbert text-xl mb-1 text-white">No upcoming events</h3>
          <p className="text-sm text-center max-w-xs">Check back soon — events will be added by the admin team</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(14px) brightness(0.45) saturate(1.2)', transform: 'scale(1.1)' }} />
      </div>
      <div className="relative flex flex-col px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 lg:py-6 xl:py-8" style={{ zIndex: 1 }}>
        <div className="w-full mb-6">
          <h2 className="font-gilbert text-3xl xl:text-4xl text-white leading-tight drop-shadow">Events</h2>
          <p className="text-sm text-white/70 mt-1">Upcoming events and experiences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map(trip => (
            <EventCard key={trip.id} trip={trip} location={getLocation(trip.locationId)} />
          ))}
        </div>
      </div>
    </div>
  )
}
