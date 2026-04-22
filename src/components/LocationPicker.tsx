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
  const [dims, setDims] = useState({ w: 500, h: 280 })
  const [ready, setReady] = useState(false)

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      if (width > 0) setDims({ w: Math.floor(width), h: 280 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Once globe is ready, disable rotate, set camera
  function handleGlobeReady() {
    const g = globeRef.current
    if (!g) return
    g.controls().autoRotate = false
    g.controls().enableZoom = true
    if (lat != null && lng != null) {
      g.pointOfView({ lat, lng, altitude: 1.8 }, 0)
    } else {
      g.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0)
    }
    setReady(true)
  }

  const pins = useMemo(
    () => (lat != null && lng != null ? [{ lat, lng }] : []),
    [lat, lng]
  )

  const buildPinEl = useCallback((_d: object) => {
    const el = document.createElement('div')
    el.style.cssText = 'transform:translate(-50%,-100%);pointer-events:none;will-change:transform'
    el.innerHTML = `
      <div style="position:relative;width:28px;height:42px;">
        <div style="
          width:28px;height:28px;border-radius:50%;
          background:#05979a;border:2.5px solid white;
          box-shadow:0 4px 12px rgba(0,0,0,0.6);
        "></div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:3px;height:16px;background:#05979a;border-radius:0 0 3px 3px;
        "></div>
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
      style={{ height: 280, background: '#060c1a', cursor: ready ? 'crosshair' : 'default' }}
    >
      <Globe
        ref={globeRef}
        width={dims.w}
        height={280}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere
        atmosphereColor="#05979a"
        atmosphereAltitude={0.15}
        onGlobeReady={handleGlobeReady}
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
