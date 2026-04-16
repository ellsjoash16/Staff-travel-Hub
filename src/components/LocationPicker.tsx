import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Globe, { GlobeMethods } from 'react-globe.gl'

interface Props {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}

export function LocationPicker({ lat, lng, onPick }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 400, h: 300 })

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setDims({ w: width, h: 300 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Disable auto-rotation; set a nice starting tilt
  useEffect(() => {
    const g = globeRef.current
    if (!g) return
    g.controls().autoRotate = false
    g.controls().enableZoom = true
    g.pointOfView({ lat: 20, lng: 0, altitude: 2 }, 0)
  }, [])

  // If a pin already exists, focus the globe on it
  useEffect(() => {
    if (lat != null && lng != null && globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude: 1.8 }, 600)
    }
  }, []) // only on mount

  const pins = useMemo(
    () => (lat != null && lng != null ? [{ lat, lng }] : []),
    [lat, lng]
  )

  const buildPinEl = useCallback((_d: object) => {
    const el = document.createElement('div')
    el.style.cssText = 'transform:translate(-50%,-100%);pointer-events:none'
    el.innerHTML = `
      <div style="position:relative;width:26px;height:36px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6))">
        <svg viewBox="0 0 26 26" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
          <circle cx="13" cy="13" r="11" fill="hsl(181,94%,31%)" stroke="white" stroke-width="2.5"/>
        </svg>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:3px;height:12px;background:hsl(181,94%,31%);border-radius:0 0 3px 3px"></div>
      </div>`
    return el
  }, [])

  function handleGlobeClick({ lat: clickLat, lng: clickLng }: { lat: number; lng: number }) {
    onPick(parseFloat(clickLat.toFixed(5)), parseFloat(clickLng.toFixed(5)))
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden border border-border"
      style={{ height: 300, background: '#060c1a', cursor: 'crosshair' }}
    >
      <Globe
        ref={globeRef}
        width={dims.w}
        height={300}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere={true}
        atmosphereColor="hsl(181, 94%, 31%)"
        atmosphereAltitude={0.15}
        onGlobeClick={handleGlobeClick}
        htmlElementsData={pins}
        htmlElement={buildPinEl}
      />
      <div className="absolute bottom-2 right-2 text-[9px] text-white/40 bg-black/30 rounded-lg px-2 py-1 pointer-events-none select-none backdrop-blur-sm z-10">
        Click globe to pin · Drag to rotate · Scroll to zoom
      </div>
    </div>
  )
}
