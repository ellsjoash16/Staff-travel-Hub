import { useState, useEffect, lazy, Suspense } from 'react'
import { ArrowRight, X, Megaphone, Airplane, ArrowsOut } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'
import { PostCard } from './PostCard'
import { tripImage } from '@/lib/destinationImages'
import { countryFlagUrl } from '@/lib/flags'
import { fmtDate, tripHasPassed } from '@/lib/utils'
import type { View } from '@/lib/types'

const MapView = lazy(() => import('./MapView').then(m => ({ default: m.MapView })))
const StatRing = lazy(() => import('./StatRing'))

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

const SHARE_STEPS = [
  { label: 'Trip details', sub: 'Title, date & destination' },
  { label: 'Photos',       sub: '4–10 of your trip' },
  { label: 'Ratings',      sub: 'Hotels, airlines & more' },
  { label: 'Sales note',   sub: 'Tips for the sales team' },
  { label: 'Review',       sub: 'Optional write-up' },
]

const SMALL_PANELS: {
  key: Exclude<View, 'home'>
  label: string
  sub: string
}[] = [
  { key: 'interest', label: 'My Registrations', sub: 'Track your registered interest'  },
  { key: 'upcoming', label: 'Upcoming Trips',   sub: 'See what\'s coming next'         },
  { key: 'years',    label: 'DAF Adventures',   sub: 'Browse the archive'              },
  { key: 'submit',   label: 'Share My Trip',    sub: 'Submit your own adventure'       },
]

const REG_STATUS: Record<string, { label: string; className: string }> = {
  requested:            { label: 'Requested', className: 'bg-blue-500/15 text-blue-600 border-blue-500/25 dark:text-blue-400' },
  pending_confirmation: { label: 'Pending',   className: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400' },
  confirmed:            { label: 'Confirmed', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' },
  refused:              { label: 'Refused',   className: 'bg-destructive/15 text-destructive border-destructive/25' },
}

// Shared shell for the content-preview panels (map-style live content in a card).
function PreviewPanel({
  title, subtitle, onOpen, filter, children,
}: {
  title: string; subtitle: string; onOpen: () => void; filter?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div
      onClick={onOpen}
      className="relative h-full w-full rounded-2xl border border-border bg-card overflow-hidden group flex flex-col
        cursor-pointer transition-all duration-300 ease-out hover:border-foreground/20 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2.5 flex-shrink-0 border-b border-border/60">
        <div className="min-w-0">
          <p className="text-sm xl:text-base font-semibold text-foreground leading-tight">{title}</p>
          <p className="text-[10px] xl:text-xs text-muted-foreground leading-tight mt-0.5">{subtitle}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
      </div>
      {filter}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">{children}</div>
    </div>
  )
}

// Segmented filter matching the mobile views; stops click propagation so the panel doesn't navigate.
function SegToggle<T extends string>({
  options, value, onChange,
}: {
  options: readonly (readonly [T, string, number])[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 px-2 pt-2 flex-shrink-0">
      {options.map(([key, label, count]) => (
        <button
          key={key}
          onClick={e => { e.stopPropagation(); onChange(key) }}
          className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
            value === key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {label} <span className="opacity-70">({count})</span>
        </button>
      ))}
    </div>
  )
}

function MiniRow({
  photo, title, subtitle, badge,
}: {
  photo: string | null; title: string; subtitle?: string; badge?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-muted/60 transition-colors">
      <div
        className="h-9 w-9 rounded-md overflow-hidden bg-muted flex-shrink-0"
        style={photo ? { backgroundImage: `url("${photo}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {!photo && (
          <div className="h-full w-full flex items-center justify-center">
            <Airplane className="h-4 w-4 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {badge}
    </div>
  )
}

function DafAdventuresPanel({ onOpen }: { onOpen: () => void }) {
  const { state } = useApp()
  const { trips, locations } = state
  const [tab, setTab] = useState<'fam' | 'ext'>('fam')

  const completed = trips
    .filter(t => t.completed && !t.isEvent)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const famTrips = completed.filter(t => !t.external)
  const extTrips = completed.filter(t => t.external)
  const list = tab === 'fam' ? famTrips : extTrips

  return (
    <PreviewPanel
      title="DAF Adventures"
      subtitle={`${famTrips.length} FAM · ${extTrips.length} External`}
      onOpen={onOpen}
      filter={<SegToggle options={[['fam', 'FAM', famTrips.length], ['ext', 'External', extTrips.length]] as const} value={tab} onChange={setTab} />}
    >
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-3">No {tab === 'fam' ? 'FAM' : 'external'} trips yet</p>
      ) : list.slice(0, 12).map(trip => (
        <MiniRow
          key={trip.id}
          photo={tripImage(trip, locations, 0)}
          title={trip.name}
          subtitle={trip.date ? new Date(trip.date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : undefined}
        />
      ))}
    </PreviewPanel>
  )
}

function UpcomingTripsPanel({ onOpen }: { onOpen: () => void }) {
  const { state } = useApp()
  const { trips, locations } = state
  const [tab, setTab] = useState<'trips' | 'events'>('trips')

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcoming = trips.filter(t => t.date >= todayStr && !t.completed && !t.isEvent).sort((a, b) => a.date.localeCompare(b.date))
  const events = trips.filter(t => t.isEvent && !t.completed && (t.endDate ?? t.date) >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
  const list = tab === 'trips' ? upcoming : events

  return (
    <PreviewPanel
      title="Upcoming Trips"
      subtitle={`${upcoming.length} trip${upcoming.length !== 1 ? 's' : ''} · ${events.length} event${events.length !== 1 ? 's' : ''}`}
      onOpen={onOpen}
      filter={<SegToggle options={[['trips', 'Trips', upcoming.length], ['events', 'Events', events.length]] as const} value={tab} onChange={setTab} />}
    >
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-3">No upcoming {tab === 'trips' ? 'trips' : 'events'}</p>
      ) : list.slice(0, 12).map(trip => {
        const ids = trip.locationIds?.length ? trip.locationIds : (trip.locationId ? [trip.locationId] : [])
        const names = ids.map(id => locations.find(l => l.id === id)?.name).filter(Boolean) as string[]
        const place = names.length ? names.join(' · ') : (trip.eventVenue || null)
        const subtitle = [place, fmtDate(trip.date)].filter(Boolean).join(' · ')
        return <MiniRow key={trip.id} photo={trip.image ?? null} title={trip.name} subtitle={subtitle || undefined} />
      })}
    </PreviewPanel>
  )
}

function MyRegistrationsPanel({ onOpen }: { onOpen: () => void }) {
  const { state, dispatch } = useApp()
  const { myRegistrations, trips, locations } = state

  // Hide registrations for trips that have already passed.
  const activeRegistrations = myRegistrations.filter(reg => {
    const trip = trips.find(t => t.id === reg.tripId)
    return !trip || !tripHasPassed(trip)
  })

  return (
    <PreviewPanel
      title="My Registrations"
      subtitle={`${activeRegistrations.length} registration${activeRegistrations.length !== 1 ? 's' : ''}`}
      onOpen={onOpen}
    >
      {activeRegistrations.length === 0 ? (
        <div className="flex flex-col items-start gap-1.5 px-2 py-3">
          <p className="text-xs text-muted-foreground">No registrations yet</p>
          <button
            onClick={e => { e.stopPropagation(); dispatch({ type: 'SET_VIEW', view: 'upcoming' }) }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Browse upcoming trips <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      ) : activeRegistrations.map(reg => {
        const trip = trips.find(t => t.id === reg.tripId)
        const loc = trip?.locationId ? locations.find(l => l.id === trip.locationId) : null
        const cfg = REG_STATUS[reg.status] ?? REG_STATUS.requested
        const subtitle = [loc?.name, trip?.date ? fmtDate(trip.date) : ''].filter(Boolean).join(' · ')
        return (
          <MiniRow
            key={reg.id}
            photo={trip?.image ?? null}
            title={trip?.name ?? reg.tripName}
            subtitle={subtitle || undefined}
            badge={<span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.className}`}>{cfg.label}</span>}
          />
        )
      })}
    </PreviewPanel>
  )
}

function SharePanel({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="relative h-full w-full rounded-2xl border border-border bg-card overflow-hidden group flex flex-col
        cursor-pointer transition-all duration-300 ease-out hover:border-foreground/20 hover:shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0 border-b border-border/60">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Airplane className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm xl:text-base font-semibold text-foreground leading-tight">Share My Trip</p>
          <p className="text-[10px] xl:text-xs text-muted-foreground leading-tight mt-0.5">5 steps · about 2 minutes</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {SHARE_STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-lg p-1.5">
            <div className="h-6 w-6 rounded-full bg-muted text-foreground/70 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">{i + 1}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{s.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Start */}
      <div className="p-2.5 pt-0 flex-shrink-0">
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium py-2 group-hover:bg-primary/90 transition-colors">
          Start <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
        </div>
      </div>
    </div>
  )
}

export function HomeView() {
  const { state, dispatch } = useApp()
  const { settings, posts, locations, trips } = state
  const tallScreen = useMediaQuery('(min-height: 900px)')

  const feedPosts = [...posts]
    .filter(p => !p.isAirline)
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : ((b.date || '') < (a.date || '') ? -1 : 1)))

  const year = new Date().getFullYear()
  // Match the DAF Adventures archive: completed (FAM + External) trips this year
  const tripsThisYear = trips.filter(t => t.completed && !t.isEvent && (t.date || '').startsWith(String(year))).length
  const destCounts = new Map<string, number>()
  posts.forEach(p => {
    const ids = p.locationIds?.length ? p.locationIds : (p.locationId ? [p.locationId] : [])
    ids.forEach(id => destCounts.set(id, (destCounts.get(id) ?? 0) + 1))
  })
  const topDestId = [...destCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const topLoc = topDestId ? locations.find(l => l.id === topDestId) : null
  const topDest = topLoc?.name ?? '—'
  const topFlagUrl = topLoc ? countryFlagUrl(topLoc.country) : null

  const countriesVisited = new Set(locations.map(l => l.country)).size
  const worldPct = Math.round((countriesVisited / 195) * 100) // 195 countries in the world

  const feedStats: { top?: React.ReactNode; value?: string | number; label: string }[] = [
    { top: topFlagUrl ? <img src={topFlagUrl} alt="" className="h-16 w-16 rounded-lg shadow-sm" /> : null, value: topDest, label: 'Most visited' },
    { value: tripsThisYear, label: `Trips in ${year}` },
    { value: locations.length, label: 'Destinations' },
    { top: <Suspense fallback={<div className="h-12 w-12" />}><StatRing pct={worldPct} /></Suspense>, label: 'Of the world' },
  ]

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
    <div className="h-full min-h-0 mx-auto w-full max-w-[2200px] flex flex-col md:grid md:grid-cols-[repeat(3,minmax(0,1fr))_1.4fr] md:grid-rows-[1.15fr_1fr] gap-2 md:gap-3 2xl:gap-4">

      {/* ── Latest staff adventures — compact feed in the top-left three columns ── */}
      <div
        onClick={() => navigate('feed')}
        className="group/latest flex flex-col gap-2.5 flex-1 md:flex-none md:col-span-3 min-h-0 cursor-pointer"
      >
        {notice && !noticeDismissed && (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-2.5 flex-shrink-0">
            <Megaphone className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-xs text-muted-foreground leading-relaxed">{notice}</p>
            <button
              onClick={e => { e.stopPropagation(); dismissNotice() }}
              className="flex-shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-base lg:text-lg xl:text-xl font-semibold text-foreground leading-tight">{settings.heading || 'Latest Adventures'}</p>
            <p className="text-[10px] xl:text-xs text-muted-foreground leading-tight mt-0.5">
              {feedPosts.length} trip{feedPosts.length !== 1 ? 's' : ''} shared
            </p>
          </div>
          <button
            onClick={() => navigate('feed')}
            className="flex items-center gap-1.5 text-muted-foreground/60 group-hover/latest:text-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <span className="text-base lg:text-lg xl:text-xl font-semibold">Go</span>
            <ArrowRight className="h-5 w-5 lg:h-6 lg:w-6 group-hover/latest:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>

        {/* Feed-style post cards */}
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center">
          {feedPosts.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center text-center gap-2 py-6">
              <p className="text-sm font-medium text-foreground">No trips shared yet</p>
              <button
                onClick={() => navigate('submit')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                Be the first to share one <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 w-full">
              {feedPosts.slice(0, 3).map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  compact
                  onClick={() => dispatch({ type: 'SET_OPEN_POST', post })}
                  tiltDir={i % 2 === 0 ? 1 : -1}
                  locationNames={(post.locationIds?.length ? post.locationIds : (post.locationId ? [post.locationId] : []))
                    .map(id => locations.find(l => l.id === id)?.name).filter(Boolean) as string[]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick stats — only shown on taller screens to fill the space */}
        {tallScreen && (
        <div
          onClick={e => e.stopPropagation()}
          className="grid grid-cols-4 gap-2 flex-shrink-0 cursor-default"
        >
          {feedStats.map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-3 py-5 flex flex-col items-center justify-center gap-2 text-center min-w-0 min-h-[11rem]">
              {s.top}
              {s.value !== undefined && (
                <p className="w-full text-2xl xl:text-3xl font-bold text-foreground leading-tight tracking-tight truncate">{s.value}</p>
              )}
              <p className="w-full text-[10px] uppercase tracking-wide text-muted-foreground truncate">{s.label}</p>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Live map — top-right, wider column. Desktop only. */}
      <div className="hidden md:block relative min-h-0 rounded-2xl overflow-hidden border border-border shadow-sm">
        <Suspense fallback={<div className="h-full w-full bg-muted animate-pulse" />}>
          <MapView onSelectPost={(post) => dispatch({ type: 'SET_OPEN_POST', post })} compact />
        </Suspense>
        <button
          onClick={() => navigate('map')}
          className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-background/85 hover:bg-background backdrop-blur-sm border border-border px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm transition-colors"
        >
          <ArrowsOut className="h-3.5 w-3.5" /> Open map
        </button>
      </div>

      {/* Nav panels — bottom row, desktop only; on mobile the footer Menu handles navigation */}
      {SMALL_PANELS.map(p => (
        <div key={p.key} className="hidden md:block min-h-0">
          {p.key === 'years' ? (
            <DafAdventuresPanel onOpen={() => navigate('years')} />
          ) : p.key === 'upcoming' ? (
            <UpcomingTripsPanel onOpen={() => navigate('upcoming')} />
          ) : p.key === 'interest' ? (
            <MyRegistrationsPanel onOpen={() => navigate('interest')} />
          ) : (
            <SharePanel onOpen={() => navigate('submit')} />
          )}
        </div>
      ))}
    </div>
  )
}
