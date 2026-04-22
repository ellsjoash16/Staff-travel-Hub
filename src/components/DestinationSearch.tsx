import { useState, useRef, useMemo } from 'react'
import { Search, MapPin, Camera, BookOpen, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'

type ResultType = 'location' | 'post' | 'course'

interface Result {
  id: string
  type: ResultType
  label: string
  sublabel: string
}

export function DestinationSearch() {
  const { state, dispatch } = useApp()
  const { posts, courses, locations } = state
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = useMemo((): Result[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const locationResults: Result[] = locations
      .filter(l => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q))
      .map(l => {
        const pCount = posts.filter(p => p.locationId === l.id).length
        const cCount = courses.filter(c => c.locationId === l.id).length
        const parts = [pCount > 0 && `${pCount} post${pCount !== 1 ? 's' : ''}`, cCount > 0 && `${cCount} course${cCount !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')
        return { id: `loc-${l.id}`, type: 'location' as ResultType, label: l.name, sublabel: `${l.country}${parts ? ` · ${parts}` : ''}` }
      })
      .slice(0, 3)

    const postResults: Result[] = posts
      .filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.staff.toLowerCase().includes(q) ||
        p.location.name.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
      .map(p => ({ id: `post-${p.id}`, type: 'post' as ResultType, label: p.title, sublabel: `${p.staff}${p.location.name ? ` · ${p.location.name}` : ''}` }))
      .slice(0, 3)

    const courseResults: Result[] = courses
      .filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        c.location.name.toLowerCase().includes(q)
      )
      .map(c => ({ id: `course-${c.id}`, type: 'course' as ResultType, label: c.title, sublabel: c.location.name || 'Course' }))
      .slice(0, 3)

    return [...locationResults, ...postResults, ...courseResults]
  }, [query, locations, posts, courses])

  function select(r: Result) {
    setQuery('')
    setOpen(false)
    if (r.type === 'location') dispatch({ type: 'SET_VIEW', view: 'map' })
    else if (r.type === 'post') {
      const tag = posts.find(p => `post-${p.id}` === r.id)?.tags[0] ?? null
      dispatch({ type: 'SET_FILTER', filter: tag })
      dispatch({ type: 'SET_VIEW', view: 'feed' })
    }
    else if (r.type === 'course') dispatch({ type: 'SET_VIEW', view: 'courses' })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(results[activeIdx]) }
    if (e.key === 'Escape') { setQuery(''); setOpen(false) }
  }

  const sections: { type: ResultType; label: string; icon: React.ReactNode }[] = [
    { type: 'location', label: 'Locations', icon: <MapPin className="h-4 w-4 text-primary flex-shrink-0" /> },
    { type: 'post',     label: 'Posts',     icon: <Camera className="h-4 w-4 text-primary flex-shrink-0" /> },
    { type: 'course',   label: 'Courses',   icon: <BookOpen className="h-4 w-4 text-emerald-500 flex-shrink-0" /> },
  ]

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onBlur={e => { if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false) }}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search posts, locations, courses…"
          autoComplete="off"
          className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-card rounded-xl border border-border shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No results for "{query}"</div>
          ) : (
            sections.map(({ type, label, icon }) => {
              const group = results.filter(r => r.type === type)
              if (group.length === 0) return null
              return (
                <div key={type}>
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-t border-border first:border-t-0">
                    {label}
                  </div>
                  {group.map(r => {
                    const idx = results.indexOf(r)
                    return (
                      <button
                        key={r.id}
                        onMouseDown={() => select(r)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${activeIdx === idx ? 'bg-muted' : 'hover:bg-muted'}`}
                      >
                        {icon}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
