import { Camera, Globe2, Plane, CalendarDays, Send, ChevronLeft, ChevronRight, Settings, Clock, ClipboardCheck, MessageCircle, KeyRound, ChevronDown, Sun, Moon, Monitor } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { auth } from '@/lib/firebase'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import type { View } from '@/lib/types'

const NAV: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'feed',     label: 'Feed',                    Icon: Camera },
  { id: 'map',      label: 'World Map',               Icon: Globe2 },
  { id: 'upcoming', label: 'Upcoming Trips',          Icon: Plane },
  { id: 'interest', label: 'Registered Interest',     Icon: ClipboardCheck },
  { id: 'years',    label: 'Trips By Year',            Icon: CalendarDays },
  { id: 'submit',   label: 'Submit Trip',             Icon: Send },
]

interface Props {
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onCollapsedChange, mobileOpen, onMobileClose }: Props) {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [contactOpen, setContactOpen]     = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)
  const [accountOpen, setAccountOpen]     = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('theme')
    return (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system'
  })
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const apply = (t: 'light' | 'dark' | 'system') => {
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
    }
    apply(theme)
    localStorage.setItem('theme', theme)
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const ThemeIcon = themeIcon
  const nextThemeLabel = theme === 'light' ? 'Dark mode' : theme === 'dark' ? 'System' : 'Light mode'
  const cycleTheme = () => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light')

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
    onMobileClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed top-14 sm:top-16 2xl:top-20 inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-14 sm:top-16 2xl:top-20 bottom-0 left-0 z-40 flex flex-col
          bg-background border-r border-border
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16 xl:w-20' : 'w-60 xl:w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Main nav — natural height, never scrolls */}
        <nav className="px-2 pt-3 pb-2 space-y-0.5 border-b border-border">
          {NAV.map(({ id, label, Icon }) => {
            const active = activeView === id
            return (
              <button
                key={id}
                onClick={() => go(id)}
                title={collapsed ? label : undefined}
                className={`
                  w-full flex items-center transition-colors duration-150
                  ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-3 px-3 py-2'}
                  ${active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className="h-5 w-5 xl:h-[1.375rem] xl:w-[1.375rem] flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{label}</span>
                )}
              </button>
            )
          })}
        </nav>

        <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
        <ChangePasswordDialog open={changePwdOpen} onOpenChange={setChangePwdOpen} />

        {/* Bottom utilities — flex-1 so this section absorbs remaining space and scrolls if short */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 pt-2 space-y-0.5">
          {/* Theme picker — mobile only (desktop is in the bottom bar) */}
          <div className="lg:hidden px-1 py-1">
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
              {(['light', 'system', 'dark'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors ${theme === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t === 'light' && <Sun className="h-3.5 w-3.5" />}
                  {t === 'system' && <Monitor className="h-3.5 w-3.5" />}
                  {t === 'dark' && <Moon className="h-3.5 w-3.5" />}
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setContactOpen(true)}
            title={collapsed ? 'Contact Admin' : undefined}
            className={`w-full flex items-center transition-colors duration-150 text-muted-foreground hover:text-foreground ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}`}
          >
            <MessageCircle className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Contact Admin</span>}
          </button>
          {isAdmin && (
          <button
            onClick={() => go('settings')}
            title={collapsed ? 'Settings' : undefined}
            className={`
              w-full flex items-center transition-colors duration-150
              ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
              ${activeView === 'settings'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </button>
          )}

          {isAdmin && (
            <button
              onClick={() => go('pending')}
              title={collapsed ? 'Pending' : undefined}
              className={`
                w-full flex items-center transition-colors duration-150
                ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                ${activeView === 'pending'
                  ? 'text-amber-500'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <div className="relative flex-shrink-0">
                <Clock className="h-5 w-5" />
                {pendingPosts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] flex items-center justify-center font-bold">
                    {pendingPosts.length > 9 ? '9+' : pendingPosts.length}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-medium">Pending</span>
                  {pendingPosts.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                      {pendingPosts.length}
                    </span>
                  )}
                </div>
              )}
            </button>
          )}
        </div>

        {/* Account */}
        <div className="px-2 pt-2 border-t border-border" ref={accountRef}>
          {/* User row — click to toggle account section */}
          <button
            onClick={() => setAccountOpen(v => !v)}
            title={collapsed ? 'Account' : undefined}
            className={`w-full flex items-center transition-colors duration-150 text-muted-foreground hover:text-foreground ${collapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2'}`}
          >
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">
                {(auth.currentUser?.displayName?.[0] ?? auth.currentUser?.email?.[0] ?? '?').toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <>
                <p className="text-xs truncate flex-1 text-left">
                  {auth.currentUser?.displayName || auth.currentUser?.email}
                </p>
                <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {/* Expanded account section — below the name row */}
          {accountOpen && (
            <div className={`rounded-lg bg-muted/50 overflow-hidden mt-0.5 ${collapsed ? 'absolute left-full bottom-24 ml-2 w-44 shadow-lg border border-border bg-background z-50' : ''}`}>
              {collapsed && (
                <div className="flex items-center gap-2.5 min-w-0 px-3 py-2.5 border-b border-border">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {(auth.currentUser?.displayName?.[0] ?? auth.currentUser?.email?.[0] ?? '?').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {auth.currentUser?.displayName || auth.currentUser?.email}
                  </p>
                </div>
              )}
              <button
                onClick={() => { setChangePwdOpen(true); setAccountOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                <KeyRound className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">Change Password</span>
              </button>
            </div>
          )}
        </div>

        {/* Theme + Collapse toggle */}
        <div className={`px-2 py-2 border-t border-border hidden lg:flex items-center ${collapsed ? 'flex-col gap-1' : 'gap-1'}`}>
          {collapsed ? (
            <button
              onClick={cycleTheme}
              title={nextThemeLabel}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 flex-1">
              {(['light', 'system', 'dark'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors ${theme === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t === 'light' && <Sun className="h-3.5 w-3.5" />}
                  {t === 'system' && <Monitor className="h-3.5 w-3.5" />}
                  {t === 'dark' && <Moon className="h-3.5 w-3.5" />}
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  )
}
