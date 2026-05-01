import { useState, useEffect } from 'react'
import { Shield, Menu, Sun, Moon, Settings, Search, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useApp } from '@/context/AppContext'
import { DestinationSearch } from './DestinationSearch'

interface Props {
  showMenuButton?: boolean
  onMenuClick?: () => void
  showSidebar?: boolean
  sidebarCollapsed?: boolean
}


export function Header({ showMenuButton, onMenuClick, showSidebar, sidebarCollapsed }: Props) {
  const { state, dispatch } = useApp()
  const { isAdmin } = state
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [searchOpen, setSearchOpen] = useState(false)

  const logoOffset = (() => { try { const s = localStorage.getItem('logo-offset'); return s ? JSON.parse(s) : { x: 0, y: 0 } } catch { return { x: 0, y: 0 } } })()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-white/10"
        style={{ background: '#064e5a' }}
      >
        {/* ── Main row ── */}
        <div className="flex h-14 sm:h-16 2xl:h-20 items-center pr-4 sm:pr-6 2xl:pr-10 gap-3 2xl:gap-4">

          {/* Left: Hamburger + Logo + Title — width matches sidebar */}
          <div className={`flex items-center gap-2 flex-shrink-0 px-4 sm:px-3 ${
            showSidebar
              ? sidebarCollapsed
                ? 'lg:w-16 xl:w-20 lg:justify-center lg:px-0'
                : 'lg:w-60 xl:w-72 lg:px-4'
              : ''
          }`}>
            {showMenuButton && (
              <button
                type="button"
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-xl text-white/80 hover:bg-white/15 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <img
              src="/daf-logo.png"
              alt="DAF"
              className="h-[1.125rem] sm:h-6 2xl:h-[1.875rem] w-auto flex-shrink-0 drop-shadow-sm select-none"
              style={{ transform: `translate(${logoOffset.x}px, ${logoOffset.y}px)` }}
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })}
              className={`hover:opacity-85 transition-opacity ${showSidebar && sidebarCollapsed ? 'lg:hidden' : ''}`}
            >
              <span className="font-gilbert text-white text-lg sm:text-2xl 2xl:text-3xl leading-none drop-shadow-sm whitespace-nowrap">
                DAFAGRAM
              </span>
            </button>
          </div>

          {/* Centre: Search — desktop */}
          {searchOpen ? (
            <div className="hidden sm:flex flex-1 min-w-0 max-w-md mx-auto">
              <DestinationSearch autoFocus onClose={() => setSearchOpen(false)} />
            </div>
          ) : (
            <div className="hidden sm:flex flex-1" />
          )}

          {/* Right: Search icon + Theme + Admin */}
          <div className="ml-auto sm:ml-0 flex items-center gap-1 flex-shrink-0">
            {!searchOpen && (
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'settings' })}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={isAdmin ? 'Admin' : 'Settings'}
            >
              {isAdmin ? <Shield className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
            </button>

            <button
              onClick={() => signOut(auth)}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Mobile search row ── */}
        <div className="sm:hidden px-4 pb-3">
          <DestinationSearch />
        </div>
      </header>

    </>
  )
}
