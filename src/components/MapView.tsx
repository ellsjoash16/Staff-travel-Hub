import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps'
import { X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { Post, Course } from '@/lib/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'

// ── Helpers ────────────────────────────────────────────────────────────────
// Our internal coords: [lat, lng]  |  react-simple-maps expects: [lng, lat]
const rsmCoord = ([lat, lng]: [number, number]): [number, number] => [lng, lat]

function toRad(d: number) { return (d * Math.PI) / 180 }
function toDeg(r: number) { return (r * 180) / Math.PI }

function greatCircleArc(from: [number, number], to: [number, number], steps = 60): [number, number][] {
  const [φ1, λ1] = [toRad(from[0]), toRad(from[1])]
  const [φ2, λ2] = [toRad(to[0]), toRad(to[1])]
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ))
  if (d < 0.0001) return [from, to]
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))])
  }
  return pts
}

function bearing(from: [number, number], to: [number, number]): number {
  const [φ1, λ1] = [toRad(from[0]), toRad(from[1])]
  const [φ2, λ2] = [toRad(to[0]), toRad(to[1])]
  const dλ = λ2 - λ1
  return ((toDeg(Math.atan2(
    Math.sin(dλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ)
  )) + 360) % 360)
}

// ── Animated flight path ───────────────────────────────────────────────────
function FlightPath({ from, dest, color }: { from: [number, number]; dest: [number, number]; color: string }) {
  const arc = useMemo(() => greatCircleArc(from, dest), [from, dest])
  const progressRef = useRef(Math.random())
  const [planeIdx, setPlaneIdx] = useState(() =>
    Math.min(Math.floor(progressRef.current * (arc.length - 1)), arc.length - 2)
  )

  useEffect(() => {
    let animId: number
    let lastUpdate = 0
    function tick(t: number) {
      if (t - lastUpdate > 40) { // ~25 fps is plenty
        progressRef.current = (progressRef.current + 0.004) % 1
        const idx = Math.min(Math.floor(progressRef.current * (arc.length - 1)), arc.length - 2)
        setPlaneIdx(idx)
        lastUpdate = t
      }
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [arc])

  const planeBear = bearing(arc[planeIdx], arc[Math.min(planeIdx + 1, arc.length - 1)])

  return (
    <>
      {/* Geodesic arc — react-simple-maps Line draws great circle automatically */}
      <Line
        from={rsmCoord(from)}
        to={rsmCoord(dest)}
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeDasharray="4 8"
        strokeOpacity={0.7}
        fill="none"
      />
      {/* Animated plane */}
      <Marker coordinates={rsmCoord(arc[planeIdx])}>
        {/* SVG transform rotates around (0,0) = marker centre, unlike CSS transform */}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={15}
          transform={`rotate(${planeBear - 45})`}
          style={{
            userSelect: 'none',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.5))',
            pointerEvents: 'none',
          }}
        >
          ✈
        </text>
      </Marker>
    </>
  )
}

// ── Popup content ──────────────────────────────────────────────────────────
function PostPopup({ post, onViewDetails }: { post: Post; onViewDetails: (p: Post) => void }) {
  return (
    <>
      {post.images[0] && (
        <img src={post.images[0]} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />
      )}
      <h4 className="font-bold text-sm mb-1">{post.title}</h4>
      <p className="text-xs text-gray-500 mb-2">
        📍 {post.location.name}<br />👤 {post.staff}
      </p>
      <button
        onClick={() => onViewDetails(post)}
        className="w-full text-white text-xs py-1.5 rounded-md hover:opacity-90 transition-opacity"
        style={{ background: 'hsl(var(--primary))' }}
      >
        View Details
      </button>
    </>
  )
}

function MultiPostPopup({ posts, onViewDetails }: { posts: Post[]; onViewDetails: (p: Post) => void }) {
  const latest = [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  return (
    <>
      <p className="text-xs text-gray-400 mb-2 font-medium">{posts.length} trips to this destination</p>
      <div className="grid grid-cols-2 gap-1.5">
        {latest.map(post => (
          <div
            key={post.id}
            className="relative rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => onViewDetails(post)}
          >
            {post.images[0]
              ? <img src={post.images[0]} alt="" className="w-full h-[76px] object-cover" />
              : <div className="w-full h-[76px] bg-gray-100 flex items-center justify-center text-xl">🌍</div>
            }
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
              <p className="text-white text-[10px] font-semibold truncate">{post.title}</p>
              <p className="text-white/70 text-[9px] truncate">{post.staff}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function CoursePopup({ course }: { course: Course }) {
  return (
    <>
      {course.image && (
        <img src={course.image} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />
      )}
      <div className="text-xs font-semibold text-emerald-600 mb-1">Training Course</div>
      <h4 className="font-bold text-sm mb-1">{course.title}</h4>
      {course.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{course.description}</p>
      )}
      <a
        href={course.riseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center text-white text-xs py-1.5 rounded-md hover:opacity-90 transition-opacity bg-emerald-500"
      >
        Open Course
      </a>
    </>
  )
}

// ── Ocean background — very light tint of the brand colour ────────────────
function oceanColor(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#e4eef5'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r + (255 - r) * 0.87)},${Math.round(g + (255 - g) * 0.87)},${Math.round(b + (255 - b) * 0.87)})`
}

// ── Main component ─────────────────────────────────────────────────────────
interface TooltipState {
  key: string
  content: React.ReactNode
  x: number
  y: number
}

interface Props { onSelectPost: (post: Post) => void }

export function MapView({ onSelectPost }: Props) {
  const { state } = useApp()
  const { posts, courses, settings } = state
  const pinColor = settings.color || '#0077b6'

  const departure: [number, number] = [
    settings.departureAirport?.lat ?? 51.5074,
    settings.departureAirport?.lng ?? -0.1278,
  ]
  const airportName = settings.departureAirport?.name ?? 'LHR'

  const [mapZoom, setMapZoom] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 })
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Native non-passive wheel listener so d3-zoom can preventDefault and the
  // page doesn't scroll when the user is zooming the map.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', stop, { passive: false })
    return () => el.removeEventListener('wheel', stop)
  }, [])

  // Inject CSS for country hover — avoids per-country React state re-renders
  useEffect(() => {
    const id = 'rsm-country-style'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.textContent = `
      .rsm-geo {
        fill: ${pinColor};
        fill-opacity: 0.04;
        stroke: ${pinColor};
        stroke-width: 0.4;
        stroke-opacity: 0.45;
        outline: none;
        transition: fill-opacity 0.18s, stroke-opacity 0.18s, stroke-width 0.18s;
        cursor: default;
      }
      .rsm-geo:hover {
        fill-opacity: 0.2;
        stroke-opacity: 1;
        stroke-width: 1.2;
      }
    `
    return () => { el?.remove() }
  }, [pinColor])

  // Group posts by lat/lng
  const postsByLocation = useMemo(() => {
    const m = new Map<string, Post[]>()
    posts
      .filter(p => p.location.lat != null && p.location.lng != null)
      .forEach(p => {
        const key = `${p.location.lat},${p.location.lng}`
        if (!m.has(key)) m.set(key, [])
        m.get(key)!.push(p)
      })
    return m
  }, [posts])

  const pinnedCourses = useMemo(
    () => courses.filter(c => c.showOnMap && c.location.lat != null && c.location.lng != null),
    [courses]
  )

  function openTooltip(e: React.MouseEvent, key: string, content: React.ReactNode) {
    e.stopPropagation()
    const rect = containerRef.current!.getBoundingClientRect()
    setTooltip({ key, content, x: e.clientX - rect.left, y: e.clientY - rect.top })
    setActiveKey(key)
  }

  function dismiss() { setTooltip(null); setActiveKey(null) }

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden shadow-md"
      style={{ height: 'calc(100vh - 140px)', background: oceanColor(pinColor) }}
      onClick={dismiss}
    >
      <ComposableMap
        style={{ width: '100%', height: '100%' }}
        projectionConfig={{ scale: 130 }}
        preserveAspectRatio="xMidYMid slice"
      >
        <ZoomableGroup
          zoom={mapZoom.zoom}
          center={mapZoom.coordinates}
          minZoom={0.8}
          maxZoom={12}
          onMoveEnd={(pos: { zoom: number; coordinates: [number, number] }) =>
            setMapZoom({ zoom: pos.zoom, coordinates: pos.coordinates })
          }
        >
          {/* Country shapes — hover handled via injected CSS */}
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className="rsm-geo"
                />
              ))
            }
          </Geographies>

          {/* Flight path + plane (only for active pin, only if post has showFlightPath) */}
          {Array.from(postsByLocation.entries()).map(([key, locationPosts]) => {
            if (activeKey !== key) return null
            if (!locationPosts.some(p => p.showFlightPath)) return null
            const [lat, lng] = key.split(',').map(Number)
            return (
              <FlightPath key={`fp-${key}`} from={departure} dest={[lat, lng]} color={pinColor} />
            )
          })}
          {pinnedCourses.map(course => {
            const key = `course-${course.id}`
            if (activeKey !== key) return null
            return (
              <FlightPath
                key={`fp-${key}`}
                from={departure}
                dest={[course.location.lat!, course.location.lng!]}
                color="#10b981"
              />
            )
          })}

          {/* Departure airport label — only while a flight is active */}
          {activeKey !== null && (
            <Marker coordinates={rsmCoord(departure)}>
              <rect x={-17} y={-11} width={34} height={16} rx={3} fill="#0f172a" />
              <text
                textAnchor="middle"
                y={2}
                fontSize={8}
                fontWeight={700}
                fill="#f8fafc"
                letterSpacing={0.8}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {airportName}
              </text>
            </Marker>
          )}

          {/* Post pins */}
          {Array.from(postsByLocation.entries()).map(([key, locationPosts]) => {
            const [lat, lng] = key.split(',').map(Number)
            const isActive = activeKey === key
            const multi = locationPosts.length > 1
            return (
              <Marker
                key={key}
                coordinates={[lng, lat]}
                onClick={(e: React.MouseEvent) => {
                  const content = multi
                    ? <MultiPostPopup posts={locationPosts} onViewDetails={p => { dismiss(); onSelectPost(p) }} />
                    : <PostPopup post={locationPosts[0]} onViewDetails={p => { dismiss(); onSelectPost(p) }} />
                  openTooltip(e, key, content)
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Pin drop shape — tip at y=0 (the coordinate point) */}
                <g style={{ filter: isActive ? `drop-shadow(0 0 7px ${pinColor}90)` : 'drop-shadow(0 2px 4px rgba(0,0,0,.35))' }}>
                  <circle cx={0} cy={-13} r={isActive ? 8 : 7} fill={pinColor} stroke="#fff" strokeWidth={1.8} />
                  <line x1={0} y1={-6} x2={0} y2={0} stroke={pinColor} strokeWidth={2} strokeLinecap="round" />
                </g>
                {multi && (
                  <text
                    textAnchor="middle"
                    y={-10}
                    fontSize={8}
                    fontWeight={700}
                    fill="#fff"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {locationPosts.length}
                  </text>
                )}
              </Marker>
            )
          })}

          {/* Course pins */}
          {pinnedCourses.map(course => {
            const key = `course-${course.id}`
            const isActive = activeKey === key
            return (
              <Marker
                key={key}
                coordinates={[course.location.lng!, course.location.lat!]}
                onClick={(e: React.MouseEvent) => openTooltip(e, key, <CoursePopup course={course} />)}
                style={{ cursor: 'pointer' }}
              >
                <g style={{ filter: isActive ? 'drop-shadow(0 0 7px #10b98190)' : 'drop-shadow(0 2px 4px rgba(0,0,0,.35))' }}>
                  <circle cx={0} cy={-13} r={isActive ? 8 : 7} fill="#10b981" stroke="#fff" strokeWidth={1.8} />
                  <line x1={0} y1={-6} x2={0} y2={0} stroke="#10b981" strokeWidth={2} strokeLinecap="round" />
                </g>
                <text
                  textAnchor="middle"
                  y={-10}
                  fontSize={9}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  📖
                </text>
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip popup — positioned absolutely over the map */}
      {tooltip && (
        <div
          className="absolute z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-[220px]"
          style={{
            left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth ?? 999) - 244),
            top: Math.max(8, tooltip.y - 90),
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={dismiss}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {tooltip.content}
        </div>
      )}

      {/* Zoom hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-gray-400 bg-white/70 rounded-lg px-2 py-1 pointer-events-none select-none backdrop-blur-sm">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  )
}
