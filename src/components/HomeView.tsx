import { useState } from 'react'
import { Camera, Globe2, Plane, CalendarDays, Send, ArrowRight, ClipboardCheck, X, Megaphone } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { auth } from '@/lib/firebase'
import type { View } from '@/lib/types'

interface PanelConfig {
  key: Exclude<View, 'home'>
  Icon: React.ElementType
  title: (heading: string) => string
  subtitle: string
  bg: string
  shine: string
}

const PANELS: PanelConfig[] = [
  {
    key: 'feed',
    Icon: Camera,
    title: (h) => h || 'Staff Adventures',
    subtitle: 'See where the team has been',
    bg: '#0a4453',
    shine: '#0d6278',
  },
  {
    key: 'map',
    Icon: Globe2,
    title: () => 'World Map',
    subtitle: 'Explore destinations',
    bg: '#111827',
    shine: '#1f2f46',
  },
  {
    key: 'upcoming',
    Icon: Plane,
    title: () => 'Upcoming Trips',
    subtitle: 'See what\'s coming next',
    bg: '#0a3728',
    shine: '#0f5238',
  },
  {
    key: 'years',
    Icon: CalendarDays,
    title: () => 'Trips By Year',
    subtitle: 'Browse the archive',
    bg: '#2a1254',
    shine: '#3d1a7a',
  },
  {
    key: 'interest',
    Icon: ClipboardCheck,
    title: () => 'My Registrations',
    subtitle: 'Track your registered interest',
    bg: '#0d2e50',
    shine: '#1a4a7a',
  },
  {
    key: 'submit',
    Icon: Send,
    title: () => 'Share Your Trip',
    subtitle: 'Submit your own adventure',
    bg: '#4a1c10',
    shine: '#6b2a18',
  },
]

function PanelCard({
  panel,
  className,
  onClick,
  headingText,
  large,
}: {
  panel: PanelConfig
  className?: string
  onClick: () => void
  headingText: string
  large?: boolean
}) {
  const { Icon } = panel

  return (
    <div
      className={`relative h-full rounded-2xl overflow-hidden cursor-pointer group
        transition-all duration-200 ease-out hover:-translate-y-0.5
        shadow-sm hover:shadow-lg ${className ?? ''}`}
      style={{ background: panel.bg }}
      onClick={onClick}
    >
      {/* Top-corner shine */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-30 blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-50"
        style={{ background: panel.shine }}
      />

      {/* Subtle inner border */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/8 pointer-events-none" />

      {/* Content */}
      <div className="relative h-full flex flex-col p-5 2xl:p-7">
        {/* Top row: icon + arrow */}
        <div className="flex items-start justify-between">
          <div className={`flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm
            ${large ? 'w-12 h-12 2xl:w-14 2xl:h-14' : 'w-10 h-10'}`}>
            <Icon className={`text-white ${large ? 'h-6 w-6 2xl:h-7 2xl:w-7' : 'h-5 w-5'}`} />
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/0
            group-hover:border-white/20 group-hover:bg-white/10 transition-all duration-200">
            <ArrowRight className="h-4 w-4 text-white/0 group-hover:text-white/80 transition-all duration-200" />
          </div>
        </div>

        <div className="flex-1" />

        {/* Bottom: text */}
        <div className="space-y-1 2xl:space-y-1.5">
          <h2 className={`font-bold text-white leading-tight tracking-tight
            ${large ? 'text-2xl sm:text-3xl 2xl:text-4xl' : 'text-lg sm:text-xl 2xl:text-2xl'}`}>
            {panel.title(headingText)}
          </h2>
          <p className={`text-white/50 font-medium ${large ? 'text-sm 2xl:text-base' : 'text-xs 2xl:text-sm'}`}>
            {panel.subtitle}
          </p>
        </div>
      </div>
    </div>
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

  const [feed, map, upcoming, years, interest, submit] = PANELS

  return (
    <div className="flex flex-col gap-3 2xl:gap-4 h-full min-h-0">
      {firstName && (
        <div className="flex items-baseline justify-between gap-4 flex-shrink-0">
          <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-none">
            Hello, {firstName}
          </p>
          <p className="text-sm text-muted-foreground hidden sm:block flex-shrink-0">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      )}

      {notice && !noticeDismissed && (
        <div className="flex-shrink-0 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-4 py-3">
          <Megaphone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-foreground/90 leading-relaxed">{notice}</p>
          <button onClick={dismissNotice} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 2xl:gap-4
        flex-1 min-h-0
        [grid-auto-rows:180px]
        sm:[grid-auto-rows:unset] sm:[grid-template-rows:repeat(4,minmax(0,1fr))]
        md:[grid-template-rows:repeat(3,minmax(0,1fr))]">

        {/* Row 1: Feed (2/3) + Map (1/3) */}
        <PanelCard panel={feed} className="sm:col-span-2 md:col-span-4" onClick={() => navigate('feed')} headingText={settings.heading} large />
        <PanelCard panel={map}  className="md:col-span-2"               onClick={() => navigate('map')}  headingText="" />

        {/* Row 2: Upcoming + Years */}
        <PanelCard panel={upcoming} className="md:col-span-3" onClick={() => navigate('upcoming')} headingText="" />
        <PanelCard panel={years}    className="md:col-span-3" onClick={() => navigate('years')}    headingText="" />

        {/* Row 3: Registrations + Submit */}
        <PanelCard panel={interest} className="md:col-span-3" onClick={() => navigate('interest')} headingText="" />
        <PanelCard panel={submit}   className="md:col-span-3" onClick={() => navigate('submit')}   headingText="" />
      </div>
    </div>
  )
}
