import { Camera, Globe2, BookOpen, CalendarDays, Send, ChevronLeft, ChevronRight, Home, Settings, Clock } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { View } from '@/lib/types'

const NAV: { id: View; label: string; sub: string; Icon: React.ElementType }[] = [
  { id: 'feed',    label: 'Feed',        sub: 'Staff adventures',    Icon: Camera },
  { id: 'map',     label: 'World Map',   sub: 'Explore destinations', Icon: Globe2 },
  { id: 'courses', label: 'Courses',     sub: 'Training resources',  Icon: BookOpen },
  { id: 'years',   label: 'By Year',     sub: 'Browse by year',      Icon: CalendarDays },
  { id: 'submit',  label: 'Submit Trip', sub: 'Share your adventure', Icon: Send },
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

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
    onMobileClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed top-16 inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-40 flex flex-col
          bg-card border-r border-border
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Home shortcut */}
        <div className={`px-3 pt-4 pb-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => { dispatch({ type: 'SET_VIEW', view: 'home' }); onMobileClose() }}
            title={collapsed ? 'Home' : undefined}
            className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted w-full"
          >
            <Home className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Home</span>}
          </button>
        </div>

        <div className={`mx-3 mb-3 ${collapsed ? 'mx-2' : ''}`}>
          <hr className="border-border" />
        </div>

        {/* Nav label */}
        {!collapsed && (
          <p className="px-5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sections
          </p>
        )}

        {/* Main Nav items */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, sub, Icon }) => {
            const active = activeView === id
            return (
              <button
                key={id}
                onClick={() => go(id)}
                title={collapsed ? label : undefined}
                className={`
                  w-full flex items-center rounded-xl transition-all duration-150
                  ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                  ${active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-medium leading-none ${active ? 'text-primary' : ''}`}>
                        {label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>
                    </div>
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom nav: Profile, Settings, Pending (admin) */}
        <div className="px-2 pb-2 space-y-0.5 border-t border-border pt-2">
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Account
            </p>
          )}

          {/* Settings */}
          <button
            onClick={() => go('settings')}
            title={collapsed ? 'Settings' : undefined}
            className={`
              w-full flex items-center rounded-xl transition-all duration-150
              ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
              ${activeView === 'settings'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${activeView === 'settings' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Settings className="h-3.5 w-3.5" />
            </div>
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </button>

          {/* Pending — admin only */}
          {isAdmin && (
            <button
              onClick={() => go('pending')}
              title={collapsed ? 'Pending' : undefined}
              className={`
                w-full flex items-center rounded-xl transition-all duration-150
                ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
                ${activeView === 'pending'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center relative ${activeView === 'pending' ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                <Clock className="h-3.5 w-3.5" />
                {pendingPosts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
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

        {/* Collapse toggle — desktop only */}
        <div className={`px-3 py-3 border-t border-border hidden lg:flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  )
}
