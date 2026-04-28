import { useState, lazy, Suspense } from 'react'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AppProvider, useApp } from '@/context/AppContext'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import type { Post } from '@/lib/types'

const HomeView      = lazy(() => import('@/components/HomeView').then(m => ({ default: m.HomeView })))
const FeedView      = lazy(() => import('@/components/FeedView').then(m => ({ default: m.FeedView })))
const CoursesView   = lazy(() => import('@/components/CoursesView').then(m => ({ default: m.CoursesView })))
const YearsView     = lazy(() => import('@/components/YearsView').then(m => ({ default: m.YearsView })))
const SubmitView    = lazy(() => import('@/components/SubmitView').then(m => ({ default: m.SubmitView })))
const PendingView   = lazy(() => import('@/components/PendingView').then(m => ({ default: m.PendingView })))
const SettingsView  = lazy(() => import('@/components/SettingsView').then(m => ({ default: m.SettingsView })))
const MapView       = lazy(() => import('@/components/MapView').then(m => ({ default: m.MapView })))
const PostDetailDialog = lazy(() => import('@/components/PostDetailDialog').then(m => ({ default: m.PostDetailDialog })))

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
            ? 'px-3 sm:px-6 2xl:px-10 py-3 2xl:py-5 w-full max-w-[1440px] mx-auto'
            : `py-6 2xl:py-8 px-4 sm:px-6 2xl:px-10 ${showSidebar ? (sidebarCollapsed ? 'lg:ml-16 xl:ml-20' : 'lg:ml-60 xl:ml-72') : 'max-w-[1440px] mx-auto'}`
        }`}
      >
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
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
        </Suspense>
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
