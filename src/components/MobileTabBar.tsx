import { Clock, GearSix as Settings, ChatCircle as MessageCircle, DotsThree as MoreHorizontal, Globe as Globe2, Airplane as Plane, PaperPlaneTilt as Send, Camera, CalendarDots as CalendarDays, CheckSquare as ClipboardCheck, X } from '@phosphor-icons/react'
import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import type { View } from '@/lib/types'

const PRIMARY: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'feed',     label: 'Feed',     Icon: Camera },
  { id: 'upcoming', label: 'Upcoming', Icon: Plane },
  { id: 'submit',   label: 'Submit',   Icon: Send },
  { id: 'map',      label: 'Map',      Icon: Globe2 },
]

const SECONDARY: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'interest', label: 'My Registrations', Icon: ClipboardCheck },
  { id: 'years',    label: 'Trips By Year',    Icon: CalendarDays },
]

const ADMIN_ITEMS: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'pending',  label: 'Pending',  Icon: Clock },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

const ISLAND_WIDTH = 'w-[280px]'

const TAB_GLASS_STYLE: React.CSSProperties = {
  '--liquid-glass-rim-width': '1px',
  '--liquid-glass-rim-light': 'rgba(255,255,255,0.4)',
  '--liquid-glass-rim-dark': 'rgba(0,0,0,0.06)',
  '--liquid-glass-rim-fade': '15%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14)',
} as React.CSSProperties

const TAB_COUNT = PRIMARY.length + 1 // 4 primary + More

export function MobileTabBar() {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [moreOpen, setMoreOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
    setMoreOpen(false)
  }

  function idxFromX(clientX: number) {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(TAB_COUNT - 1, Math.floor(((clientX - rect.left) / rect.width) * TAB_COUNT)))
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragIdx(idxFromX(e.clientX))
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    setDragIdx(idxFromX(e.clientX))
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    dragging.current = false
    const idx = idxFromX(e.clientX)
    setDragIdx(null)
    if (idx < PRIMARY.length) {
      go(PRIMARY[idx].id)
    } else {
      setMoreOpen(v => !v)
    }
  }

  const activeIdx = PRIMARY.findIndex(p => p.id === activeView)
  const indicatorIdx = dragIdx ?? (activeIdx >= 0 ? activeIdx : PRIMARY.length)
  const moreActive = activeIdx < 0

  return (
    <>
      {/* ── More sheet (floating card above island) ── */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          onClick={() => setMoreOpen(false)}
        >
          <LiquidGlass
            className={`absolute bottom-[90px] left-1/2 -translate-x-1/2 ${ISLAND_WIDTH} rounded-2xl bg-white/[0.06]`}
            blur={12}
            refraction={12}
            bezel={0.2}
            saturation={1.5}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14)' } as React.CSSProperties}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-black/60 dark:text-white/60 text-xs font-semibold uppercase tracking-widest">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-4">
              {SECONDARY.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all
                    ${activeView === item.id
                      ? 'bg-black/[0.08] dark:bg-white/[0.12] text-black dark:text-white'
                      : 'text-black/60 dark:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white'}`}
                >
                  <item.Icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
              {isAdmin && ADMIN_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all relative
                    ${activeView === item.id
                      ? 'bg-black/[0.08] dark:bg-white/[0.12] text-black dark:text-white'
                      : 'text-black/60 dark:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white'}`}
                >
                  <div className="relative">
                    <item.Icon className="h-5 w-5" />
                    {item.id === 'pending' && pendingPosts.length > 0 && (
                      <span className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-amber-400 text-[#064e5a] text-[7px] flex items-center justify-center font-bold">
                        {pendingPosts.length > 9 ? '9+' : pendingPosts.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => { setContactOpen(true); setMoreOpen(false) }}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-black/60 dark:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-[9px] font-medium leading-tight text-center">Contact</span>
              </button>
            </div>
          </LiquidGlass>
        </div>
      )}

      {/* ── Island tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-center items-end pb-8 pointer-events-none">
        <LiquidGlass
          className={`pointer-events-auto ${ISLAND_WIDTH} rounded-[28px]`}
          blur={4}
          refraction={12}
          bezel={0.65}
          saturation={1.4}
          style={TAB_GLASS_STYLE}
        >
          <div
            ref={barRef}
            className="relative flex items-stretch w-full select-none touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Sliding active indicator */}
            <span
              className="absolute inset-y-1 rounded-2xl bg-black/[0.08] dark:bg-white/[0.14] pointer-events-none"
              style={{
                width: `calc(${100 / TAB_COUNT}% - 8px)`,
                left: `calc(${indicatorIdx} * ${100 / TAB_COUNT}% + 4px)`,
                transition: dragIdx !== null ? 'none' : 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />

            {PRIMARY.map((item, idx) => {
              const active = dragIdx !== null ? dragIdx === idx : activeView === item.id
              return (
                <div
                  key={item.id}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 relative z-10 transition-colors duration-150
                    ${active ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50'}`}
                >
                  <item.Icon className="h-[1.1rem] w-[1.1rem]" />
                  <span className={`text-[9px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                </div>
              )
            })}

            <div
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 relative z-10 transition-colors duration-150
                ${(dragIdx !== null ? dragIdx === PRIMARY.length : moreActive) || moreOpen ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50'}`}
            >
              <MoreHorizontal className="h-[1.1rem] w-[1.1rem]" />
              <span className="text-[9px] leading-none font-medium">More</span>
            </div>
          </div>
        </LiquidGlass>
      </nav>

      <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
