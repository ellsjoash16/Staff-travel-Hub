import { useState } from 'react'
import { Globe, ArrowsClockwise, PlayCircle } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'
import { PostCard } from './PostCard'
import { PostDetailDialog } from './PostDetailDialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Post } from '@/lib/types'
import { REGIONS, getRegion } from '@/lib/regions'

const PAGE_SIZE = 24

export function FeedView() {
  const { state, loadPosts } = useApp()
  const { posts, locations, settings } = state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [activeRegion, setActiveRegion] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await loadPosts().catch(() => {})
    setRefreshing(false)
  }

  // Legacy trip reviews live on Articulate Rise 360 (have a riseUrl); new
  // reviews are written natively in DAFAGRAM. Keep the two separate.
  const airlinePosts = posts.filter((p) => p.isAirline)
  const nativePosts = posts.filter((p) => !p.riseUrl && !p.isAirline)
  const risePosts = posts.filter((p) => !!p.riseUrl && !p.isAirline)
  const isRiseArchive = activeRegion === '__rise__'
  const isAirlineTab = activeRegion === '__airlines__'

  // A post can belong to several locations → several regions.
  function postRegions(p: Post): string[] {
    const ids = p.locationIds?.length ? p.locationIds : (p.locationId ? [p.locationId] : [])
    const regions = new Set<string>()
    for (const id of ids) {
      const region = getRegion(locations.find((l) => l.id === id)?.country)
      if (region) regions.add(region)
    }
    return [...regions]
  }

  // Region tabs reflect native + Rise 360 courses (not airline posts — those
  // live in their own Airlines section), so a continent shows up even if it
  // only has Rise reviews.
  const regionSet = new Set<string>()
  for (const post of [...nativePosts, ...risePosts]) postRegions(post).forEach((r) => regionSet.add(r))
  const availableRegions = REGIONS.filter((r) => regionSet.has(r.label)).map((r) => r.label)

  // Airlines tab → airline posts; Rise archive → Rise courses; continent tabs →
  // native + Rise for that region; "Latest" → native only.
  const base = isAirlineTab ? airlinePosts
    : isRiseArchive ? risePosts
    : (activeRegion ? [...nativePosts, ...risePosts] : nativePosts)
  const filtered = (activeRegion && !isRiseArchive && !isAirlineTab)
    ? base.filter((p) => postRegions(p).includes(activeRegion))
    : [...base]

  const sorted = filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (b.date || '') < (a.date || '') ? -1 : 1
  })

  return (
    <div className="flex flex-col">
      {/* Section header */}
      <div className="w-full mb-5">
        <h2 className="font-gilbert text-3xl xl:text-4xl text-foreground leading-tight">{settings.heading}</h2>
        {settings.welcome && (
          <p className="text-sm text-muted-foreground mt-1.5">{settings.welcome}</p>
        )}
      </div>

      {/* Region tabs (+ Rise 360 archive) */}
      <Tabs value={activeRegion ?? '__latest__'} onValueChange={(v) => { setActiveRegion(v === '__latest__' ? null : v); setVisible(PAGE_SIZE) }} className="mb-5">
        <TabsList className="overflow-x-auto scrollbar-none">
          <TabsTrigger value="__latest__">Latest</TabsTrigger>
          {availableRegions.map((region) => (
            <TabsTrigger key={region} value={region}>{region}</TabsTrigger>
          ))}
          {airlinePosts.length > 0 && <TabsTrigger value="__airlines__">Airlines</TabsTrigger>}
          {risePosts.length > 0 && <TabsTrigger value="__rise__">Rise 360 Archive</TabsTrigger>}
        </TabsList>
      </Tabs>

      {isRiseArchive && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <PlayCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Older trip reviews hosted on Articulate Rise 360, from before reviews moved into DAFAGRAM. Open one to launch the original.
          </p>
        </div>
      )}

      {/* Feed */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Globe className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="font-gilbert text-xl mb-1 text-foreground">No trips posted yet</h3>
          <p className="text-sm text-center max-w-xs mb-4">Admins can upload photos and reviews from staff trips in the admin panel</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors disabled:opacity-50"
          >
            <ArrowsClockwise className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Loading…' : 'Retry'}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 sm:auto-rows-fr gap-4 lg:gap-5 2xl:gap-6 w-full">
            {sorted.slice(0, visible).map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
                tiltDir={i % 2 === 0 ? 1 : -1}
                locationNames={(post.locationIds?.length ? post.locationIds : (post.locationId ? [post.locationId] : []))
                  .map(id => locations.find(l => l.id === id)?.name).filter(Boolean) as string[]}
              />
            ))}
          </div>
          {visible < sorted.length && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => setVisible(v => v + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}

      <PostDetailDialog
        post={selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      />
    </div>
  )
}
