import { useState, useMemo, useCallback } from 'react'
import Map, { Source, Layer, MapMouseEvent } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { X, BookOpen, ChevronLeft, List, Map as MapIcon, Globe, MapPin } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'
import type { Post, Course, Location } from '@/lib/types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

type ModalState =
  | null
  | { view: 'country'; country: string; locations: Location[] }
  | { view: 'location'; location: Location; posts: Post[]; courses: Course[]; backCountry: string }

export function MapViewGlobe({ onSelectPost }: { onSelectPost: (post: Post) => void }) {
  const { state } = useApp()
  const { posts, courses, locations, settings } = state
  const pinColor = settings.color || '#05979a'
  const [modal, setModal] = useState<ModalState>(null)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string>('grab')

  const activeCountries = useMemo(() => {
    return locations.map(l => l.country)
  }, [locations])

  const locationsByCountry = useMemo(() => {
    const countryMap: Record<string, Location[]> = {}
    locations.forEach(l => {
      if (!countryMap[l.country]) countryMap[l.country] = []
      countryMap[l.country].push(l)
    })
    return Object.entries(countryMap).sort(([a], [b]) => a.localeCompare(b))
  }, [locations])

  function openLocation(location: Location, backCountry: string) {
    const locPosts = posts.filter(p => p.locationId === location.id)
    const locCourses = courses.filter(c => c.locationId === location.id)
    setModal({ view: 'location', location, posts: locPosts, courses: locCourses, backCountry })
  }

  const handleClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0]
    if (!feature) return
    const country = feature.properties?.ADMIN as string
    if (!country) return
    const countryLocations = locations.filter(l => l.country === country)
    if (countryLocations.length === 0) return
    if (countryLocations.length === 1) {
      openLocation(countryLocations[0], country)
    } else {
      setModal({ view: 'country', country, locations: countryLocations })
    }
  }, [locations, posts, courses])

  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0]
    const country = feature?.properties?.ADMIN as string | undefined
    if (country && activeCountries.includes(country)) {
      setHoveredCountry(country)
      setCursor('pointer')
    } else {
      setHoveredCountry(null)
      setCursor('grab')
    }
  }, [activeCountries])

  const handleMouseLeave = useCallback(() => {
    setHoveredCountry(null)
    setCursor('grab')
  }, [])

  const activeFilter: [string, ...unknown[]] = useMemo(() => (
    ['in', ['get', 'ADMIN'], ['literal', activeCountries]]
  ), [activeCountries])

  const mapEl = (
    <div className="relative w-full h-full">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 10, latitude: 20, zoom: 1.4 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/standard"
        interactiveLayerIds={['active-country-fill', 'inactive-country-fill']}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        cursor={cursor}
      >
        <Source id="countries" type="geojson" data="/countries.json">
          {/* Inactive countries — transparent but clickable */}
          <Layer
            id="inactive-country-fill"
            type="fill"
            paint={{ 'fill-color': 'rgba(0,0,0,0)', 'fill-opacity': 0 }}
          />
          {/* Active country fill */}
          <Layer
            id="active-country-fill"
            type="fill"
            filter={activeFilter}
            paint={{
              'fill-color': pinColor,
              'fill-opacity': [
                'case',
                ['==', ['get', 'ADMIN'], hoveredCountry ?? ''], 0.55,
                0.35,
              ],
            }}
          />
          {/* Active country border */}
          <Layer
            id="active-country-line"
            type="line"
            filter={activeFilter}
            paint={{
              'line-color': pinColor,
              'line-width': 1.5,
              'line-opacity': 0.7,
            }}
          />
        </Source>
      </Map>

      {/* Tooltip */}
      {hoveredCountry && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
            {hoveredCountry} — click to explore
          </div>
        </div>
      )}

      {/* Hint */}
      {locations.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 text-white/70 text-xs px-4 py-2 rounded-full backdrop-blur-sm whitespace-nowrap">
            Add locations in Admin → Locations, then link posts and courses to them
          </div>
        </div>
      )}
    </div>
  )

  const listEl = (
    <div className="h-full overflow-y-auto p-4 space-y-3 bg-background">
      {locationsByCountry.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <MapIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No locations yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Add locations in Admin → Locations</p>
        </div>
      )}
      {locationsByCountry.map(([country, locs]) => (
        <div key={country} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">{country}</p>
              <p className="text-[11px] text-muted-foreground">{locs.length} location{locs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {locs.map(loc => {
              const pCount = posts.filter(p => p.locationId === loc.id).length
              const cCount = courses.filter(c => c.locationId === loc.id).length
              return (
                <button
                  key={loc.id}
                  className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
                  onClick={() => openLocation(loc, country)}
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{loc.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[pCount > 0 && `${pCount} post${pCount !== 1 ? 's' : ''}`, cCount > 0 && `${cCount} course${cCount !== 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'No content yet'}
                    </p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary rotate-180 flex-shrink-0 transition-colors" />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* ── Desktop: map only ── */}
      <div
        className="hidden md:block relative rounded-2xl overflow-hidden shadow-md"
        style={{ height: 'calc(100vh - 140px)' }}
      >
        {mapEl}
      </div>

      {/* ── Mobile: toggle between list and map ── */}
      <div className="md:hidden flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
        <div className="flex rounded-xl overflow-hidden border border-border mb-3 flex-shrink-0">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mobileView === 'list' ? 'btn-gradient text-white' : 'bg-card text-muted-foreground'}`}
            onClick={() => setMobileView('list')}
          >
            <List className="h-4 w-4" /> Locations
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mobileView === 'map' ? 'btn-gradient text-white' : 'bg-card text-muted-foreground'}`}
            onClick={() => setMobileView('map')}
          >
            <MapIcon className="h-4 w-4" /> Map
          </button>
        </div>
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
          {mobileView === 'map' ? mapEl : listEl}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-border"
            onClick={e => e.stopPropagation()}
          >
            {modal.view === 'country' ? (
              <>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
                  <Globe className="h-5 w-5 text-primary flex-shrink-0" />
                  <h3 className="font-bold text-base flex-1 text-foreground">{modal.country}</h3>
                  <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-semibold">Select a location</p>
                  {modal.locations.map(loc => {
                    const pCount = posts.filter(p => p.locationId === loc.id).length
                    const cCount = courses.filter(c => c.locationId === loc.id).length
                    return (
                      <button
                        key={loc.id}
                        className="w-full text-left flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted transition-all group"
                        onClick={() => openLocation(loc, modal.country)}
                      >
                        <div>
                          <p className="font-semibold text-sm text-foreground">{loc.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[pCount > 0 && `${pCount} post${pCount !== 1 ? 's' : ''}`, cCount > 0 && `${cCount} course${cCount !== 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'No content yet'}
                          </p>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary rotate-180 transition-colors" />
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border flex-shrink-0">
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs font-medium mr-1"
                    onClick={() => {
                      const countryLocations = locations.filter(l => l.country === modal.backCountry)
                      if (countryLocations.length > 1) {
                        setModal({ view: 'country', country: modal.backCountry, locations: countryLocations })
                      } else {
                        setModal(null)
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {modal.backCountry}
                  </button>
                  <h3 className="font-bold text-base flex-1 truncate text-foreground">{modal.location.name}</h3>
                  <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {modal.posts.length > 0 && (
                    <div className="p-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Posts · {modal.posts.length}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {modal.posts.map(post => (
                          <div
                            key={post.id}
                            className="cursor-pointer rounded-xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-md transition-all"
                            onClick={() => { setModal(null); onSelectPost(post) }}
                          >
                            {post.images[0]
                              ? <img src={post.images[0]} alt="" className="w-full h-[80px] object-cover" />
                              : <div className="w-full h-[80px] bg-muted flex items-center justify-center"><Globe className="h-8 w-8 text-muted-foreground/30" /></div>
                            }
                            <div className="p-2">
                              <p className="text-[11px] font-semibold leading-snug truncate text-foreground">{post.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{post.staff}</p>
                              {post.date && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{fmtDate(post.date)}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {modal.courses.length > 0 && (
                    <div className={`px-4 pb-4 ${modal.posts.length > 0 ? 'border-t border-border pt-4' : 'pt-4'}`}>
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3">
                        Courses · {modal.courses.length}
                      </p>
                      <div className="space-y-2">
                        {modal.courses.map(c => (
                          <a
                            key={c.id}
                            href={c.riseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-500/10 transition-colors"
                          >
                            {c.image
                              ? <img src={c.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                              : <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
                            }
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400 truncate">{c.title}</p>
                              {c.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {modal.posts.length === 0 && modal.courses.length === 0 && (
                    <div className="flex flex-col items-center py-12 text-center">
                      <MapPin className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm font-medium">{modal.location.name}</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">No posts or courses yet</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
