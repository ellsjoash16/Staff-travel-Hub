import { useState, useCallback, useRef, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoEqualEarth } from 'd3-geo'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'
const SVG_W = 800
const SVG_H = 600
const SCALE = 147

// Must match react-simple-maps default projection exactly
const projection = geoEqualEarth()
  .scale(SCALE)
  .translate([SVG_W / 2, SVG_H / 2])
  .center([0, 0])

interface Props {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}

export function LocationPicker({ lat, lng, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({
    coordinates: [0, 0] as [number, number],
    zoom: 1,
  })

  // Prevent the parent dialog from scrolling when the user scrolls over the map.
  // d3-zoom v2 doesn't set {passive:false} on its wheel listener, so we need
  // a native non-passive listener to reliably call preventDefault().
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', stop, { passive: false })
    return () => el.removeEventListener('wheel', stop)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as SVGElement
      const svg = target.closest('svg') as SVGSVGElement | null
      if (!svg) return

      // Must use the INNER zoom group (.rsm-zoomable-group), not the outer <g>.
      // ZoomableGroup nests two <g> elements; only the inner one carries the
      // d3 zoom transform — getScreenCTM on that gives accurate coords at any zoom.
      const g = svg.querySelector('.rsm-zoomable-group') as SVGGElement | null
      const ctm = (g ?? svg).getScreenCTM()
      if (!ctm) return

      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const { x, y } = pt.matrixTransform(ctm.inverse())

      const coords = projection.invert?.([x, y])
      if (!coords) return
      const [pLng, pLat] = coords
      if (Math.abs(pLat) > 90 || Math.abs(pLng) > 180) return
      onPick(parseFloat(pLat.toFixed(5)), parseFloat(pLng.toFixed(5)))
    },
    [onPick]
  )

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden border border-border cursor-crosshair select-none"
      style={{ height: 340, background: '#dde9f0' }}
      onClick={handleClick}
    >
      <ComposableMap
        style={{ width: '100%', height: '100%' }}
        projectionConfig={{ scale: SCALE }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          minZoom={1}
          maxZoom={20}
          onMoveEnd={(pos: { zoom: number; coordinates: [number, number] }) =>
            setPosition({ zoom: pos.zoom, coordinates: pos.coordinates })
          }
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#c8d8e4"
                  stroke="#fff"
                  strokeWidth={0.5}
                  style={{ outline: 'none', pointerEvents: 'none' }}
                />
              ))
            }
          </Geographies>

          {lat != null && lng != null && (
            <Marker coordinates={[lng, lat]}>
              {/* tip at y=0 so the point lands exactly where you clicked */}
              <circle
                r={5}
                cy={-9}
                fill="hsl(var(--primary))"
                stroke="#fff"
                strokeWidth={2}
                style={{ pointerEvents: 'none' }}
              />
              <line
                x1={0} y1={-6} x2={0} y2={0}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
                style={{ pointerEvents: 'none' }}
              />
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      <div className="absolute bottom-1 right-2 text-[9px] text-gray-400 pointer-events-none select-none">
        Scroll to zoom · Click to pin
      </div>
    </div>
  )
}
