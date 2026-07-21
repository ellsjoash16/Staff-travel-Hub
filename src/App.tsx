import { useState, useEffect, lazy, Suspense } from 'react'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { saveAccountRecord } from '@/lib/db'
import { AppProvider, useApp, SUPERADMIN_UIDS } from '@/context/AppContext'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { MobileTabBar } from '@/components/MobileTabBar'
import { LoginScreen } from '@/components/LoginScreen'
import type { Post } from '@/lib/types'

const HomeView      = lazy(() => import('@/components/HomeView').then(m => ({ default: m.HomeView })))
const FeedView      = lazy(() => import('@/components/FeedView').then(m => ({ default: m.FeedView })))
const UpcomingTripsView = lazy(() => import('@/components/UpcomingTripsView').then(m => ({ default: m.UpcomingTripsView })))
const YearsView     = lazy(() => import('@/components/YearsView').then(m => ({ default: m.YearsView })))
const SubmitView    = lazy(() => import('@/components/SubmitView').then(m => ({ default: m.SubmitView })))
const PendingView   = lazy(() => import('@/components/PendingView').then(m => ({ default: m.PendingView })))
const SettingsView  = lazy(() => import('@/components/SettingsView').then(m => ({ default: m.SettingsView })))
const MyRegistrationsView = lazy(() => import('@/components/MyRegistrationsView').then(m => ({ default: m.MyRegistrationsView })))
const MapView       = lazy(() => import('@/components/MapView').then(m => ({ default: m.MapView })))
const PostDetailDialog = lazy(() => import('@/components/PostDetailDialog').then(m => ({ default: m.PostDetailDialog })))

function removeSplash() {
  const el = document.getElementById('pre-splash')
  if (el) el.remove()
}

function AppShell() {
  const { state } = useApp()
  const [mapPost, setMapPost] = useState<Post | null>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  useEffect(() => {
    if (!state.loading) removeSplash()
  }, [state.loading])

  if (state.loading) return null

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <Header />
      <Sidebar onExpandedChange={setSidebarExpanded} />
      <MobileTabBar />

      <main
        className={`flex-1 min-h-0 overflow-auto transition-all duration-200 ${
          sidebarExpanded ? 'lg:ml-60 xl:ml-72' : 'lg:ml-16 xl:ml-20'
        } ${
          state.activeView === 'home'   ? 'px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 lg:py-4 2xl:py-5 pb-16 lg:pb-5'
          : state.activeView === 'map'  ? 'p-0 overflow-hidden'
          : state.activeView === 'submit' || state.activeView === 'years' || state.activeView === 'upcoming' || state.activeView === 'interest' ? 'pb-14 lg:pb-0'
          : 'py-5 lg:py-6 xl:py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pb-16 lg:pb-8'
        }`}
      >
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <div key={state.activeView} className={`view-enter ${['home', 'map', 'submit', 'years', 'upcoming', 'interest'].includes(state.activeView) ? 'h-full min-h-0' : ''}`}>
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
            {state.activeView === 'upcoming' && <UpcomingTripsView />}
            {state.activeView === 'interest' && <MyRegistrationsView />}
            {state.activeView === 'years' && <YearsView />}
            {state.activeView === 'submit' && <SubmitView />}
            {state.activeView === 'settings' && (state.isAdmin || SUPERADMIN_UIDS.includes(auth.currentUser?.uid ?? '')) && <SettingsView />}
            {state.activeView === 'pending' && (state.isAdmin || SUPERADMIN_UIDS.includes(auth.currentUser?.uid ?? '')) && <PendingView />}
          </div>
        </Suspense>
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [signedIn, setSignedIn]   = useState(false)
  const [authUid, setAuthUid]     = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setSignedIn(!!user)
      setAuthReady(true)
      setAuthUid(user?.uid ?? null)
      if (user) saveAccountRecord(user.uid, user.email, user.displayName).catch(console.error)
    })
  }, [])

  if (!authReady) return null

  if (!signedIn) {
    removeSplash()
    return (
      <>
        <LoginScreen />
        <Toaster position="bottom-right" richColors />
      </>
    )
  }

  return (
    <AppProvider authUid={authUid}>
      <AppShell />
    </AppProvider>
  )
}
