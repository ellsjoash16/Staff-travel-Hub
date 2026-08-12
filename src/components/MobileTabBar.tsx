import { Clock, GearSix as Settings, ChatCircle as MessageCircle, Globe as Globe2, Airplane as Plane, PaperPlaneTilt as Send, Camera, CalendarDots as CalendarDays, CheckSquare as ClipboardCheck, House as Home } from '@phosphor-icons/react'
import { useState, useRef, useLayoutEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import type { View } from '@/lib/types'

// Full menu — every destination, one tap away.
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

const GLASS_STYLE: React.CSSProperties = {
  '--liquid-glass-rim-width': '1px',
  '--liquid-glass-rim-light': 'rgba(255,255,255,0.45)',
  '--liquid-glass-rim-dark': 'rgba(0,0,0,0.08)',
  '--liquid-glass-rim-fade': '16%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14)',
} as React.CSSProperties

// How much of the sheet peeks above the screen edge when closed (the grabber).
const PEEK = 52

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function MobileTabBar() {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [contactOpen, setContactOpen] = useState(false)

  const [open, setOpen] = useState(false)
  const [sheetH, setSheetH] = useState(0)
  const [dragY, setDragY] = useState<number | null>(null) // live translateY while dragging
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerY: number; baseY: number; moved: boolean } | null>(null)

  // Measure the sheet so we know how far "closed" is (fully down bar the peek).
  useLayoutEffect(() => {
    const el = sheetRef.current
    if (!el) return
    const measure = () => setSheetH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const measured = sheetH > 0
  const closedY = Math.max(0, sheetH - PEEK)
  const restY = open ? 0 : closedY
  const y = dragY ?? (measured ? restY : 4000) // keep hidden until measured
  const progress = closedY > 0 ? 1 - clamp(y / closedY, 0, 1) : open ? 1 : 0

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
    setOpen(false)
  }

  function onDown(e: React.PointerEvent) {
    drag.current = { pointerY: e.clientY, baseY: y, moved: false }
    setDragY(y)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const delta = e.clientY - d.pointerY
    if (Math.abs(delta) > 4) d.moved = true
    setDragY(clamp(d.baseY + delta, 0, closedY))
  }
  function onUp() {
    const d = drag.current
    if (!d) return
    const finalY = dragY ?? y
    drag.current = null
    setDragY(null)
    if (!d.moved) setOpen(o => !o)          // tap toggles
    else setOpen(finalY < closedY / 2)       // released past halfway → open
  }

  return (
    <>
      {/* Dim backdrop — fades in as the sheet opens */}
      <div
        className="lg:hidden fixed inset-0 z-40 bg-black"
        style={{ opacity: progress * 0.45, pointerEvents: open ? 'auto' : 'none', transition: dragY === null ? 'opacity 0.32s ease' : 'none' }}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Draggable liquid-glass sheet */}
      <div className="lg:hidden fixed left-0 right-0 bottom-0 z-50 pointer-events-none">
        <div
          ref={sheetRef}
          className="pointer-events-auto"
          style={{ transform: `translateY(${y}px)`, transition: dragY === null && measured ? 'transform 0.34s cubic-bezier(0.16,1,0.3,1)' : 'none' }}
        >
          <LiquidGlass
            className="rounded-t-3xl text-black dark:text-white"
            blur={12}
            refraction={12}
            bezel={0.25}
            saturation={1.5}
            style={{ ...GLASS_STYLE, ...SAFE_BOTTOM }}
          >
            {/* Grabber — the only bit visible when closed; drag it up/down */}
            <div
              className="touch-none cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 pt-3 pb-2.5"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <span className="w-10 h-1.5 rounded-full bg-black/25 dark:bg-white/35" />
              <span className="flex items-center gap-1.5 text-xs font-semibold text-black/55 dark:text-white/60">
                Menu
                {isAdmin && pendingPosts.length > 0 && (
                  <span className="ml-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-amber-400 text-[#064e5a] text-[10px] flex items-center justify-center font-bold">
                    {pendingPosts.length > 9 ? '9+' : pendingPosts.length}
                  </span>
                )}
              </span>
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-5 pt-1">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-colors
                    ${activeView === item.id
                      ? 'bg-black/[0.12] dark:bg-white/[0.16] text-black dark:text-white ring-1 ring-white/20'
                      : 'bg-black/[0.04] dark:bg-white/[0.07] text-black/70 dark:text-white/80 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] active:scale-95'}`}
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
                      ? 'bg-black/[0.12] dark:bg-white/[0.16] text-black dark:text-white ring-1 ring-white/20'
                      : 'bg-black/[0.04] dark:bg-white/[0.07] text-black/70 dark:text-white/80 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] active:scale-95'}`}
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
                onClick={() => { setContactOpen(true); setOpen(false) }}
                className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-black/[0.04] dark:bg-white/[0.07] text-black/70 dark:text-white/80 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] active:scale-95 transition-colors"
              >
                <MessageCircle className="h-6 w-6" />
                <span className="text-[11px] font-medium leading-tight text-center">Contact</span>
              </button>
            </div>
          </LiquidGlass>
        </div>
      </div>

      <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
