import { Camera, Globe2, Plane, CalendarDays, Send, ChevronLeft, ChevronRight, Settings, Clock, ClipboardCheck } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { View } from '@/lib/types'

const NAV: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'feed',     label: 'Feed',                    Icon: Camera },
  { id: 'map',      label: 'World Map',               Icon: Globe2 },
  { id: 'upcoming', label: 'Upcoming Trips',          Icon: Plane },
  { id: 'interest', label: 'Registered Interest',     Icon: ClipboardCheck },
  { id: 'years',    label: 'By Year',                 Icon: CalendarDays },
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
        {/* Main nav */}
        <nav className="flex-1 px-2 pt-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => {
            const active = activeView === id
            return (
              <button
                key={id}
                onClick={() => go(id)}
                title={collapsed ? label : undefined}
                className={`
                  w-full flex items-center transition-colors duration-150
                  ${collapsed ? 'justify-center p-3 xl:p-4' : 'gap-3 px-3 py-2.5'}
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

        {/* Bottom: Settings + Pending */}
        <div className="px-2 pb-2 pt-2 border-t border-border space-y-0.5">
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

        {/* Collapse toggle */}
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
