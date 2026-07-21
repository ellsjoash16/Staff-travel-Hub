import { Camera, Globe2, Plane, CalendarDays, Send, ChevronLeft, ChevronRight, Settings, Clock, ClipboardCheck, MessageCircle, KeyRound, Sun, Moon, Monitor, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { useApp } from '@/context/AppContext'
import { auth } from '@/lib/firebase'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import type { View } from '@/lib/types'

const SIDEBAR_BG = '#064e5a'

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
  label, Icon, active, collapsed, badge, onClick,
}: {
  label: string; Icon: React.ElementType; active: boolean; collapsed: boolean
  badge?: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        w-full flex items-center rounded-xl transition-all duration-150 group relative
        ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-3 px-3 py-2.5'}
        ${active
          ? 'bg-white/15 text-white'
          : 'text-white/55 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-white/70" />
      )}
      <div className="relative flex-shrink-0">
        <Icon className={`h-[1.1rem] w-[1.1rem] xl:h-[1.2rem] xl:w-[1.2rem] transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`} />
        {badge != null && badge > 0 && collapsed && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-[#064e5a] text-[8px] flex items-center justify-center font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className={`text-sm flex-1 text-left ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
      )}
      {!collapsed && badge != null && badge > 0 && (
        <span className="text-[11px] px-1.5 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-300">
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

  const themeBtn = (t: 'light' | 'system' | 'dark', Icon: React.ElementType, label: string) => (
    <button
      key={t}
      onClick={() => setTheme(t)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-colors
        ${theme === t ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {!collapsed && <span className="capitalize">{label}</span>}
    </button>
  )

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed top-14 sm:top-16 2xl:top-20 inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-14 sm:top-16 2xl:top-20 bottom-0 left-0 z-40 flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16 xl:w-20' : 'w-60 xl:w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: SIDEBAR_BG }}
      >
        {/* ── Main navigation ── */}
        <nav className="px-2 pt-3 pb-2 space-y-0.5">
          {NAV.map(({ id, label, Icon }) => (
            <NavItem
              key={id} label={label} Icon={Icon}
              active={activeView === id}
              collapsed={collapsed}
              onClick={() => go(id)}
            />
          ))}
        </nav>

        {/* ── Admin section ── */}
        {isAdmin && (
          <div className="px-2 pt-1 pb-2 space-y-0.5">
            <div className="mx-3 my-1.5 border-t border-white/10" />
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/25 select-none">
                Admin
              </p>
            )}
            <NavItem
              label="Pending" Icon={Clock}
              active={activeView === 'pending'}
              collapsed={collapsed}
              badge={pendingPosts.length}
              onClick={() => go('pending')}
            />
            <NavItem
              label="Settings" Icon={Settings}
              active={activeView === 'settings'}
              collapsed={collapsed}
              onClick={() => go('settings')}
            />
          </div>
        )}

        <div className="flex-1" />

        {/* ── Contact admin ── */}
        <div className="px-2 pb-1">
          <NavItem
            label="Contact Admin" Icon={MessageCircle}
            active={false} collapsed={collapsed}
            onClick={() => { setContactOpen(true); onMobileClose() }}
          />
        </div>

        {/* ── Account ── */}
        <div className="px-2 pt-1 pb-1 border-t border-white/10 space-y-0.5">
          <button
            onClick={() => setAccountOpen(v => !v)}
            title={collapsed ? displayName : undefined}
            className={`w-full flex items-center rounded-xl transition-all duration-150 text-white/60 hover:bg-white/10 hover:text-white
              ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-2.5 px-3 py-2.5'}`}
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            {!collapsed && (
              <p className="text-xs truncate flex-1 text-left font-medium leading-tight">{displayName}</p>
            )}
          </button>

          {accountOpen && (
            <>
              <button
                onClick={() => { setChangePwdOpen(true); setAccountOpen(false); onMobileClose() }}
                title={collapsed ? 'Change Password' : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-150 text-white/55 hover:bg-white/10 hover:text-white group
                  ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-3 px-3 py-2'}`}
              >
                <KeyRound className="h-[1.1rem] w-[1.1rem] flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                {!collapsed && <span className="text-sm font-medium">Change Password</span>}
              </button>
              <button
                onClick={() => signOut(auth)}
                title={collapsed ? 'Log out' : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-150 text-white/55 hover:bg-red-500/20 hover:text-red-300 group
                  ${collapsed ? 'justify-center p-2.5 xl:p-3' : 'gap-3 px-3 py-2'}`}
              >
                <LogOut className="h-[1.1rem] w-[1.1rem] flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                {!collapsed && <span className="text-sm font-medium">Log out</span>}
              </button>
            </>
          )}
        </div>

        {/* ── Theme + Collapse (desktop) ── */}
        <div className={`px-2 py-2 border-t border-white/10 hidden lg:flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
          {collapsed ? (
            <button
              onClick={cycleTheme}
              title={nextThemeLabel}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center rounded-lg bg-white/8 p-0.5 flex-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {themeBtn('light', Sun, 'Light')}
              {themeBtn('system', Monitor, 'System')}
              {themeBtn('dark', Moon, 'Dark')}
            </div>
          )}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Theme (mobile) ── */}
        <div className="lg:hidden px-2 pb-2 border-t border-white/10 pt-2">
          <div className="flex items-center rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {themeBtn('light', Sun, 'Light')}
            {themeBtn('system', Monitor, 'System')}
            {themeBtn('dark', Moon, 'Dark')}
          </div>
        </div>

        <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
        <ChangePasswordDialog open={changePwdOpen} onOpenChange={setChangePwdOpen} />
      </aside>
    </>
  )
}
