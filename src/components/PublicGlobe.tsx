import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Map, { Source, Layer, MapMouseEvent, MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { X, Globe, Airplane, MapPin } from '@phosphor-icons/react'
import { fmtDate } from '@/lib/utils'
import { tripImage } from '@/lib/destinationImages'
import type { Trip, Location } from '@/lib/types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string
const COLOR = '#05979a'

// Same name → GeoJSON ADMIN aliasing the in-app map uses.
const ADMIN_ALIASES: Record<string, string> = {
  'Bahamas': 'The Bahamas',
  'Congo': 'Republic of the Congo',
  'Eswatini': 'eSwatini',
  'Serbia': 'Republic of Serbia',
  'Tanzania': 'United Republic of Tanzania',
  'Timor-Leste': 'East Timor',
}
const ADMIN_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(ADMIN_ALIASES).map(([c, a]) => [a, c])
)
const toAdmin = (country: string) => ADMIN_ALIASES[country] ?? country
const fromAdmin = (admin: string) => ADMIN_TO_COUNTRY[admin] ?? admin

export function PublicGlobe({ trips, locations }: { trips: Trip[]; locations: Location[] }) {
  const [modal, setModal] = useState<{ country: string; trips: Trip[] } | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string>('grab')
  const mapRef = useRef<MapRef | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const completedTrips = useMemo(() => trips.filter(t => t.completed && !t.isEvent), [trips])

  // country → trips that visited it  (globalThis.Map: the `Map` name is the
  // react-map-gl component imported above)
  const tripsByCountry = useMemo(() => {
    const byCountry = new globalThis.Map<string, Trip[]>()
    for (const t of completedTrips) {
      const ids = t.locationIds?.length ? t.locationIds : (t.locationId ? [t.locationId] : [])
      const countries = new Set<string>()
      for (const id of ids) {
        const loc = locations.find(l => l.id === id)
        if (loc?.country) countries.add(loc.country)
      }
      for (const c of countries) {
        if (!byCountry.has(c)) byCountry.set(c, [])
        byCountry.get(c)!.push(t)
      }
    }
    return byCountry
  }, [completedTrips, locations])

  const activeCountries = useMemo(() => Array.from(tripsByCountry.keys()).map(toAdmin), [tripsByCountry])

  const activeFilter: [string, ...unknown[]] = useMemo(
    () => ['in', ['get', 'ADMIN'], ['literal', activeCountries]],
    [activeCountries]
  )

  const handleClick = useCallback((e: MapMouseEvent) => {
    const admin = e.features?.[0]?.properties?.ADMIN as string | undefined
    if (!admin) return
    const country = fromAdmin(admin)
    const list = tripsByCountry.get(country)
    if (list && list.length) {
      setModal({ country, trips: [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '')) })
    }
  }, [tripsByCountry])

  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    const admin = e.features?.[0]?.properties?.ADMIN as string | undefined
    if (admin && activeCountries.includes(admin)) {
      setHoveredCountry(admin); setCursor('pointer')
    } else {
      setHoveredCountry(null); setCursor('grab')
    }
  }, [activeCountries])

  const handleMouseLeave = useCallback(() => { setHoveredCountry(null); setCursor('grab') }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 10, latitude: 20, zoom: 1.4 }}
        projection={{ name: 'globe' }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/standard"
        interactiveLayerIds={['pub-active-fill']}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        cursor={cursor}
        attributionControl={false}
      >
        <Source id="pub-countries" type="geojson" data="/countries.json">
          <Layer
            id="pub-active-fill"
            type="fill"
            filter={activeFilter}
            paint={{
              'fill-color': COLOR,
              'fill-opacity': ['case', ['==', ['get', 'ADMIN'], hoveredCountry ?? ''], 0.6, 0.38],
            }}
          />
          <Layer
            id="pub-active-line"
            type="line"
            filter={activeFilter}
            paint={{ 'line-color': COLOR, 'line-width': 1.4, 'line-opacity': 0.75 }}
          />
        </Source>
      </Map>

      {hoveredCountry && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
            {fromAdmin(hoveredCountry)} — click to explore
          </div>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
              <Globe className="h-5 w-5 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base flex-1 text-foreground">{modal.country}</h3>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-3">
                Trips · {modal.trips.length}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {modal.trips.map(t => {
                  const img = tripImage(t, locations)
                  return (
                    <div key={t.id} className="rounded-xl overflow-hidden border border-border">
                      {img
                        ? <img src={img} alt="" className="w-full h-[90px] object-cover" />
                        : <div className="w-full h-[90px] bg-muted flex items-center justify-center"><Airplane className="h-7 w-7 text-muted-foreground/30" /></div>}
                      <div className="p-2">
                        <p className="text-[11px] font-semibold leading-snug truncate text-foreground">{t.name}</p>
                        {t.date && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{fmtDate(t.date)}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCountries.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 text-white/70 text-xs px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" /> No completed trips to show yet
          </div>
        </div>
      )}
    </div>
  )
}
