import { useState, useRef, useEffect } from 'react'
import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  searchable?: boolean
  className?: string
}

export function AppSelect({ value, onChange, options, placeholder = '— Select —', searchable = false, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const selected = options.find(o => o.value === value)
  const filtered = searchable && query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  function pick(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <CaretDown className={`h-4 w-4 opacity-50 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-background shadow-lg">
          {searchable && (
            <div className="p-1.5 border-b border-border">
              <div className="relative">
                <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <span>{o.label}</span>
                  {o.value === value && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
