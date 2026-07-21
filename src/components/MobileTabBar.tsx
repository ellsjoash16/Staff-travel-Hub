import { Clock, Settings, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { NAV } from '@/components/Sidebar'
import { ContactAdminDialog } from '@/components/ContactAdminDialog'
import type { View } from '@/lib/types'

const SHORT: Partial<Record<View, string>> = {
  upcoming: 'Trips',
  interest: 'Interest',
  years:    'By Year',
  submit:   'Submit',
  pending:  'Pending',
  settings: 'Settings',
}

type TabItem =
  | { kind: 'view'; id: View; label: string; Icon: React.ElementType }
  | { kind: 'action'; id: string; label: string; Icon: React.ElementType; onTap: () => void }

export function MobileTabBar() {
  const { state, dispatch } = useApp()
  const { activeView, isAdmin, pendingPosts } = state
  const [contactOpen, setContactOpen] = useState(false)

  function go(view: View) {
    dispatch({ type: 'SET_VIEW', view })
  }

  const items: TabItem[] = [
    ...NAV.map(n => ({ kind: 'view' as const, ...n })),
    ...(isAdmin ? [
      { kind: 'view' as const, id: 'pending' as View,  label: 'Pending',  Icon: Clock },
      { kind: 'view' as const, id: 'settings' as View, label: 'Settings', Icon: Settings },
    ] : []),
    { kind: 'action', id: 'contact', label: 'Contact', Icon: MessageCircle, onTap: () => setContactOpen(true) },
  ]

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto"
        style={{ background: '#064e5a' }}
      >
        {items.map(item => {
          const active = item.kind === 'view' && activeView === item.id
          const shortLabel = item.kind === 'view' ? (SHORT[item.id] ?? item.label) : item.label
          const handleClick = item.kind === 'view' ? () => go(item.id) : item.onTap

          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={`
                flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 relative transition-colors duration-150
                ${active ? 'text-white' : 'text-white/45 hover:text-white/80'}
              `}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-white/70" />
              )}
              <div className="relative">
                <item.Icon className="h-[1.1rem] w-[1.1rem]" />
                {item.kind === 'view' && item.id === 'pending' && pendingPosts.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-amber-400 text-[#064e5a] text-[7px] flex items-center justify-center font-bold">
                    {pendingPosts.length > 9 ? '9+' : pendingPosts.length}
                  </span>
                )}
              </div>
              <span className={`text-[9px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                {shortLabel}
              </span>
            </button>
          )
        })}
      </nav>

      <ContactAdminDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
