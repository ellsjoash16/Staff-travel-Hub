import { useState } from 'react'
import { Camera, Globe, Airplane, CalendarDots, PaperPlaneTilt, ArrowRight, CheckSquare as ClipboardText, X, Megaphone } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'
import { auth } from '@/lib/firebase'
import type { View } from '@/lib/types'

const HERO_IMAGE = '/hero-airport.jpg'

const SMALL_PANELS: {
  key: Exclude<View, 'home'>
  Icon: React.ElementType
  label: string
  sub: string
}[] = [
  { key: 'map',      Icon: Globe,         label: 'World Map',        sub: 'Explore destinations'            },
  { key: 'upcoming', Icon: Airplane,       label: 'Upcoming Trips',   sub: 'See what\'s coming next'         },
  { key: 'years',    Icon: CalendarDots,   label: 'DAF Adventures',   sub: 'Browse the archive'              },
  { key: 'interest', Icon: ClipboardText,  label: 'My Registrations', sub: 'Track your registered interest'  },
  { key: 'submit',   Icon: PaperPlaneTilt, label: 'Share My Trip',    sub: 'Submit your own adventure'       },
]

function SmallCard({
  Icon, label, sub, stat, statLabel, onClick,
}: {
  Icon: React.ElementType; label: string; sub: string; stat?: string; statLabel?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative h-full w-full text-left rounded-2xl border border-border bg-card
        cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
    >
      <div className="p-4 2xl:p-5 h-full flex flex-col">
        <Icon className="h-5 w-5 2xl:h-6 2xl:w-6 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 flex flex-col justify-end py-2 gap-0.5">
          <p className="text-2xl md:text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold text-foreground leading-tight tracking-tight line-clamp-2">{label}</p>
          <p className="text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs text-muted-foreground leading-tight line-clamp-2">{sub}</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            {stat && (
              <p className="font-semibold text-foreground text-sm md:text-[11px] lg:text-xs xl:text-sm 2xl:text-base leading-tight">
                {stat}
                {statLabel && <span className="font-normal text-muted-foreground"> {statLabel}</span>}
              </p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-200 flex-shrink-0 mb-0.5" />
        </div>
      </div>
    </button>
  )
}

export function HomeView() {
  const { state, dispatch } = useApp()
  const { settings, posts, trips, locations, myRegistrations } = state
  const rawFirst = auth.currentUser?.displayName?.split(' ')[0] ?? null

  const today = new Date().toISOString().slice(0, 10)
  const futureTrips = trips.filter(t => t.date >= today)
  const nextTrip = futureTrips.sort((a, b) => a.date.localeCompare(b.date))[0]

  const cardStats: Partial<Record<Exclude<View, 'home'>, { stat: string; statLabel?: string }>> = {
    map:      { stat: String(locations.length), statLabel: locations.length === 1 ? 'destination' : 'destinations' },
    upcoming: futureTrips.length > 0
      ? { stat: nextTrip?.name ?? String(futureTrips.length), statLabel: 'next trip' }
      : { stat: 'None yet' },
    years:    { stat: String(posts.length), statLabel: posts.length === 1 ? 'trip shared' : 'trips shared' },
    interest: myRegistrations.length > 0
      ? { stat: String(myRegistrations.length), statLabel: myRegistrations.length === 1 ? 'trip registered' : 'trips registered' }
      : { stat: 'None yet' },
  }
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : null

  const notice = settings.notice?.trim() ?? ''
  const dismissKey = notice ? `notice-dismissed-${btoa(encodeURIComponent(notice)).slice(0, 20)}` : ''
  const [noticeDismissed, setNoticeDismissed] = useState(() =>
    dismissKey ? localStorage.getItem(dismissKey) === '1' : true
  )

  function dismissNotice() {
    if (dismissKey) localStorage.setItem(dismissKey, '1')
    setNoticeDismissed(true)
  }

  function navigate(view: Exclude<View, 'home'>) {
    dispatch({ type: 'SET_VIEW', view })
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-3 2xl:gap-4 h-full min-h-0">

      {/* ── Hero ── */}
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-shadow duration-200
          flex-1 sm:flex-[2] min-h-0"
        onClick={() => navigate('feed')}
      >
        <img
          src={HERO_IMAGE}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        {/* Notice */}
        {notice && !noticeDismissed && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md flex items-start gap-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 px-3 py-2">
            <Megaphone className="h-3.5 w-3.5 text-white/80 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-xs text-white/90 leading-relaxed">{notice}</p>
            <button
              onClick={e => { e.stopPropagation(); dismissNotice() }}
              className="flex-shrink-0 text-white/50 hover:text-white transition-colors mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Bottom content */}
        <div className="relative h-full flex flex-col justify-end p-4 sm:p-6 2xl:p-8">
          {firstName && (
            <p className="text-white/60 text-xs sm:text-sm 2xl:text-base font-medium mb-1 sm:mb-2 tracking-wide">
              Welcome back, {firstName}
            </p>
          )}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-bold text-white text-2xl sm:text-4xl 2xl:text-5xl leading-tight sm:leading-none tracking-tight drop-shadow-lg">
                {settings.heading || 'Staff Adventures'}
              </h1>
              <p className="hidden sm:block text-white/60 text-sm 2xl:text-base mt-2 tracking-wide">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex-shrink-0 mb-0.5">
              <div className="flex items-center gap-2 sm:gap-2.5 bg-white/15 hover:bg-white/25 transition-colors duration-200 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-2.5 sm:px-4 sm:py-3">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav cards — desktop only; on mobile the footer Menu handles navigation */}
      <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-5 gap-3 2xl:gap-4 flex-1 min-h-0">
        {SMALL_PANELS.map(p => (
          <SmallCard
            key={p.key}
            Icon={p.Icon}
            label={p.label}
            sub={p.sub}
            stat={cardStats[p.key]?.stat}
            statLabel={cardStats[p.key]?.statLabel}
            onClick={() => navigate(p.key)}
          />
        ))}
      </div>
    </div>
  )
}
