import { useState } from 'react'
import { Camera, Globe2, Plane, CalendarDays, Send, ArrowRight, ClipboardCheck, X, Megaphone } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { auth } from '@/lib/firebase'
import type { View } from '@/lib/types'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1746125047145-d6698eef563a?auto=format&fit=crop&crop=center&w=1920&h=800&q=80'

const SMALL_PANELS: {
  key: Exclude<View, 'home'>
  Icon: React.ElementType
  label: string
  sub: string
  color: string
}[] = [
  { key: 'map',      Icon: Globe2,        label: 'World Map',        sub: 'Explore destinations',           color: 'bg-primary/10 text-primary' },
  { key: 'upcoming', Icon: Plane,         label: 'Upcoming Trips',   sub: 'See what\'s coming next',        color: 'bg-primary/10 text-primary' },
  { key: 'years',    Icon: CalendarDays,  label: 'Trips By Year',    sub: 'Browse the archive',             color: 'bg-primary/10 text-primary' },
  { key: 'interest', Icon: ClipboardCheck,label: 'My Registrations', sub: 'Track your registered interest', color: 'bg-primary/10 text-primary' },
  { key: 'submit',   Icon: Send,          label: 'Share Your Trip',  sub: 'Submit your own adventure',      color: 'bg-primary/10 text-primary' },
]

function SmallCard({
  Icon, label, sub, color, onClick, className,
}: {
  Icon: React.ElementType; label: string; sub: string; color: string
  onClick: () => void; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`relative h-full w-full text-left rounded-2xl border border-border bg-card
        cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        overflow-hidden ${className ?? ''}`}
    >
      <div className="p-4 2xl:p-5 h-full flex flex-col">
        <div className={`w-9 h-9 2xl:w-10 2xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="h-4.5 w-4.5 2xl:h-5 2xl:w-5" />
        </div>
        <div className="flex-1" />
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground text-sm 2xl:text-base leading-tight">{label}</p>
            <p className="text-muted-foreground text-xs mt-0.5 leading-tight">{sub}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-200 flex-shrink-0 mb-0.5" />
        </div>
      </div>
    </button>
  )
}

export function HomeView() {
  const { state, dispatch } = useApp()
  const { settings } = state
  const rawFirst = auth.currentUser?.displayName?.split(' ')[0] ?? null
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
    <div className="flex flex-col gap-3 2xl:gap-4 h-full min-h-0">

      {/* ── Hero ── */}
      <div
        className="relative flex-[2] min-h-0 rounded-2xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-shadow duration-200 flex-shrink-0"
        style={{ minHeight: '180px' }}
        onClick={() => navigate('feed')}
      >
        <img
          src={HERO_IMAGE}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        {/* Notice */}
        {notice && !noticeDismissed && (
          <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-md flex items-start gap-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 px-3.5 py-2.5">
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
        <div className="relative h-full flex flex-col justify-end p-5 sm:p-6 2xl:p-8">
          {firstName && (
            <p className="text-white/60 text-sm 2xl:text-base font-medium mb-2 tracking-wide">
              Welcome back, {firstName}
            </p>
          )}
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-bold text-white text-3xl sm:text-4xl 2xl:text-5xl leading-none tracking-tight drop-shadow-lg">
                {settings.heading || 'Staff Adventures'}
              </h1>
              <p className="text-white/60 text-sm 2xl:text-base mt-2 tracking-wide">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mb-1">
              <div className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors duration-200 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                <Camera className="h-3.5 w-3.5 text-white" />
                <span className="text-white text-sm font-medium">Browse Feed</span>
                <ArrowRight className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Small cards grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 2xl:gap-4 flex-1 min-h-0"
        style={{ minHeight: '120px' }}>
        {SMALL_PANELS.map(p => (
          <SmallCard
            key={p.key}
            Icon={p.Icon}
            label={p.label}
            sub={p.sub}
            color={p.color}
            onClick={() => navigate(p.key)}
          />
        ))}
      </div>
    </div>
  )
}
