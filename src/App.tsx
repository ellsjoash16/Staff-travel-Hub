import { useState } from 'react'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AppProvider, useApp } from '@/context/AppContext'
import { Header } from '@/components/Header'
import { HomeView } from '@/components/HomeView'
import { FeedView } from '@/components/FeedView'
import { MapView } from '@/components/MapView'
import { CoursesView } from '@/components/CoursesView'
import { YearsView } from '@/components/YearsView'
import { SubmitView } from '@/components/SubmitView'
import { PostDetailDialog } from '@/components/PostDetailDialog'
import type { Post } from '@/lib/types'

function AppShell() {
  const { state } = useApp()
  const [mapPost, setMapPost] = useState<Post | null>(null)

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6">
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
