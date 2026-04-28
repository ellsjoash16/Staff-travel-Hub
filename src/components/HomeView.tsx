import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { Camera, Plane, CalendarDays, Send, ArrowRight, Globe2 } from 'lucide-react'

const Globe = lazy(() => import('react-globe.gl'))
import { useApp } from '@/context/AppContext'
import type { View } from '@/lib/types'

interface PanelConfig {
  key: Exclude<View, 'home'>
  icon: React.ReactNode
  title: (heading: string) => string
  subtitle: string
  color: string
}

const PANEL_IMAGES: Partial<Record<string, string>> = {
  feed:    'https://firebasestorage.googleapis.com/v0/b/daf-fam-trips.firebasestorage.app/o/images%2Fpanel-feed-1777296695807.jpg?alt=media&token=078c590d-47cf-425d-b29a-97df70829b49',
  upcoming: 'https://firebasestorage.googleapis.com/v0/b/daf-fam-trips.firebasestorage.app/o/images%2Fpanel-courses-1777296696827.jpg?alt=media&token=bd530e62-64ea-4fbf-b7eb-7ab02f622393',
  years:   'https://firebasestorage.googleapis.com/v0/b/daf-fam-trips.firebasestorage.app/o/images%2Fpanel-years-1777296697735.jpg?alt=media&token=804fe1e5-38c5-4157-bc8b-2849939bed75',
  submit:  'https://firebasestorage.googleapis.com/v0/b/daf-fam-trips.firebasestorage.app/o/images%2Fpanel-submit-1777296698453.jpg?alt=media&token=dd03c0ed-40db-4b92-badf-944c08d69409',
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
    key: 'upcoming',
    icon: <Plane className="h-5 w-5 text-white" />,
    title: () => 'Upcoming Trips',
    subtitle: 'See what\'s coming next',
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

// ── Tilt hook ────────────────────────────────────────────────────────────────

function useTilt(deg = 7) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: 'perspective(900px)',
    transition: 'transform 0.5s ease-out',
    willChange: 'transform',
  })

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const nx = ((e.clientX - left) / width - 0.5) * 2
    const ny = ((e.clientY - top) / height - 0.5) * 2
    setStyle({
      transform: `perspective(900px) rotateY(${nx * deg}deg) rotateX(${-ny * deg}deg) translateY(-5px) scale(1.015)`,
      transition: 'transform 0.08s ease-out',
      willChange: 'transform',
    })
  }

  function onMouseLeave() {
    setStyle({
      transform: 'perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0px) scale(1)',
      transition: 'transform 0.5s ease-out',
      willChange: 'transform',
    })
  }

  return { ref, style, onMouseMove, onMouseLeave }
}

// ── Mini globe panel ─────────────────────────────────────────────────────────

function MapPanel({ onClick }: { onClick: () => void }) {
  const { state } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [dims, setDims] = useState({ w: 400, h: 360 })
  const tilt = useTilt(5)

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
    <div ref={tilt.ref} style={tilt.style} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
      className="h-full rounded-2xl overflow-hidden"
    >
      <div
        ref={containerRef}
        className="relative h-full overflow-hidden rounded-2xl cursor-pointer group shadow-md"
        style={{ background: '#060c1a' }}
        onClick={onClick}
      >
        <div className="absolute inset-0 pointer-events-none">
          <Suspense fallback={null}>
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
          </Suspense>
        </div>

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 60px rgba(5,151,154,0.2)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

        <div className="relative h-full flex flex-col justify-end p-4 sm:p-5 2xl:p-7 pointer-events-none">
          <div className="flex items-end justify-between">
            <div className="space-y-1.5 2xl:space-y-2">
              <div className="w-9 h-9 2xl:w-11 2xl:h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Globe2 className="h-5 w-5 2xl:h-6 2xl:w-6 text-white" />
              </div>
              <h2 className="font-gilbert text-white text-2xl sm:text-3xl 2xl:text-4xl drop-shadow-lg leading-none">
                World Map
              </h2>
              <p className="text-white/70 text-sm 2xl:text-base tracking-wide">Explore destinations</p>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/0 group-hover:bg-white/20 transition-all duration-200 mb-1 border border-white/0 group-hover:border-white/30">
              <ArrowRight className="h-4 w-4 text-white/0 group-hover:text-white transition-all duration-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Panel card ───────────────────────────────────────────────────────────────

function PanelCard({
  panel,
  className,
  onClick,
  bgImage,
  headingText,
  large,
}: {
  panel: PanelConfig
  className?: string
  onClick: () => void
  bgImage: string | null
  headingText: string
  large?: boolean
}) {
  const tilt = useTilt(large ? 5 : 7)

  return (
    <div ref={tilt.ref} style={tilt.style} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
      className={`h-full rounded-2xl overflow-hidden ${className ?? ''}`}
    >
      <div
        className="relative h-full overflow-hidden rounded-2xl cursor-pointer group shadow-md"
        onClick={onClick}
      >
        {bgImage ? (
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-600"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${panel.color} border border-primary/10`} />
        )}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/8" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

        <div className="relative h-full flex flex-col justify-end p-4 sm:p-5 2xl:p-7">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1.5 2xl:space-y-2 min-w-0">
              <div className="w-9 h-9 2xl:w-11 2xl:h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                {panel.icon}
              </div>
              <h2 className={`font-gilbert text-white drop-shadow-lg leading-none ${
                large ? 'text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl' : 'text-lg sm:text-xl 2xl:text-2xl'
              }`}>
                {panel.title(headingText)}
              </h2>
              <p className="text-white/70 text-sm 2xl:text-base tracking-wide">{panel.subtitle}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-white/0 group-hover:bg-white/20 transition-all duration-200 mb-1 border border-white/0 group-hover:border-white/30">
              <ArrowRight className="h-4 w-4 text-white/0 group-hover:text-white transition-all duration-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Home view ────────────────────────────────────────────────────────────────

export function HomeView() {
  const { state, dispatch } = useApp()
  const { settings } = state

  function navigate(view: Exclude<View, 'home'>) {
    dispatch({ type: 'SET_VIEW', view })
  }

  return (
    <div className="h-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 2xl:gap-4 [grid-template-rows:repeat(5,minmax(0,1fr))] sm:[grid-template-rows:repeat(3,minmax(0,1fr))] md:[grid-template-rows:repeat(2,minmax(0,1fr))]">
      <PanelCard
        panel={PANELS[0]}
        className="sm:col-span-2 md:col-span-2"
        onClick={() => navigate('feed')}
        bgImage={PANEL_IMAGES.feed ?? null}
        headingText={settings.heading}
        large
      />
      <MapPanel onClick={() => navigate('map')} />

      {PANELS.slice(1).map(panel => (
        <PanelCard
          key={panel.key}
          panel={panel}
          onClick={() => navigate(panel.key)}
          bgImage={PANEL_IMAGES[panel.key] ?? null}
          headingText={settings.heading}
        />
      ))}
    </div>
  )
}
