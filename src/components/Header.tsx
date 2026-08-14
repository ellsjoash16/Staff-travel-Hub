import { useState } from 'react'
import { Shield, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'
import { DestinationSearch } from './DestinationSearch'

export function Header() {
  const { state, dispatch } = useApp()
  const { isAdmin } = state
  const [searchOpen, setSearchOpen] = useState(false)

  const logoOffset = (() => { try { const s = localStorage.getItem('logo-offset'); return s ? JSON.parse(s) : { x: 0, y: 0 } } catch { return { x: 0, y: 0 } } })()

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-zinc-950 to-black">
      <div className="flex h-14 sm:h-16 2xl:h-20 items-center pr-4 sm:pr-6 2xl:pr-10 gap-3 2xl:gap-4">

        {/* Left: Logo + Title (mobile only) */}
        {!searchOpen && (
          <div className="flex items-center gap-2 flex-shrink-0 px-4 sm:px-3 lg:w-16 xl:w-20 lg:justify-center lg:px-0">
            <img
              src="/daf-logo.png"
              alt="DAF"
              className="h-[1.125rem] sm:h-6 2xl:h-[1.875rem] w-auto flex-shrink-0 drop-shadow-sm select-none lg:hidden"
              style={{ transform: `translate(${logoOffset.x}px, ${logoOffset.y}px)` }}
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })}
              className="hover:opacity-85 transition-opacity lg:hidden"
            >
              <span
                className="inline-block font-gilbert text-white text-lg sm:text-2xl 2xl:text-3xl leading-none drop-shadow-sm whitespace-nowrap"
                style={{ transform: `translateY(calc(${logoOffset.y}px - 0.08em))` }}
              >
                DAFAGRAM
              </span>
            </button>
          </div>
        )}

        {/* Centre: Search expanded (desktop) */}
        {searchOpen ? (
          <div className="flex flex-1 min-w-0 max-w-md mx-auto sm:mx-auto px-4 sm:px-0">
            <DestinationSearch autoFocus onClose={() => setSearchOpen(false)} />
          </div>
        ) : (
          <div className="hidden sm:flex flex-1" />
        )}

        {/* Right: Search + Admin */}
        <div className="ml-auto sm:ml-0 flex items-center gap-1 flex-shrink-0">
          {searchOpen ? (
            <button
              onClick={() => setSearchOpen(false)}
              className="sm:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Search"
            >
              <MagnifyingGlass className="h-5 w-5" />
            </button>
          )}

          {!searchOpen && isAdmin && (
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'settings' })}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Admin"
            >
              <Shield className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
