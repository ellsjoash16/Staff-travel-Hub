import { Camera, Globe2, Plane, CalendarDays, Send, ChevronLeft, ChevronRight, Settings, Clock, ClipboardCheck, MessageCircle, KeyRound, Sun, Moon, Monitor, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { useApp } from '@/context/AppContext'
import { auth } from '@/lib/firebase'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import type { View } from '@/lib/types'

const NAV: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'feed',     label: 'Feed',               Icon: Camera },
  { id: 'map',      label: 'World Map',           Icon: Globe2 },
  { id: 'upcoming', label: 'Upcoming Trips',      Icon: Plane },
  { id: 'interest', label: 'Registered Interest', Icon: ClipboardCheck },
  { id: 'years',    label: 'Trips By Year',       Icon: CalendarDays },
  { id: 'submit',   label: 'Submit Trip',         Icon: Send },
]

interface Props {
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavItem({
  id, label, Icon, active, collapsed, badge, badgeColor = 'amber', onClick,
}: {
  id: string; label: string; Icon: React.ElementType; active: boolean; collapsed: boolean
  badge?: number; badgeColor?: 'amber' | 'primary'; onClick: () => void
}) {
  return (
    <button
      key={id}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        w-full flex items-center rounded-lg transition-all duration-150 group relative
        ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-3 px-3 py-2'}
        ${active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }
      `}
    >
      <div className="relative flex-shrink-0">
        <Icon className={`h-[1.1rem] w-[1.1rem] xl:h-5 xl:w-5 transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`} />
        {badge != null && badge > 0 && collapsed && (
          <span className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full text-white text-[8px] flex items-center justify-center font-bold ${badgeColor === 'amber' ? 'bg-amber-500' : 'bg-primary'}`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className={`text-sm flex-1 text-left ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
      )}
      {!collapsed && badge != null && badge > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${badgeColor === 'amber' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/15 text-primary'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

export function Sidebar({ collapsed, onCollapsedChange, mobileOpen, onMobileClose }: Props) {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [contactOpen, setContactOpen] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
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
        {/* ── Main navigation ── */}
        <nav className="px-2 pt-3 pb-2 space-y-0.5">
          {NAV.map(({ id, label, Icon }) => (
            <NavItem
              key={id} id={id} label={label} Icon={Icon}
              active={activeView === id}
              collapsed={collapsed}
              onClick={() => go(id)}
            />
          ))}
        </nav>

        {/* ── Admin section ── */}
        {isAdmin && (
          <div className="px-2 pt-1 pb-2 space-y-0.5">
            {!collapsed && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
                Admin
              </p>
            )}
            {collapsed && <div className="border-t border-border/60 mx-1 mb-1" />}
            <NavItem
              id="pending" label="Pending" Icon={Clock}
              active={activeView === 'pending'}
              collapsed={collapsed}
              badge={pendingPosts.length}
              badgeColor="amber"
              onClick={() => go('pending')}
            />
            <NavItem
              id="settings" label="Settings" Icon={Settings}
              active={activeView === 'settings'}
              collapsed={collapsed}
              onClick={() => go('settings')}
            />
          </div>
        )}

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Utilities ── */}
        <div className="px-2 pb-1 space-y-0.5">
          <NavItem
            id="contact" label="Contact Admin" Icon={MessageCircle}
            active={false} collapsed={collapsed}
            onClick={() => { setContactOpen(true); onMobileClose() }}
          />
        </div>

        {/* ── Account & sign-out ── */}
        <div className="px-2 pt-1 pb-1 border-t border-border space-y-0.5">
          {/* User identity row — click to expand */}
          <button
            onClick={() => setAccountOpen(v => !v)}
            title={collapsed ? displayName : undefined}
            className={`w-full flex items-center rounded-lg transition-all duration-150 text-muted-foreground hover:bg-accent hover:text-accent-foreground
              ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-2.5 px-3 py-2'}`}
          >
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            {!collapsed && (
              <p className="text-xs truncate flex-1 text-left leading-tight">{displayName}</p>
            )}
          </button>

          {/* Expanded account actions */}
          {accountOpen && (
            <>
              {/* Change password */}
              <button
                onClick={() => { setChangePwdOpen(true); setAccountOpen(false); onMobileClose() }}
                title={collapsed ? 'Change Password' : undefined}
                className={`w-full flex items-center rounded-lg transition-all duration-150 text-muted-foreground hover:bg-accent hover:text-accent-foreground group
                  ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-3 px-3 py-2'}`}
              >
                <KeyRound className="h-[1.1rem] w-[1.1rem] xl:h-5 xl:w-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                {!collapsed && <span className="text-sm font-medium">Change Password</span>}
              </button>

              {/* Log out */}
              <button
                onClick={() => signOut(auth)}
                title={collapsed ? 'Log out' : undefined}
                className={`w-full flex items-center rounded-lg transition-all duration-150 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group
                  ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-3 px-3 py-2'}`}
              >
                <LogOut className="h-[1.1rem] w-[1.1rem] xl:h-5 xl:w-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                {!collapsed && <span className="text-sm font-medium">Log out</span>}
              </button>
            </>
          )}
        </div>

        {/* ── Theme + Collapse toggle ── */}
        <div className={`px-2 py-2 border-t border-border hidden lg:flex items-center ${collapsed ? 'flex-col gap-1' : 'gap-1'}`}>
          {collapsed ? (
            <button
              onClick={cycleTheme}
              title={nextThemeLabel}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-accent-foreground"
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
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-accent-foreground ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile theme picker */}
        <div className="lg:hidden px-2 pb-2 border-t border-border pt-2">
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

        <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
        <ChangePasswordDialog open={changePwdOpen} onOpenChange={setChangePwdOpen} />
      </aside>
    </>
  )
}
