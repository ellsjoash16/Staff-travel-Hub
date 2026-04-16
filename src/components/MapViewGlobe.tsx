import { useState, useMemo, useRef, useCallback, useEffect, createElement } from 'react'
import Globe, { GlobeMethods } from 'react-globe.gl'
import { X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { Post, Course } from '@/lib/types'

// ── Popup content ──────────────────────────────────────────────────────────

function PostPopup({ post, onViewDetails }: { post: Post; onViewDetails: (p: Post) => void }) {
  return (
    <div className="w-[200px]">
      {post.images[0] && (
        <img src={post.images[0]} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
      )}
      <h4 className="font-bold text-sm mb-1 leading-snug">{post.title}</h4>
      <p className="text-xs text-gray-500 mb-2">
        📍 {post.location.name}<br />👤 {post.staff}
      </p>
      <button
        onClick={() => onViewDetails(post)}
        className="w-full text-white text-xs py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
        style={{ background: 'hsl(var(--primary))' }}
      >
        View Details
      </button>
    </div>
  )
}

function MultiPostPopup({ posts, onViewDetails }: { posts: Post[]; onViewDetails: (p: Post) => void }) {
  const latest = [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  return (
    <div className="w-[220px]">
      <p className="text-xs text-gray-400 mb-2 font-medium">{posts.length} trips to this destination</p>
      <div className="grid grid-cols-2 gap-1.5">
        {latest.map(post => (
          <div key={post.id} className="relative rounded-lg overflow-hidden cursor-pointer group" onClick={() => onViewDetails(post)}>
            {post.images[0]
              ? <img src={post.images[0]} alt="" className="w-full h-[72px] object-cover" />
              : <div className="w-full h-[72px] bg-gray-100 flex items-center justify-center text-xl">🌍</div>
            }
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
              <p className="text-white text-[10px] font-semibold truncate">{post.title}</p>
              <p className="text-white/70 text-[9px] truncate">{post.staff}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoursePopup({ course }: { course: Course }) {
  return (
    <div className="w-[200px]">
      {course.image && (
        <img src={course.image} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
      )}
      <div className="text-xs font-semibold text-emerald-600 mb-1">Training Course</div>
      <h4 className="font-bold text-sm mb-1 leading-snug">{course.title}</h4>
      {course.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{course.description}</p>
      )}
      <a
        href={course.riseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center text-white text-xs py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium bg-emerald-500"
      >
        Open Course
      </a>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────

interface PinPoint {
  key: string
  lat: number
  lng: number
  type: 'post' | 'course'
  posts?: Post[]
  course?: Course
  color: string
}

interface ArcData {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
}

interface PopupState {
  key: string
  x: number
  y: number
  content: React.ReactNode
}

// ── Main ───────────────────────────────────────────────────────────────────

export function MapViewGlobe({ onSelectPost }: { onSelectPost: (post: Post) => void }) {
  const { state } = useApp()
  const { posts, courses, settings } = state
  const pinColor = settings.color || '#05979a'
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [popup, setPopup] = useState<PopupState | null>(null)

  // Size the globe to its container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-rotate when no popup open
  useEffect(() => {
    const g = globeRef.current
    if (!g) return
    g.controls().autoRotate = !popup
    g.controls().autoRotateSpeed = 0.4
  }, [popup])

  const departure = {
    lat: settings.departureAirport?.lat ?? 51.5074,
    lng: settings.departureAirport?.lng ?? -0.1278,
  }

  // Group posts by location
  const postsByLocation = useMemo(() => {
    const m = new Map<string, Post[]>()
    posts
      .filter(p => p.location.lat != null && p.location.lng != null)
      .forEach(p => {
        const k = `${p.location.lat},${p.location.lng}`
        if (!m.has(k)) m.set(k, [])
        m.get(k)!.push(p)
      })
    return m
  }, [posts])

  const pinnedCourses = useMemo(
    () => courses.filter(c => c.showOnMap && c.location.lat != null && c.location.lng != null),
    [courses]
  )

  // Build pin points
  const pins = useMemo<PinPoint[]>(() => [
    ...Array.from(postsByLocation.entries()).map(([key, ps]) => ({
      key,
      lat: parseFloat(key.split(',')[0]),
      lng: parseFloat(key.split(',')[1]),
      type: 'post' as const,
      posts: ps,
      color: pinColor,
    })),
    ...pinnedCourses.map(c => ({
      key: `course-${c.id}`,
      lat: c.location.lat!,
      lng: c.location.lng!,
      type: 'course' as const,
      course: c,
      color: '#10b981',
    })),
  ], [postsByLocation, pinnedCourses, pinColor])

  // Build arcs for flight paths
  const arcs = useMemo<ArcData[]>(() => {
    const seen = new Set<string>()
    const result: ArcData[] = []
    posts.forEach(p => {
      if (p.showFlightPath && p.location.lat != null && p.location.lng != null) {
        const k = `${p.location.lat},${p.location.lng}`
        if (!seen.has(k)) {
          seen.add(k)
          result.push({ startLat: departure.lat, startLng: departure.lng, endLat: p.location.lat!, endLng: p.location.lng!, color: pinColor })
        }
      }
    })
    return result
  }, [posts, departure, pinColor])

  // Build HTML pin elements — click handler attached directly to DOM element
  const buildHtmlEl = useCallback((d: object) => {
    const pin = d as PinPoint
    const count = pin.posts && pin.posts.length > 1 ? pin.posts.length : null
    const el = document.createElement('div')
    el.style.cssText = 'cursor:pointer;transform:translate(-50%,-100%)'
    el.innerHTML = `
      <div style="position:relative;width:28px;height:38px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6))">
        <div style="
          width:28px;height:28px;border-radius:50%;
          background:${pin.color};border:2.5px solid white;
          display:flex;align-items:center;justify-content:center;
          font-size:${count ? '11' : '14'}px;font-weight:700;color:white;
          font-family:system-ui,sans-serif;
        ">${count ? count : (pin.type === 'course' ? '📖' : '')}</div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:3px;height:12px;background:${pin.color};border-radius:0 0 3px 3px;
        "></div>
      </div>`

    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const rect = containerRef.current?.getBoundingClientRect()
      const x = rect ? (e as MouseEvent).clientX - rect.left : 0
      const y = rect ? (e as MouseEvent).clientY - rect.top : 0

      let content: React.ReactNode
      if (pin.type === 'post' && pin.posts) {
        content = pin.posts.length === 1
          ? createElement(PostPopup, { post: pin.posts[0], onViewDetails: (p: Post) => { setPopup(null); onSelectPost(p) } })
          : createElement(MultiPostPopup, { posts: pin.posts, onViewDetails: (p: Post) => { setPopup(null); onSelectPost(p) } })
      } else if (pin.type === 'course' && pin.course) {
        content = createElement(CoursePopup, { course: pin.course })
      }
      setPopup({ key: pin.key, x, y, content })
    })

    return el
  }, [onSelectPost, pinColor])

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden shadow-md"
      style={{ height: 'calc(100vh - 140px)', background: '#060c1a' }}
      onClick={() => setPopup(null)}
    >
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere={true}
        atmosphereColor={pinColor}
        atmosphereAltitude={0.18}
        // Arcs (flight paths)
        arcsData={arcs}
        arcStartLat={(d: object) => (d as ArcData).startLat}
        arcStartLng={(d: object) => (d as ArcData).startLng}
        arcEndLat={(d: object) => (d as ArcData).endLat}
        arcEndLng={(d: object) => (d as ArcData).endLng}
        arcColor={(d: object) => (d as ArcData).color}
        arcDashLength={0.35}
        arcDashGap={0.15}
        arcDashAnimateTime={2200}
        arcStroke={0.6}
        arcAltitudeAutoScale={0.4}
        // HTML pin markers
        htmlElementsData={pins}
        htmlElement={buildHtmlEl}
      />

      {/* Popup overlay */}
      {popup && (
        <div
          className="absolute z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3"
          style={{
            left: Math.min(popup.x + 12, dims.w - 250),
            top: Math.max(8, popup.y - 100),
          }}
          onClick={e => e.stopPropagation()}
        >
          <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setPopup(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
          {popup.content}
        </div>
      )}

      <div className="absolute bottom-3 right-3 text-[10px] text-white/40 bg-black/30 rounded-lg px-2 py-1 pointer-events-none select-none backdrop-blur-sm z-10">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  )
}
