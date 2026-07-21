import { Plane, MapPin, Calendar, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'
import type { Registration } from '@/lib/types'

const BG = 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=400&q=40'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  requested:            { label: 'Requested',   icon: Clock,        className: 'bg-blue-500/15 text-blue-600 border-blue-500/25 dark:text-blue-400' },
  pending_confirmation: { label: 'Pending',      icon: AlertCircle,  className: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400' },
  confirmed:            { label: 'Confirmed',    icon: CheckCircle,  className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' },
  refused:              { label: 'Refused',      icon: XCircle,      className: 'bg-destructive/15 text-destructive border-destructive/25' },
}

function RegistrationCard({ reg, trip }: { reg: Registration; trip: { name: string; date: string; image: string | null; locationName: string | null } | null }) {
  const cfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.requested
  const StatusIcon = cfg.icon
  const name = trip?.name ?? reg.tripName
  const date = trip?.date ?? ''
  const image = trip?.image ?? null
  const locationName = trip?.locationName ?? null

  return (
    <div className="rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Image */}
      <div className="relative w-full h-28 sm:h-36">
        {image ? (
          <img src={image} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <Plane className="h-8 w-8 sm:h-10 sm:w-10 text-primary/25" />
          </div>
        )}
        <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border text-[10px] sm:text-xs font-semibold backdrop-blur-sm bg-background/80 ${cfg.className}`}>
          <StatusIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {cfg.label}
        </div>
      </div>

      {/* Details */}
      <div className="p-3 sm:p-4">
        <h3 className="font-gilbert text-sm sm:text-lg leading-tight mb-1 sm:mb-1.5 line-clamp-2">{name}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
          {locationName && (
            <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />{locationName}</span>
          )}
          {date && (
            <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />{fmtDate(date)}</span>
          )}
        </div>
        {reg.status === 'refused' && (
          <p className="text-[10px] sm:text-xs text-destructive/80 mt-1.5 sm:mt-2 leading-snug">Registration unsuccessful — contact admin for details.</p>
        )}
        {reg.status === 'confirmed' && (
          <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 sm:mt-2 leading-snug">Confirmed! The admin team will be in touch.</p>
        )}
      </div>
    </div>
  )
}

export function MyRegistrationsView() {
  const { state } = useApp()
  const { myRegistrations, trips, locations } = state

  function getTripInfo(reg: Registration) {
    const trip = trips.find(t => t.id === reg.tripId)
    if (!trip) return null
    const loc = trip.locationId ? locations.find(l => l.id === trip.locationId) : null
    return { name: trip.name, date: trip.date, image: trip.image, locationName: loc?.name ?? null }
  }

  return (
    <div className="relative h-full overflow-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(14px) brightness(0.45) saturate(1.2)', transform: 'scale(1.1)' }} />
      </div>

      {myRegistrations.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center h-full text-white/70" style={{ zIndex: 1 }}>
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-5">
            <Plane className="h-10 w-10 text-white/50" />
          </div>
          <h3 className="font-gilbert text-xl mb-1 text-white">No registrations yet</h3>
          <p className="text-sm text-center max-w-xs">Head to Upcoming Trips and register your interest to see your status here</p>
        </div>
      ) : (
        <div className="relative flex flex-col px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-5 lg:py-6 xl:py-8" style={{ zIndex: 1 }}>
          <div className="w-full mb-3 sm:mb-6">
            <h2 className="font-gilbert text-2xl sm:text-3xl xl:text-4xl text-white leading-tight drop-shadow">My Registrations</h2>
            <p className="text-xs sm:text-sm text-white/70 mt-1">Track the status of your trip registrations</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {myRegistrations.map(reg => (
              <RegistrationCard key={reg.id} reg={reg} trip={getTripInfo(reg)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
