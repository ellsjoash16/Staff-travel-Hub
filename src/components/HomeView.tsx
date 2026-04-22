import { useState, useEffect, useRef } from 'react'
import Globe, { GlobeMethods } from 'react-globe.gl'
import { Camera, BookOpen, CalendarDays, Send, ArrowRight, Globe2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { View } from '@/lib/types'

interface PanelConfig {
  key: Exclude<View, 'home'>
  icon: React.ReactNode
  title: (heading: string) => string
  subtitle: string
  color: string
}

const PANELS: PanelConfig[] = [
  {
    key: 'feed',
    icon: <Camera className="h-6 w-6 text-white" />,
    title: (heading) => heading || 'Staff Adventures',
    subtitle: 'See where the team has been',
    color: 'from-cyan-500/30 to-teal-600/20',
  },
  {
    key: 'courses',
    icon: <BookOpen className="h-5 w-5 text-white" />,
    title: () => 'Training Courses',
    subtitle: 'Learn before you go',
    color: 'from-emerald-500/30 to-green-600/20',
  },
  {
    key: 'years',
    icon: <CalendarDays className="h-5 w-5 text-white" />,
    title: () => 'By Year',
    subtitle: 'Browse by year',
    color: 'from-violet-500/30 to-purple-600/20',
  },
  {
    key: 'submit',
    icon: <Send className="h-5 w-5 text-white" />,
    title: () => 'Share Your Trip',
    subtitle: 'Submit your own adventure',
    color: 'from-orange-500/30 to-amber-600/20',
  },
]

// ── Mini globe panel ────────────────────────────────────────────────────────

function MapPanel({ className, onClick }: { className?: string; onClick: () => void }) {
  const { state } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [dims, setDims] = useState({ w: 400, h: 360 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDims({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pinColor = state.settings.color || '#05979a'

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl cursor-pointer group ${className ?? ''}`}
      style={{ background: '#060c1a' }}
      onClick={onClick}
    >
      <div className="absolute inset-0 pointer-events-none">
        <Globe
          ref={globeRef}
          width={dims.w}
          height={dims.h}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          showAtmosphere
          atmosphereColor={pinColor}
          atmosphereAltitude={0.18}
          onGlobeReady={() => {
            if (globeRef.current) {
              globeRef.current.controls().autoRotate = true
              globeRef.current.controls().autoRotateSpeed = 0.6
              globeRef.current.controls().enableZoom = false
              globeRef.current.controls().enableRotate = false
              globeRef.current.controls().enablePan = false
            }
          }}
        />
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 60px rgba(5,151,154,0.15)' }} />

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

      <div className="relative h-full flex flex-col justify-end p-4 sm:p-5 pointer-events-none">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Globe2 className="h-5 w-5 text-white" />
            </div>
            <h2 className="font-outfit font-bold text-white text-xl drop-shadow-md">World Map</h2>
            <p className="text-white/75 text-sm">Explore destinations</p>
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/15 transition-all duration-200 mb-1">
            <ArrowRight className="h-4 w-4 text-white/0 group-hover:text-white transition-all duration-200 translate-x-1 group-hover:translate-x-0" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Panel card ──────────────────────────────────────────────────────────────

function PanelCard({
  panel,
  className,
  onClick,
  bgImage,
  headingText,
}: {
  panel: PanelConfig
  className?: string
  onClick: () => void
  bgImage: string | null
  headingText: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl cursor-pointer group shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${className ?? ''}`}
      onClick={onClick}
    >
      {bgImage ? (
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${panel.color} border border-primary/10`} />
      )}

      {/* Hover glow overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/5" />

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      <div className="relative h-full flex flex-col justify-end p-4 sm:p-5">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              {panel.icon}
            </div>
            <h2 className="font-outfit font-bold text-white text-xl drop-shadow-md">
              {panel.title(headingText)}
            </h2>
            <p className="text-white/75 text-sm">{panel.subtitle}</p>
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/15 transition-all duration-200 mb-1">
            <ArrowRight className="h-4 w-4 text-white/0 group-hover:text-white transition-all duration-200 translate-x-1 group-hover:translate-x-0" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Home view ───────────────────────────────────────────────────────────────

export function HomeView() {
  const { state, dispatch } = useApp()
  const { settings } = state

  function navigate(view: Exclude<View, 'home'>) {
    dispatch({ type: 'SET_VIEW', view })
  }

  return (
    <div className="py-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PanelCard
          panel={PANELS[0]}
          className="h-[280px] md:h-[360px] md:col-span-2"
          onClick={() => navigate('feed')}
          bgImage={settings.panelImages?.feed ?? null}
          headingText={settings.heading}
        />
        <MapPanel
          className="h-[220px] md:h-[360px] md:col-span-1"
          onClick={() => navigate('map')}
        />

        {PANELS.slice(1).map(panel => (
          <PanelCard
            key={panel.key}
            panel={panel}
            className="h-[180px] md:h-[200px]"
            onClick={() => navigate(panel.key)}
            bgImage={(settings.panelImages as unknown as Record<string, string | null>)?.[panel.key] ?? null}
            headingText={settings.heading}
          />
        ))}
      </div>
    </div>
  )
}
