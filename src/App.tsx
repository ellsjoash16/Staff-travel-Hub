import { useState } from 'react'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AppProvider, useApp } from '@/context/AppContext'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { HomeView } from '@/components/HomeView'
import { FeedView } from '@/components/FeedView'
import { MapView } from '@/components/MapView'
import { CoursesView } from '@/components/CoursesView'
import { YearsView } from '@/components/YearsView'
import { SubmitView } from '@/components/SubmitView'
import { PendingView } from '@/components/PendingView'
import { SettingsView } from '@/components/SettingsView'
import { PostDetailDialog } from '@/components/PostDetailDialog'
import type { Post } from '@/lib/types'

function AppShell() {
  const { state } = useApp()
  const [mapPost, setMapPost] = useState<Post | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)       // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // desktop collapsed

  const showSidebar = state.activeView !== 'home'

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <Header
        showMenuButton={showSidebar}
        onMenuClick={() => setSidebarOpen(o => !o)}
      />

      {showSidebar && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      )}

      <main
        className={`flex-1 min-h-0 overflow-auto transition-all duration-300 ${
          state.activeView === 'home'
            ? 'px-3 sm:px-6 py-3 w-full max-w-[1440px] mx-auto'
            : `py-6 px-4 sm:px-6 ${showSidebar ? (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60') : 'max-w-[1440px] mx-auto'}`
        }`}
      >
        <div key={state.activeView} className={`view-enter ${state.activeView === 'home' ? 'h-full' : ''}`}>
          {state.activeView === 'home' && <HomeView />}
          {state.activeView === 'feed' && <FeedView />}
          {state.activeView === 'map' && (
            <>
              <MapView onSelectPost={setMapPost} />
              <PostDetailDialog
                post={mapPost}
                onOpenChange={(open) => !open && setMapPost(null)}
              />
            </>
          )}
          {state.activeView === 'courses' && <CoursesView />}
          {state.activeView === 'years' && <YearsView />}
          {state.activeView === 'submit' && <SubmitView />}
          {state.activeView === 'settings' && <SettingsView />}
          {state.activeView === 'pending' && state.isAdmin && <PendingView />}
        </div>
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
