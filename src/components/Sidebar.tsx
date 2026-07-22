import { Camera, Globe as Globe2, House as Home, Airplane as Plane, CalendarDots as CalendarDays, PaperPlaneTilt as Send, GearSix as Settings, Clock, ClipboardText as ClipboardCheck, ChatCircle as MessageCircle, Key as KeyRound, Sun, Moon, Monitor, SignOut as LogOut, CaretRight as ChevronRight } from '@phosphor-icons/react'
import { useState, useEffect, useRef } from 'react'
import { signOut } from 'firebase/auth'
import { useApp } from '@/context/AppContext'
import { auth } from '@/lib/firebase'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import type { View } from '@/lib/types'

export const NAV: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'home',     label: 'Home',               Icon: Home },
  { id: 'feed',     label: 'Feed',               Icon: Camera },
  { id: 'map',      label: 'World Map',           Icon: Globe2 },
  { id: 'upcoming', label: 'Upcoming Trips',      Icon: Plane },
  { id: 'interest', label: 'Registered Interest', Icon: ClipboardCheck },
  { id: 'years',    label: 'Trips By Year',       Icon: CalendarDays },
  { id: 'submit',   label: 'Submit Trip',         Icon: Send },
]

function NavItem({
  label, Icon, active, expanded, badge, onClick,
}: {
  label: string; Icon: React.ElementType; active: boolean; expanded: boolean
  badge?: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={`
        w-full flex items-center rounded-xl transition-all duration-150 group relative
        ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5 xl:p-3'}
        ${active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        }
      `}
    >
      {active && expanded && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-foreground/30" />
      )}
      <div className="relative flex-shrink-0">
        <Icon className={`h-[1.1rem] w-[1.1rem] xl:h-[1.2rem] xl:w-[1.2rem] transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`} />
        {badge != null && badge > 0 && !expanded && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] flex items-center justify-center font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {expanded && (
        <span className={`text-sm flex-1 text-left whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
      )}
      {expanded && badge != null && badge > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
          {badge}
        </span>
      )}
    </button>
  )
}

export function Sidebar({ onExpandedChange }: { onExpandedChange?: (v: boolean) => void }) {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [contactOpen, setContactOpen] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logoOffset = (() => { try { const s = localStorage.getItem('logo-offset'); return s ? JSON.parse(s) : { x: 0, y: 0 } } catch { return { x: 0, y: 0 } } })()

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('theme')
    return (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system'
  })

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

  const cycleTheme = () => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light')
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const nextThemeLabel = theme === 'light' ? 'Dark mode' : theme === 'dark' ? 'System' : 'Light mode'

  const user = auth.currentUser
  const initials = (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
  const displayName = user?.displayName || user?.email || ''

  const expanded = hovered

  useEffect(() => { onExpandedChange?.(hovered) }, [hovered, onExpandedChange])

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
    setHovered(false)
  }

  function handleMouseEnter() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHovered(true)
  }

  function handleMouseLeave() {
    leaveTimer.current = setTimeout(() => {
      setHovered(false)
      setAccountOpen(false)
    }, 120)
  }

  const themeBtn = (t: 'light' | 'system' | 'dark', Icon: React.ElementType, label: string) => (
    <button
      key={t}
      onClick={() => setTheme(t)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors
        ${theme === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {expanded && <span className="capitalize">{label}</span>}
    </button>
  )

  return (
    <>
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          hidden lg:flex flex-col
          fixed top-0 bottom-0 left-0 z-50
          bg-background dark:bg-[#0a0a0a]
          transition-all duration-200 ease-out overflow-hidden
          ${expanded ? 'w-60 xl:w-72' : 'w-16 xl:w-20'}
        `}
      >
        {/* ── Logo ── */}
        <div
          className={`flex-shrink-0 flex items-center h-14 sm:h-16 2xl:h-20 overflow-hidden border-b border-white/10 bg-zinc-950 ${expanded ? 'px-4' : 'justify-center'}`}
        >
          <button
            type="button"
            onClick={() => go('home')}
            className={`flex items-center hover:opacity-80 transition-opacity ${expanded ? 'gap-2.5' : ''}`}
          >
            <img
              src="/daf-logo.png"
              alt="DAF"
              className="h-6 2xl:h-[1.875rem] w-auto drop-shadow-sm select-none flex-shrink-0"
              style={{ transform: `translate(${logoOffset.x}px, ${logoOffset.y}px)` }}
            />
            {expanded && (
              <span className="font-gilbert text-white text-xl 2xl:text-2xl leading-none drop-shadow-sm whitespace-nowrap">
                DAFAGRAM
              </span>
            )}
          </button>
        </div>

        {/* ── Main navigation ── */}
        <nav className="px-2 pt-3 pb-2 space-y-0.5">
          {NAV.map(({ id, label, Icon }) => (
            <NavItem
              key={id} label={label} Icon={Icon}
              active={activeView === id}
              expanded={expanded}
              onClick={() => go(id)}
            />
          ))}
        </nav>

        {/* ── Admin section ── */}
        {isAdmin && (
          <div className="px-2 pt-1 pb-2 space-y-0.5">
            {expanded && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
                Admin
              </p>
            )}
            <NavItem
              label="Pending" Icon={Clock}
              active={activeView === 'pending'}
              expanded={expanded}
              badge={pendingPosts.length}
              onClick={() => go('pending')}
            />
            <NavItem
              label="Settings" Icon={Settings}
              active={activeView === 'settings'}
              expanded={expanded}
              onClick={() => go('settings')}
            />
          </div>
        )}

        <div className="flex-1" />

        {/* ── Contact admin ── */}
        <div className="px-2 pb-1">
          <NavItem
            label="Contact Admin" Icon={MessageCircle}
            active={false} expanded={expanded}
            onClick={() => { setContactOpen(true); setHovered(false) }}
          />
        </div>

        {/* ── Account ── */}
        <div className="px-2 pt-1 pb-1 space-y-0.5">
          <button
            onClick={() => setAccountOpen(v => !v)}
            title={!expanded ? displayName : undefined}
            className={`w-full flex items-center rounded-xl transition-all duration-150 text-muted-foreground hover:bg-primary/15 hover:text-foreground
              ${expanded ? 'gap-2.5 px-3 py-2.5' : 'justify-center p-2.5 xl:p-3'}`}
          >
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-foreground">{initials}</span>
            </div>
            {expanded && (
              <>
                <p className="text-xs truncate flex-1 text-left font-medium leading-tight">{displayName}</p>
                <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${accountOpen ? 'rotate-90' : ''}`} />
              </>
            )}
          </button>

          {accountOpen && (
            <>
              <button
                onClick={() => { setChangePwdOpen(true); setAccountOpen(false) }}
                title={!expanded ? 'Change Password' : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-150 text-muted-foreground hover:bg-primary/15 hover:text-foreground group
                  ${expanded ? 'gap-3 px-3 py-2' : 'justify-center p-2.5 xl:p-3'}`}
              >
                <KeyRound className="h-[1.1rem] w-[1.1rem] flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                {expanded && <span className="text-sm font-medium">Change Password</span>}
              </button>
              <button
                onClick={() => signOut(auth)}
                title={!expanded ? 'Log out' : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-150 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group
                  ${expanded ? 'gap-3 px-3 py-2' : 'justify-center p-2.5 xl:p-3'}`}
              >
                <LogOut className="h-[1.1rem] w-[1.1rem] flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                {expanded && <span className="text-sm font-medium">Log out</span>}
              </button>
            </>
          )}
        </div>

        {/* ── Theme ── */}
        <div className="px-2 py-2 flex items-center gap-1">
          {expanded ? (
            <div className="flex items-center rounded-lg bg-muted p-0.5 flex-1">
              {themeBtn('light', Sun, 'Light')}
              {themeBtn('system', Monitor, 'System')}
              {themeBtn('dark', Moon, 'Dark')}
            </div>
          ) : (
            <button
              onClick={cycleTheme}
              title={nextThemeLabel}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mx-auto"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
      <ChangePasswordDialog open={changePwdOpen} onOpenChange={setChangePwdOpen} />
    </>
  )
}
