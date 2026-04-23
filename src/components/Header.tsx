import { useState, useEffect } from 'react'
import { Shield, Menu, Sun, Moon, Settings } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { AdminPanel } from './AdminPanel'
import { DestinationSearch } from './DestinationSearch'

interface Props {
  showMenuButton?: boolean
  onMenuClick?: () => void
}


export function Header({ showMenuButton, onMenuClick }: Props) {
  const { state, dispatch } = useApp()
  const { settings, isAdmin } = state
  const [adminOpen, setAdminOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  const logoOffset = (() => { try { const s = localStorage.getItem('logo-offset'); return s ? JSON.parse(s) : { x: 0, y: 0 } } catch { return { x: 0, y: 0 } } })()

  // Close dropdown on outside click
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <>
      <header
        className="sticky top-0 z-40 header-gradient"
        style={{ boxShadow: '0 2px 24px hsl(var(--primary) / 0.45)' }}
      >
        {/* ── Main row ── */}
        <div className="mx-auto flex h-14 sm:h-16 max-w-[1440px] items-center px-4 sm:px-6 gap-3">

          {/* Left: Hamburger + Logo + Title */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
              className="h-7 sm:h-8 w-auto flex-shrink-0 drop-shadow-sm select-none"
              style={{ transform: `translate(${logoOffset.x}px, ${logoOffset.y}px)` }}
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })}
              className="hover:opacity-85 transition-opacity"
            >
              <span className="font-gilbert text-white text-lg sm:text-2xl leading-none drop-shadow-sm whitespace-nowrap">
                {settings.title}
              </span>
            </button>
          </div>

          {/* Centre: Search — desktop only */}
          <div className="hidden sm:block h-6 w-px bg-white/20 flex-shrink-0" />
          <div className="hidden sm:flex flex-1 min-w-0 max-w-md mx-auto">
            <DestinationSearch />
          </div>
          <div className="hidden sm:block h-6 w-px bg-white/20 flex-shrink-0" />

          {/* Right: Theme + Settings + Admin */}
          <div className="ml-auto sm:ml-0 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setDark(d => !d)}
              className="flex items-center justify-center rounded-xl border border-white/25 bg-white/10 p-1.5 text-white transition-all hover:bg-white/20 hover:border-white/40 backdrop-blur-sm"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {!isAdmin && (
              <button
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'settings' })}
                className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-2.5 py-1.5 text-white transition-all hover:bg-white/20 hover:border-white/40 backdrop-blur-sm text-sm font-medium"
                aria-label="Admin Access"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Access</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setAdminOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-2.5 py-1.5 text-white transition-all hover:bg-white/20 hover:border-white/40 backdrop-blur-sm text-sm font-medium"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile search row ── */}
        <div className="sm:hidden px-4 pb-3">
          <DestinationSearch />
        </div>
      </header>

      <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} />
    </>
  )
}
