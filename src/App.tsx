import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Toaster, toast } from 'sonner'
import { CircleNotch } from '@phosphor-icons/react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { saveAccountRecord, insertRegistration } from '@/lib/db'
import { AppProvider, useApp, SUPERADMIN_UIDS } from '@/context/AppContext'
import confetti from 'canvas-confetti'
import type { Registration } from '@/lib/types'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { MobileTabBar } from '@/components/MobileTabBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoginScreen } from '@/components/LoginScreen'
import { Walkthrough } from '@/components/Walkthrough'
import { ForcePasswordChange } from '@/components/ForcePasswordChange'
import { ResetPasswordScreen } from '@/components/ResetPasswordScreen'
import type { Post } from '@/lib/types'

const LOADING_BG = '/hero-airport.jpg'

const QUOTES = [
  'The world is a book, and those who do not travel read only one page.',
  'Not all those who wander are lost.',
  'Travel is the only thing you buy that makes you richer.',
  'Life is short and the world is wide.',
  'Adventure is worthwhile in itself.',
]

function SplashScreen() {
  const quote = QUOTES[Math.floor(Date.now() / 5000) % QUOTES.length]
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: `url(${LOADING_BG})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(12px) brightness(0.35) saturate(1.1)',
        transform: 'scale(1.1)',
      }} />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
        <img src="/daf-logo.png" alt="DAF logo" className="h-20 w-20 object-contain" style={{ transform: 'translateX(8px)' }} />
        <div>
          <h1 className="font-gilbert text-4xl text-white drop-shadow mb-1">DAFAGRAM</h1>
          <p className="text-white/50 text-sm tracking-widest uppercase">Staff Travel Hub</p>
        </div>
        <CircleNotch className="h-5 w-5 animate-spin text-primary/70 mt-2" />
        <p className="text-white/40 text-sm italic max-w-xs leading-relaxed mt-2">"{quote}"</p>
      </div>
    </div>
  )
}

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
const PublicAdventures = lazy(() => import('@/components/PublicAdventures').then(m => ({ default: m.PublicAdventures })))

function AppShell() {
  const { state, dispatch, loadMyRegistrations } = useApp()
  const [mapPost, setMapPost] = useState<Post | null>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const pendingTripId = useRef<string | null>(null)
  const pendingError  = useRef(false)

  // First-run walkthrough — shows on login until the user ticks "Don't show again"
  const walkthroughKey = `dafagram-tour-${auth.currentUser?.uid ?? 'anon'}`
  const [showWalkthrough, setShowWalkthrough] = useState(
    () => localStorage.getItem(walkthroughKey) !== 'dismissed',
  )
  function dismissWalkthrough(dontShowAgain: boolean) {
    if (dontShowAgain) localStorage.setItem(walkthroughKey, 'dismissed')
    setShowWalkthrough(false)
  }

  // Capture ?trip=ID from Lotus return URL immediately on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tripId = params.get('trip')
    if (!tripId) return
    window.history.replaceState({}, '', window.location.pathname)
    if (params.get('error')) {
      pendingError.current = true
      pendingTripId.current = tripId
    } else {
      pendingTripId.current = tripId
    }
  }, [])

  // Once app data has loaded, process the pending Lotus return
  useEffect(() => {
    if (state.loading || !pendingTripId.current) return
    const tripId = pendingTripId.current
    const isError = pendingError.current
    pendingTripId.current = null
    pendingError.current  = false

    if (isError) {
      dispatch({ type: 'SET_VIEW', view: 'upcoming' })
      toast.error('Your registration could not be completed — please try again or contact an admin.')
      return
    }

    const trip = state.trips.find(t => t.id === tripId)
    if (!trip) {
      toast.error('Trip not found.')
      return
    }

    const user = auth.currentUser
    if (!user) return

    const reg: Registration = {
      id: `lotus_${user.uid}_${tripId}`,
      tripId: trip.id,
      tripName: trip.name,
      uid: user.uid,
      email: user.email ?? '',
      firstName: (user.displayName ?? '').split(' ')[0] || '',
      lastName: (user.displayName ?? '').split(' ').slice(1).join(' ') || '',
      passportFirstName: '',
      passportLastName: '',
      medicalInfo: null,
      dataConsent: true,
      status: 'requested' as const,
      jobRole: null,
      salesDivision: null,
      nominatedPeople: [],
    }

    insertRegistration(reg)
      .then(() => loadMyRegistrations())
      .then(() => {
        dispatch({ type: 'SET_VIEW', view: 'interest' })
        confetti({ particleCount: 160, spread: 80, origin: { y: 0.5 }, colors: ['#05979a','#07c5b0','#064e5a','#f59e0b','#ffffff','#34d399'] })
        toast.success('Registration complete! Good luck! 🎉', { duration: 6000 })
      })
      .catch(() => {
        toast.error('Registration could not be saved — please contact an admin.')
      })
  }, [state.loading])

  if (state.loading) return <SplashScreen />

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <Header />
      <Sidebar onExpandedChange={setSidebarExpanded} />

      <main
        className={`flex-1 min-h-0 overflow-auto transition-all duration-200 ${
          sidebarExpanded ? 'md:ml-60 xl:ml-72' : 'md:ml-16 xl:ml-20'
        } ${
          state.activeView === 'home'   ? 'px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 lg:py-4 2xl:py-5 pb-24 md:pb-5'
          : state.activeView === 'map' || state.activeView === 'upcoming' ? 'p-0 overflow-hidden'
          : state.activeView === 'submit' || state.activeView === 'interest' || state.activeView === 'years' ? 'pb-0'
          : 'py-5 lg:py-6 xl:py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pb-24 md:pb-8'
        }`}
      >
        <ErrorBoundary key={state.activeView}>
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground"><CircleNotch className="h-6 w-6 animate-spin" /></div>}>
          <div className={`view-enter ${['home', 'map', 'submit', 'years', 'upcoming', 'interest'].includes(state.activeView) ? 'h-full min-h-0' : ''}`}>
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
        </ErrorBoundary>
      </main>

      <MobileTabBar />

      {showWalkthrough && (
        <Walkthrough
          onNavigate={(view) => dispatch({ type: 'SET_VIEW', view })}
          onDismiss={dismissWalkthrough}
        />
      )}

      {/* Post opened from the search bar (works from any view) */}
      <Suspense fallback={null}>
        {state.openPost && (
          <PostDetailDialog
            post={state.openPost}
            onOpenChange={(open) => { if (!open) dispatch({ type: 'SET_OPEN_POST', post: null }) }}
          />
        )}
      </Suspense>

      {state.currentUserProfile?.mustChangePassword && <ForcePasswordChange />}

      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [signedIn, setSignedIn]   = useState(false)
  const [authUid, setAuthUid]     = useState<string | null>(null)

  // Password-reset links (from the email) land here as ?mode=resetPassword&oobCode=…
  // The in-app reset page is only reachable this way — no valid code, no access.
  const resetParams = new URLSearchParams(window.location.search)
  const resetCode = resetParams.get('mode') === 'resetPassword' ? resetParams.get('oobCode') : null
  // Standalone, login-free DAF Adventures page — see PublicAdventures.
  const publicView = resetParams.get('view')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (e: MediaQueryList | MediaQueryListEvent) =>
      document.documentElement.classList.toggle('dark', e.matches)
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setSignedIn(!!user)
      setAuthReady(true)
      setAuthUid(user?.uid ?? null)
      if (user) saveAccountRecord(user.uid, user.email, user.displayName).catch(console.error)
    })
  }, [])

  if (resetCode) {
    return (
      <>
        <ResetPasswordScreen oobCode={resetCode} />
        <Toaster position="bottom-right" richColors />
      </>
    )
  }

  if (publicView === 'adventures') {
    return (
      <>
        <Suspense fallback={<SplashScreen />}>
          <PublicAdventures />
        </Suspense>
        <Toaster position="bottom-right" richColors />
      </>
    )
  }

  if (!authReady) return <SplashScreen />

  if (!signedIn) {
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
