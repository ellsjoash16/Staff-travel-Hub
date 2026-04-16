import { Camera, Globe2, BookOpen, CalendarDays, Send, ArrowRight } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { View } from '@/lib/types'

interface PanelConfig {
  key: Exclude<View, 'home'>
  icon: React.ReactNode
  title: (heading: string) => string
  subtitle: string
}

const PANELS: PanelConfig[] = [
  {
    key: 'feed',
    icon: <Camera className="h-7 w-7 text-white drop-shadow" />,
    title: (heading) => heading || 'Staff Adventures',
    subtitle: 'See where the team has been',
  },
  {
    key: 'map',
    icon: <Globe2 className="h-6 w-6 text-white drop-shadow" />,
    title: () => 'World Map',
    subtitle: 'Explore destinations',
  },
  {
    key: 'courses',
    icon: <BookOpen className="h-6 w-6 text-white drop-shadow" />,
    title: () => 'Training Courses',
    subtitle: 'Learn before you go',
  },
  {
    key: 'years',
    icon: <CalendarDays className="h-6 w-6 text-white drop-shadow" />,
    title: () => 'By Year',
    subtitle: 'Browse by year',
  },
  {
    key: 'submit',
    icon: <Send className="h-6 w-6 text-white drop-shadow" />,
    title: () => 'Share Your Trip',
    subtitle: 'Submit your own adventure',
  },
]

export function HomeView() {
  const { state, dispatch } = useApp()
  const { settings } = state

  function navigate(view: Exclude<View, 'home'>) {
    dispatch({ type: 'SET_VIEW', view })
  }

  function PanelCard({
    panel,
    className,
  }: {
    panel: PanelConfig
    className?: string
  }) {
    const bgImage = settings.panelImages?.[panel.key] ?? null
    const isFeed = panel.key === 'feed'

    return (
      <div
        className={`relative overflow-hidden rounded-2xl cursor-pointer group ${className ?? ''}`}
        onClick={() => navigate(panel.key)}
      >
        {/* Background */}
        {bgImage ? (
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20" />
        )}

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end p-4 sm:p-5">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              {panel.icon}
              <h2
                className={`font-outfit font-bold text-white drop-shadow-md ${
                  isFeed ? 'text-2xl' : 'text-xl'
                }`}
              >
                {panel.title(settings.heading)}
              </h2>
              <p className="text-white/80 text-sm">{panel.subtitle}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/0 group-hover:text-white/80 transition-all duration-200 flex-shrink-0 mb-1 translate-x-1 group-hover:translate-x-0" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-2">
      {/* Page heading */}
      <h1 className="font-outfit font-bold text-3xl sm:text-4xl text-foreground">
        {settings.title}
      </h1>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1 — Feed (col-span-2) + Map */}
        <PanelCard
          panel={PANELS[0]}
          className="h-[280px] md:h-[360px] md:col-span-2"
        />
        <PanelCard
          panel={PANELS[1]}
          className="h-[180px] md:h-[360px] md:col-span-1"
        />

        {/* Row 2 — Courses, Years, Submit */}
        <PanelCard
          panel={PANELS[2]}
          className="h-[180px] md:h-[200px]"
        />
        <PanelCard
          panel={PANELS[3]}
          className="h-[180px] md:h-[200px]"
        />
        <PanelCard
          panel={PANELS[4]}
          className="h-[180px] md:h-[200px]"
        />
      </div>
    </div>
  )
}
