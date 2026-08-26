import { House as Home, Airplane as Plane, PaperPlaneTilt as Send, Globe as Globe2, CalendarDots as CalendarDays } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import type { View } from '@/lib/types'

// Fixed bottom tab bar. On mobile, Home and Feed are the same thing (the feed).
const TABS: { id: View; label: string; activeOn: View[]; Icon: React.ElementType }[] = [
  { id: 'feed',     label: 'Home',     activeOn: ['feed', 'home'], Icon: Home },
  { id: 'upcoming', label: 'Upcoming', activeOn: ['upcoming'],     Icon: Plane },
  { id: 'submit',   label: 'Share',    activeOn: ['submit'],       Icon: Send },
  { id: 'map',      label: 'Map',      activeOn: ['map'],          Icon: Globe2 },
  { id: 'years',    label: 'DAF',      activeOn: ['years'],        Icon: CalendarDays },
]

const SAFE_BOTTOM: React.CSSProperties = { paddingBottom: 'env(safe-area-inset-bottom)' }

const GLASS_STYLE: React.CSSProperties = {
  '--liquid-glass-rim-width': '1px',
  '--liquid-glass-rim-light': 'rgba(255,255,255,0.45)',
  '--liquid-glass-rim-dark': 'rgba(0,0,0,0.08)',
  '--liquid-glass-rim-fade': '16%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14)',
} as React.CSSProperties

export function MobileTabBar() {
  const { state, dispatch } = useApp()
  const { activeView } = state

  return (
    <div className="md:hidden fixed left-0 right-0 bottom-0 z-50">
      <LiquidGlass
        className="rounded-t-3xl text-black dark:text-white"
        blur={12}
        refraction={12}
        bezel={0.25}
        saturation={1.5}
        style={{ ...GLASS_STYLE, ...SAFE_BOTTOM }}
      >
        <nav className="flex items-stretch justify-around px-1 pt-1.5 pb-1.5">
          {TABS.map(tab => {
            const active = tab.activeOn.includes(activeView)
            return (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_VIEW', view: tab.id })}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-colors ${
                  active ? 'text-primary' : 'text-foreground/60 hover:text-foreground active:scale-95'
                }`}
              >
                <tab.Icon className="h-6 w-6" weight={active ? 'fill' : 'regular'} />
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </LiquidGlass>
    </div>
  )
}
