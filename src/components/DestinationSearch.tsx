import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, MapPin, Globe2, X, Loader2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Suggestion {
  id: string
  type: 'trip' | 'place'
  label: string
  sublabel: string
  lat: number
  lng: number
}

export function DestinationSearch() {
  const { state, dispatch } = useApp()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Match existing post locations
  const postMatches = useCallback((q: string): Suggestion[] => {
    if (!q.trim()) return []
    const lower = q.toLowerCase()
    const seen = new Set<string>()
    return state.posts
      .filter(p => p.location.lat != null && p.location.lng != null &&
        (p.location.name.toLowerCase().includes(lower) ||
         p.title.toLowerCase().includes(lower))
      )
      .reduce<Suggestion[]>((acc, p) => {
        const key = `${p.location.lat},${p.location.lng}`
        if (!seen.has(key)) {
          seen.add(key)
          const count = state.posts.filter(x => x.location.name === p.location.name).length
          acc.push({
            id: `trip-${key}`,
            type: 'trip',
            label: p.location.name,
            sublabel: `${count} trip${count > 1 ? 's' : ''} · on the map`,
            lat: p.location.lat!,
            lng: p.location.lng!,
          })
        }
        return acc
      }, [])
      .slice(0, 3)
  }, [state.posts])

  useEffect(() => {
    setActiveIdx(-1)
    if (!query.trim()) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const trips = postMatches(query)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        const places: Suggestion[] = data.map(r => {
          const parts = r.display_name.split(', ')
          const label = parts[0]
          const sublabel = parts.slice(1, 3).join(', ')
          return {
            id: `place-${r.place_id}`,
            type: 'place',
            label,
            sublabel,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
          }
        })
        setSuggestions([...trips, ...places])
      } catch {
        setSuggestions(trips)
      } finally {
        setLoading(false)
      }
    }, 380)

    return () => clearTimeout(debounceRef.current)
  }, [query, postMatches])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(s: Suggestion) {
    setQuery('')
    setSuggestions([])
    setOpen(false)
    dispatch({ type: 'SET_MAP_TARGET', target: { lat: s.lat, lng: s.lng, label: s.label } })
    dispatch({ type: 'SET_VIEW', view: 'map' })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]) }
    if (e.key === 'Escape') { setQuery(''); setOpen(false) }
  }

  const showDropdown = open && (loading || suggestions.length > 0)

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs sm:max-w-sm">
      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 animate-spin pointer-events-none" />
          : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search destinations…"
          autoComplete="off"
          className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-card rounded-xl border border-border shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}

          {suggestions.length > 0 && (
            <>
              {/* Section label if we have trips */}
              {suggestions.some(s => s.type === 'trip') && (
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Trips on the map
                </div>
              )}
              {suggestions.filter(s => s.type === 'trip').map((s, i) => (
                <button
                  key={s.id}
                  onMouseDown={() => select(s)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    activeIdx === i ? 'bg-muted' : 'hover:bg-muted'
                  }`}
                >
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.sublabel}</p>
                  </div>
                </button>
              ))}

              {suggestions.some(s => s.type === 'place') && (
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-t border-border mt-1">
                  Places
                </div>
              )}
              {suggestions.filter(s => s.type === 'place').map((s, i) => {
                const idx = suggestions.filter(x => x.type === 'trip').length + i
                return (
                  <button
                    key={s.id}
                    onMouseDown={() => select(s)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      activeIdx === idx ? 'bg-muted' : 'hover:bg-muted'
                    }`}
                  >
                    <Globe2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.sublabel}</p>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
