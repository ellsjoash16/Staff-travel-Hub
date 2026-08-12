import { Clock, GearSix as Settings, ChatCircle as MessageCircle, SquaresFour, Globe as Globe2, Airplane as Plane, PaperPlaneTilt as Send, Camera, CalendarDots as CalendarDays, CheckSquare as ClipboardCheck, House as Home, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import type { View } from '@/lib/types'

// Full menu shown in the sheet — every destination, one tap away.
const MENU_ITEMS: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'home',     label: 'Home',            Icon: Home },
  { id: 'feed',     label: 'Feed',            Icon: Camera },
  { id: 'upcoming', label: 'Upcoming',        Icon: Plane },
  { id: 'submit',   label: 'Share',           Icon: Send },
  { id: 'map',      label: 'Map',             Icon: Globe2 },
  { id: 'interest', label: 'My Registrations', Icon: ClipboardCheck },
  { id: 'years',    label: 'DAF Adventures',  Icon: CalendarDays },
]

const ADMIN_ITEMS: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'pending',  label: 'Pending',  Icon: Clock },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

const SAFE_BOTTOM: React.CSSProperties = { paddingBottom: 'env(safe-area-inset-bottom)' }

// Floating bar sits 0.75rem above the home indicator / screen edge.
const BAR_SAFE_BOTTOM: React.CSSProperties = { paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }

const GLASS_STYLE: React.CSSProperties = {
  '--liquid-glass-rim-width': '1px',
  '--liquid-glass-rim-light': 'rgba(255,255,255,0.45)',
  '--liquid-glass-rim-dark': 'rgba(0,0,0,0.08)',
  '--liquid-glass-rim-fade': '16%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14)',
} as React.CSSProperties

export function MobileTabBar() {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [moreOpen, setMoreOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
    setMoreOpen(false)
  }

  return (
    <>
      {/* ── More sheet ── */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute left-0 right-0 bottom-0 bg-card border-t border-border rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200"
            style={SAFE_BOTTOM}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-2">
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Go to</span>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-5">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-colors
                    ${activeView === item.id
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'bg-muted/40 text-foreground/80 hover:bg-muted active:scale-95'}`}
                >
                  <item.Icon className="h-6 w-6" weight={activeView === item.id ? 'fill' : 'regular'} />
                  <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
              {isAdmin && ADMIN_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-colors relative
                    ${activeView === item.id
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'bg-muted/40 text-foreground/80 hover:bg-muted active:scale-95'}`}
                >
                  <div className="relative">
                    <item.Icon className="h-6 w-6" weight={activeView === item.id ? 'fill' : 'regular'} />
                    {item.id === 'pending' && pendingPosts.length > 0 && (
                      <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-400 text-[#064e5a] text-[8px] flex items-center justify-center font-bold">
                        {pendingPosts.length > 9 ? '9+' : pendingPosts.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => { setContactOpen(true); setMoreOpen(false) }}
                className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-muted/40 text-foreground/80 hover:bg-muted active:scale-95 transition-colors"
              >
                <MessageCircle className="h-6 w-6" />
                <span className="text-[11px] font-medium leading-tight text-center">Contact</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating liquid-glass Menu launcher ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pt-3 pointer-events-none" style={BAR_SAFE_BOTTOM}>
        <button
          onClick={() => setMoreOpen(true)}
          className="pointer-events-auto w-full block active:scale-[0.98] transition-transform"
        >
          <LiquidGlass
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-black dark:text-white font-semibold text-sm"
            blur={4}
            refraction={12}
            bezel={0.65}
            saturation={1.4}
            style={GLASS_STYLE}
          >
            <SquaresFour className="h-5 w-5" weight="fill" />
            Menu
            {isAdmin && pendingPosts.length > 0 && (
              <span className="ml-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-[#064e5a] text-[10px] flex items-center justify-center font-bold">
                {pendingPosts.length > 9 ? '9+' : pendingPosts.length}
              </span>
            )}
          </LiquidGlass>
        </button>
      </nav>

      <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
