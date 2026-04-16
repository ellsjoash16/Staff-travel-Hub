import { useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useApp } from '@/context/AppContext'
import type { Post, Course } from '@/lib/types'

// @ts-ignore
import { antPath } from 'leaflet-ant-path'

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

// ── Icons ──────────────────────────────────────────────────────────────────

function makePinIcon(color: string, count?: number): L.DivIcon {
  const n = count && count > 1 ? count : null
  return L.divIcon({
    html: `
      <div style="position:relative;width:30px;height:40px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">
        <svg viewBox="0 0 30 30" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2.5"/>
          ${n ? `<text x="15" y="20" text-anchor="middle" font-size="12" font-weight="700" fill="white" font-family="system-ui,sans-serif">${n}</text>` : ''}
        </svg>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:3px;height:12px;background:${color};border-radius:0 0 3px 3px"></div>
      </div>`,
    className: '',
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -44],
  })
}

function makeCourseIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="position:relative;width:30px;height:40px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">
        <div style="width:30px;height:30px;background:#10b981;border-radius:50%;border:2.5px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1">📖</div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:3px;height:12px;background:#10b981;border-radius:0 0 3px 3px"></div>
      </div>`,
    className: '',
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -44],
  })
}

// ── Flight paths ───────────────────────────────────────────────────────────

function FlightPaths({ from, dests, color }: {
  from: [number, number]
  dests: [number, number][]
  color: string
}) {
  const map = useMap()
  useEffect(() => {
    if (!dests.length) return
    const layers = dests.map(dest =>
      antPath([[from[0], from[1]], [dest[0], dest[1]]], {
        delay: 1200,
        dashArray: [12, 22],
        weight: 2.5,
        color,
        pulseColor: '#ffffff',
        hardwareAccelerated: true,
        opacity: 0.75,
      }).addTo(map)
    )
    return () => layers.forEach((l: any) => map.removeLayer(l))
  }, [map, from, dests, color])
  return null
}

// ── Tile toggle helper ─────────────────────────────────────────────────────

function TileLayerSwap({ dark }: { dark: boolean }) {
  return <TileLayer url={dark ? DARK_TILES : LIGHT_TILES} />
}

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
          <div
            key={post.id}
            className="relative rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => onViewDetails(post)}
          >
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

// ── Main ───────────────────────────────────────────────────────────────────

interface Props {
  onSelectPost: (post: Post) => void
  dark?: boolean
}

export function MapViewLeaflet({ onSelectPost, dark = true }: Props) {
  const { state } = useApp()
  const { posts, courses, settings } = state
  const pinColor = settings.color || '#05979a'

  const departure: [number, number] = [
    settings.departureAirport?.lat ?? 51.5074,
    settings.departureAirport?.lng ?? -0.1278,
  ]

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

  // Flight path destinations — all posts with showFlightPath enabled
  const flightDests = useMemo<[number, number][]>(() => {
    const seen = new Set<string>()
    const dests: [number, number][] = []
    posts.forEach(p => {
      if (p.showFlightPath && p.location.lat != null && p.location.lng != null) {
        const k = `${p.location.lat},${p.location.lng}`
        if (!seen.has(k)) { seen.add(k); dests.push([p.location.lat!, p.location.lng!]) }
      }
    })
    return dests
  }, [posts])

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ height: 'calc(100vh - 140px)' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={1.5}
        maxZoom={14}
        style={{ width: '100%', height: '100%', background: dark ? '#0d1117' : '#e8f0f7' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayerSwap dark={dark} />
        <FlightPaths from={departure} dests={flightDests} color={pinColor} />

        {Array.from(postsByLocation.entries()).map(([key, locationPosts]) => {
          const [lat, lng] = key.split(',').map(Number)
          return (
            <Marker
              key={key}
              position={[lat, lng]}
              icon={makePinIcon(pinColor, locationPosts.length)}
            >
              <Popup className="leaflet-custom-popup">
                {locationPosts.length === 1
                  ? <PostPopup post={locationPosts[0]} onViewDetails={onSelectPost} />
                  : <MultiPostPopup posts={locationPosts} onViewDetails={onSelectPost} />
                }
              </Popup>
            </Marker>
          )
        })}

        {pinnedCourses.map(course => (
          <Marker
            key={course.id}
            position={[course.location.lat!, course.location.lng!]}
            icon={makeCourseIcon()}
          >
            <Popup className="leaflet-custom-popup">
              <CoursePopup course={course} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-3 right-3 text-[10px] text-white/40 bg-black/30 rounded-lg px-2 py-1 pointer-events-none select-none backdrop-blur-sm z-[1000]">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  )
}
