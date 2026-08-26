import { useState, useRef, useMemo } from 'react'
import { MagnifyingGlass, MapPin, Camera, BookOpen, Airplane, X } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'

type ResultType = 'location' | 'post' | 'course' | 'trip'

interface Result {
  id: string
  type: ResultType
  label: string
  sublabel: string
}

interface Props {
  autoFocus?: boolean
  onClose?: () => void
  variant?: 'dark' | 'light'
  placeholder?: string
}

export function DestinationSearch({ autoFocus, onClose, variant = 'dark', placeholder }: Props) {
  const { state, dispatch } = useApp()
  const { posts, courses, locations, trips } = state
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const light = variant === 'light'

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

    const tripResults: Result[] = trips
      .filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.participants ?? []).some(p => p.toLowerCase().includes(q))
      )
      .map(t => ({ id: `trip-${t.id}`, type: 'trip' as ResultType, label: t.name, sublabel: t.completed ? 'Past trip' : t.isEvent ? 'Event' : 'Upcoming trip' }))
      .slice(0, 3)

    const courseResults: Result[] = courses
      .filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        c.location.name.toLowerCase().includes(q)
      )
      .map(c => ({ id: `course-${c.id}`, type: 'course' as ResultType, label: c.title, sublabel: c.location.name || 'Course' }))
      .slice(0, 3)

    return [...locationResults, ...postResults, ...tripResults, ...courseResults]
  }, [query, locations, posts, courses, trips])

  function select(r: Result) {
    setQuery('')
    setOpen(false)
    onClose?.()
    if (r.type === 'location') {
      const id = r.id.replace(/^loc-/, '')
      dispatch({ type: 'SET_OPEN_LOCATION', id })
      dispatch({ type: 'SET_VIEW', view: 'map' })
    } else if (r.type === 'post') {
      const post = posts.find(p => `post-${p.id}` === r.id)
      if (post) dispatch({ type: 'SET_OPEN_POST', post })
    } else if (r.type === 'trip') {
      const trip = trips.find(t => `trip-${t.id}` === r.id)
      dispatch({ type: 'SET_VIEW', view: trip?.completed ? 'years' : 'upcoming' })
    } else if (r.type === 'course') {
      const course = courses.find(c => `course-${c.id}` === r.id)
      if (course?.riseUrl) window.open(course.riseUrl, '_blank')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setQuery(''); setOpen(false); onClose?.(); return }
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(results[activeIdx]) }
  }

  function handleBlur(e: React.FocusEvent) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return
    setOpen(false)
    if (!query) onClose?.()
  }

  const chip = light ? 'bg-muted' : 'bg-white/10'
  const chipIcon = light ? 'text-foreground' : 'text-white'
  const typeIcon: Record<ResultType, React.ReactNode> = {
    location: <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${chip} flex-shrink-0`}><MapPin className={`h-4 w-4 ${chipIcon}`} /></div>,
    post:     <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${chip} flex-shrink-0`}><Camera className={`h-4 w-4 ${chipIcon}`} /></div>,
    trip:     <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${chip} flex-shrink-0`}><Airplane className={`h-4 w-4 ${chipIcon}`} /></div>,
    course:   <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${chip} flex-shrink-0`}><BookOpen className={`h-4 w-4 ${chipIcon}`} /></div>,
  }

  const sections: { type: ResultType; label: string }[] = [
    { type: 'location', label: 'Destinations' },
    { type: 'post',     label: 'Trip reviews' },
    { type: 'trip',     label: 'Trips & events' },
    { type: 'course',   label: 'Courses' },
  ]

  // Theme-dependent classes
  const inputCls = light
    ? 'w-full h-10 pl-9 pr-8 rounded-full bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all'
    : 'w-full h-9 pl-9 pr-8 rounded-full bg-white/10 border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:bg-white/18 focus:border-white/35 transition-all'
  const iconCls = light ? 'text-muted-foreground' : 'text-white/50'
  const clearCls = light ? 'text-muted-foreground/60 hover:text-foreground' : 'text-white/40 hover:text-white/80'
  const panelCls = light
    ? 'absolute top-full mt-2 left-0 right-0 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden z-50'
    : 'absolute top-full mt-2 left-0 right-0 bg-zinc-950/50 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.45)] overflow-hidden z-50'
  const sectionLabelCls = light ? 'text-muted-foreground' : 'text-white/50'
  const rowActive = light ? 'bg-muted' : 'bg-white/10'
  const rowHover = light ? 'hover:bg-muted' : 'hover:bg-white/10'
  const labelCls = light ? 'text-foreground' : 'text-white'
  const sublabelCls = light ? 'text-muted-foreground' : 'text-white/60'

  return (
    <div ref={containerRef} className="relative w-full" onBlur={handleBlur}>
      <div className="relative">
        <MagnifyingGlass className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${iconCls}`} />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Search posts, locations…'}
          autoComplete="off"
          className={inputCls}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${clearCls}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className={panelCls}>
          {results.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-4">
              <MagnifyingGlass className={`h-4 w-4 flex-shrink-0 ${iconCls}`} />
              <p className={`text-sm ${sublabelCls}`}>No results for <span className={`font-medium ${labelCls}`}>"{query}"</span></p>
            </div>
          ) : (
            <div className="py-1.5">
              {sections.map(({ type, label }) => {
                const group = results.filter(r => r.type === type)
                if (group.length === 0) return null
                return (
                  <div key={type}>
                    <p className={`px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest ${sectionLabelCls}`}>
                      {label}
                    </p>
                    {group.map(r => {
                      const idx = results.indexOf(r)
                      return (
                        <button
                          key={r.id}
                          onMouseDown={() => select(r)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2 mx-1.5 rounded-xl text-left transition-colors ${
                            activeIdx === idx ? rowActive : rowHover
                          }`}
                          style={{ width: 'calc(100% - 12px)' }}
                        >
                          {typeIcon[r.type]}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate leading-tight ${labelCls}`}>{r.label}</p>
                            <p className={`text-xs truncate mt-0.5 ${sublabelCls}`}>{r.sublabel}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
