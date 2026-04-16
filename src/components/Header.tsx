import { useState } from 'react'
import { MapPin, BookOpen, Camera, Settings, Shield, CalendarDays, Send } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { View } from '@/lib/types'
import { AdminLoginDialog } from './AdminLoginDialog'
import { AdminPanel } from './AdminPanel'

export function Header() {
  const { state, dispatch } = useApp()
  const { activeView, settings, isAdmin } = state
  const [loginOpen, setLoginOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'feed', label: 'Feed', icon: <Camera className="h-4 w-4" /> },
    { id: 'map', label: 'World Map', icon: <MapPin className="h-4 w-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'years', label: 'By Year', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'submit', label: 'Submit', icon: <Send className="h-4 w-4" /> },
  ]

  function handleAdminClick() {
    if (isAdmin) { setAdminOpen(true) } else { setLoginOpen(true) }
  }

  function handleLoginSuccess() {
    setLoginOpen(false)
    dispatch({ type: 'SET_ADMIN', value: true })
    setAdminOpen(true)
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 h-16"
        style={{
          background: 'linear-gradient(90deg, #064e5a 0%, #05979a 40%, #05979a 60%, #07c5b0 100%)',
          boxShadow: '0 2px 24px hsl(var(--primary) / 0.45)',
        }}
      >
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6">

          {/* Logo + Title */}
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })}
            className="flex min-w-0 items-center gap-3 hover:opacity-85 transition-opacity"
          >
            <img src="/daf-bird.png" alt="DAF" className="h-9 w-auto flex-shrink-0 drop-shadow-sm" />
            <span className="hidden sm:block font-outfit font-bold italic text-white text-2xl tracking-wide leading-none drop-shadow-sm">
              {settings.title}
            </span>
          </button>

          {/* Nav */}
          <nav className="flex gap-0.5">
            {navItems.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => dispatch({ type: 'SET_VIEW', view: id })}
                className={`
                  relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-white/90 transition-all duration-200
                  ${activeView === id
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'hover:bg-white/15 hover:text-white'
                  }
                `}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
                {activeView === id && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-white/80" />
                )}
              </button>
            ))}
          </nav>

          {/* Admin */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <span className="hidden sm:flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs text-white/90 backdrop-blur-sm">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            )}
            <button
              onClick={handleAdminClick}
              className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-sm text-white transition-all hover:bg-white/20 hover:border-white/40 backdrop-blur-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </header>

      <AdminLoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSuccess={handleLoginSuccess} />
      <AdminPanel
        open={adminOpen}
        onOpenChange={(open) => {
          setAdminOpen(open)
          if (!open) dispatch({ type: 'SET_ADMIN', value: false })
        }}
      />
    </>
  )
}
