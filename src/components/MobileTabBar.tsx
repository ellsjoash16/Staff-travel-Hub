import { Clock, Settings, MessageCircle, MoreHorizontal, Globe2, Plane, Send, Camera, CalendarDays, ClipboardCheck, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import { GlassButtonGroup } from '@/components/ui/glass-button-group'
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

const TAB_GLASS_STYLE: React.CSSProperties = {
  '--liquid-glass-rim-width': '1px',
  '--liquid-glass-rim-light': 'rgba(255,255,255,0.4)',
  '--liquid-glass-rim-dark': 'rgba(0,0,0,0.08)',
  '--liquid-glass-rim-fade': '12%',
  boxShadow: '0 -1px 0 rgba(255,255,255,0.18), 0 -20px 60px rgba(0,0,0,0.18)',
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

  const moreActive = ![...PRIMARY].some(p => p.id === activeView)

  return (
    <>
      {/* ── More sheet ── */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          onClick={() => setMoreOpen(false)}
        >
          <LiquidGlass
            className="absolute bottom-[52px] left-0 right-0 rounded-t-2xl rounded-b-none bg-white/[0.06]"
            blur={12}
            refraction={12}
            bezel={0.15}
            saturation={1.5}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-black/60 dark:text-white/60 text-xs font-semibold uppercase tracking-widest">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-3 pb-4">
              {SECONDARY.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all
                    ${activeView === item.id
                      ? 'bg-black/[0.08] dark:bg-white/[0.12] text-black dark:text-white'
                      : 'text-black/60 dark:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white'}`}
                >
                  <item.Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
              {isAdmin && ADMIN_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all relative
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
                  <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => { setContactOpen(true); setMoreOpen(false) }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-black/60 dark:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight text-center">Contact</span>
              </button>
            </div>
          </LiquidGlass>
        </div>
      )}

      {/* ── Tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col">
        <GlassButtonGroup
          className="w-full rounded-none"
          glassVariant="liquid-refract"
          blur={4}
          bezel={0.65}
          saturation={1.4}
          glassStyle={TAB_GLASS_STYLE}
        >
          {PRIMARY.map(item => {
            const active = activeView === item.id
            return (
              <button
                key={item.id}
                data-slot="button"
                onClick={() => { go(item.id); setMoreOpen(false) }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 relative transition-all duration-200
                  ${active ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
              >
                {active && (
                  <span className="absolute inset-x-2 inset-y-1 rounded-2xl bg-black/[0.08] dark:bg-white/[0.14]" />
                )}
                <item.Icon className="h-[1.1rem] w-[1.1rem] relative z-10" />
                <span className={`text-[9px] leading-none relative z-10 ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            )
          })}

          <button
            data-slot="button"
            onClick={() => setMoreOpen(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 relative transition-all duration-200
              ${moreActive && !moreOpen ? 'text-black dark:text-white' : moreOpen ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
          >
            {(moreActive && !moreOpen) && (
              <span className="absolute inset-x-2 inset-y-1 rounded-2xl bg-black/[0.08] dark:bg-white/[0.14]" />
            )}
            <MoreHorizontal className="h-[1.1rem] w-[1.1rem] relative z-10" />
            <span className="text-[9px] leading-none font-medium relative z-10">More</span>
          </button>
        </GlassButtonGroup>
      </nav>

      <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
