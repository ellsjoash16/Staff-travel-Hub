import { useState } from 'react'
import { Globe } from 'lucide-react'
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

export function FeedView() {
  const { state } = useApp()
  const { posts, locations, settings } = state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [activeRegion, setActiveRegion] = useState<string | null>(null)

  // Build a set of regions that have at least one post
  const regionSet = new Set<string>()
  for (const post of posts) {
    const loc = post.locationId ? locations.find((l) => l.id === post.locationId) : null
    const region = getRegion(loc?.country)
    if (region) regionSet.add(region)
  }
  const availableRegions = REGIONS.filter((r) => regionSet.has(r.label)).map((r) => r.label)

  const filtered = activeRegion
    ? posts.filter((p) => {
        const loc = p.locationId ? locations.find((l) => l.id === p.locationId) : null
        return getRegion(loc?.country) === activeRegion
      })
    : [...posts]

  const sorted = filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (b.date || '') < (a.date || '') ? -1 : 1
  })

  return (
    <div className="flex flex-col">
      {/* Section header */}
      <div className="w-full mb-5">
        <h2 className="font-gilbert text-3xl text-foreground leading-tight">{settings.heading}</h2>
        {settings.welcome && (
          <p className="text-sm text-muted-foreground mt-1.5">{settings.welcome}</p>
        )}
      </div>

      {/* Region tabs */}
      <Tabs value={activeRegion ?? '__latest__'} onValueChange={(v) => setActiveRegion(v === '__latest__' ? null : v)} className="mb-5">
        <TabsList className="overflow-x-auto scrollbar-none">
          <TabsTrigger value="__latest__">Latest</TabsTrigger>
          {availableRegions.map((region) => (
            <TabsTrigger key={region} value={region}>{region}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Feed */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Globe className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="font-gilbert text-xl mb-1 text-foreground">No trips posted yet</h3>
          <p className="text-sm text-center max-w-xs">Admins can upload photos and reviews from staff trips in the admin panel</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 w-full">
          {sorted.map((post, i) => (
            <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} tiltDir={i % 2 === 0 ? 1 : -1} />
          ))}
        </div>
      )}

      <PostDetailDialog
        post={selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      />
    </div>
  )
}
