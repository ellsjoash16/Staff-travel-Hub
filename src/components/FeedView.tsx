import { useState } from 'react'
import { Globe, ArrowsClockwise, PlayCircle } from '@phosphor-icons/react'
import { useApp } from '@/context/AppContext'
import { PostCard } from './PostCard'
import { PostDetailDialog } from './PostDetailDialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Post } from '@/lib/types'

const REGIONS: { label: string; countries: string[] }[] = [
  {
    label: 'Middle East',
    countries: [
      'UAE', 'United Arab Emirates', 'Saudi Arabia', 'Bahrain', 'Kuwait', 'Qatar', 'Oman',
      'Jordan', 'Lebanon', 'Israel', 'Palestine', 'Iraq', 'Iran', 'Yemen', 'Egypt',
    ],
  },
  {
    label: 'Caribbean',
    countries: [
      'Jamaica', 'Barbados', 'Trinidad and Tobago', 'Trinidad & Tobago', 'Bahamas', 'Cuba',
      'Dominican Republic', 'Haiti', 'Antigua and Barbuda', 'Saint Lucia', 'Grenada',
      'Saint Vincent and the Grenadines', 'Aruba', 'Cayman Islands', 'Turks and Caicos',
      'Bermuda', 'Saint Kitts and Nevis', 'Martinique', 'Guadeloupe', 'Puerto Rico',
      'US Virgin Islands', 'British Virgin Islands', 'Anguilla', 'Montserrat', 'Dominica',
      'Sint Maarten', 'Curaçao', 'Bonaire', 'St Lucia', 'St Kitts', 'St Vincent',
    ],
  },
  {
    label: 'Asia',
    countries: [
      'Japan', 'China', 'Thailand', 'Singapore', 'Vietnam', 'Indonesia', 'Malaysia',
      'Philippines', 'South Korea', 'Hong Kong', 'Taiwan', 'Cambodia', 'Myanmar',
      'Laos', 'Brunei', 'Timor-Leste', 'Maldives', 'Sri Lanka', 'Bangladesh',
      'Nepal', 'Bhutan', 'Mongolia', 'India', 'Pakistan',
    ],
  },
  {
    label: 'Europe',
    countries: [
      'France', 'Spain', 'Italy', 'Germany', 'UK', 'United Kingdom', 'England', 'Scotland',
      'Wales', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Greece',
      'Turkey', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland', 'Ireland', 'Poland',
      'Czech Republic', 'Hungary', 'Romania', 'Croatia', 'Slovenia', 'Malta', 'Cyprus',
      'Luxembourg', 'Monaco', 'Andorra', 'San Marino', 'Slovakia', 'Serbia', 'Montenegro',
      'Albania', 'North Macedonia', 'Bulgaria', 'Lithuania', 'Latvia', 'Estonia',
    ],
  },
  {
    label: 'Africa',
    countries: [
      'South Africa', 'Kenya', 'Morocco', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia',
      'Ghana', 'Nigeria', 'Senegal', 'Ivory Coast', "Côte d'Ivoire", 'Mauritius',
      'Seychelles', 'Mozambique', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia',
      'Malawi', 'Madagascar', 'Reunion', 'Tunisia', 'Algeria', 'Libya',
    ],
  },
  {
    label: 'Americas',
    countries: [
      'USA', 'United States', 'United States of America', 'Canada', 'Mexico', 'Brazil',
      'Argentina', 'Chile', 'Peru', 'Colombia', 'Ecuador', 'Bolivia', 'Paraguay',
      'Uruguay', 'Venezuela', 'Panama', 'Costa Rica', 'Guatemala', 'Honduras',
      'El Salvador', 'Nicaragua', 'Belize',
    ],
  },
  {
    label: 'Pacific',
    countries: [
      'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Vanuatu', 'Samoa',
      'Tonga', 'French Polynesia', 'Tahiti', 'New Caledonia', 'Palau',
      'Micronesia', 'Marshall Islands', 'Cook Islands',
    ],
  },
]

function getRegion(country: string | undefined): string | null {
  if (!country) return null
  const c = country.trim().toLowerCase()
  for (const region of REGIONS) {
    if (region.countries.some((rc) => rc.toLowerCase() === c)) return region.label
  }
  return null
}

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
  const nativePosts = posts.filter((p) => !p.riseUrl)
  const risePosts = posts.filter((p) => !!p.riseUrl)
  const isRiseArchive = activeRegion === '__rise__'

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

  // Region tabs reflect every post that has a location — native AND Rise 360
  // courses — so a continent shows up even if it only has Rise reviews.
  const regionSet = new Set<string>()
  for (const post of posts) postRegions(post).forEach((r) => regionSet.add(r))
  const availableRegions = REGIONS.filter((r) => regionSet.has(r.label)).map((r) => r.label)

  // Continent tabs show native + Rise courses for that region; "Latest" stays
  // native-only; the Rise archive tab shows every Rise course.
  const base = isRiseArchive ? risePosts : (activeRegion ? posts : nativePosts)
  const filtered = (activeRegion && !isRiseArchive)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-5 2xl:gap-6 w-full">
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
