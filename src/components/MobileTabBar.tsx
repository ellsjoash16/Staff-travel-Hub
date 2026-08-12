import { Clock, GearSix as Settings, ChatCircle as MessageCircle, DotsThree as MoreHorizontal, Globe as Globe2, Airplane as Plane, PaperPlaneTilt as Send, Camera, CalendarDots as CalendarDays, CheckSquare as ClipboardCheck, House as Home, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import type { View } from '@/lib/types'

const PRIMARY: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'feed',     label: 'Feed',     Icon: Camera },
  { id: 'upcoming', label: 'Upcoming', Icon: Plane },
  { id: 'submit',   label: 'Share',    Icon: Send },
  { id: 'map',      label: 'Map',      Icon: Globe2 },
]

// Full menu shown in the More sheet — every destination, one tap away.
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

export function MobileTabBar() {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [moreOpen, setMoreOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
    setMoreOpen(false)
  }

  const activeIdx = PRIMARY.findIndex(p => p.id === activeView)
  const moreActive = activeIdx < 0

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

      {/* ── Bottom bar ── */}
      <nav className="lg:hidden shrink-0 z-40 bg-card border-t border-border">
        <div className="flex items-stretch" style={SAFE_BOTTOM}>
          {PRIMARY.map(item => {
            const active = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors
                  ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
                <item.Icon className="h-[1.35rem] w-[1.35rem]" weight={active ? 'fill' : 'regular'} />
                <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors
              ${moreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {(moreActive || moreOpen) && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
            <MoreHorizontal className="h-[1.35rem] w-[1.35rem]" weight={moreActive || moreOpen ? 'fill' : 'regular'} />
            <span className="text-[10px] leading-none font-medium">More</span>
          </button>
        </div>
      </nav>

      <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
