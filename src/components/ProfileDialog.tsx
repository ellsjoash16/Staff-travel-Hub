import { useMemo, useState, useEffect } from 'react'
import { Briefcase, Buildings, MapPin, Camera, X, GlobeHemisphereWest, Star, PaintBrush, Check, MagnifyingGlass, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppSelect } from '@/components/ui/app-select'
import { Input } from '@/components/ui/input'
import { useApp } from '@/context/AppContext'
import { PostCard } from './PostCard'
import { ProfileGlobe } from './ProfileGlobe'
import { COUNTRIES } from '@/lib/countries'
import { initials, titleCase } from '@/lib/utils'

interface Props {
  profile: { uid: string | null; name: string } | null
  onOpenChange: (open: boolean) => void
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Curated profile backgrounds — gradients, mesh/aurora designs and CSS patterns.
// All are dark so the profile's text (shown in a forced-dark context when a
// wallpaper is active) stays readable. id is stored on the user profile;
// 'none' / unknown falls back to the normal theme surface. All pure CSS — no
// uploads or extra assets.
const WALLPAPERS: { id: string; label: string; css: string }[] = [
  { id: 'midnight', label: 'Midnight', css: 'linear-gradient(160deg,#0f172a,#1e293b)' },
  { id: 'ocean',    label: 'Ocean',    css: 'linear-gradient(160deg,#083344,#0e7490)' },
  { id: 'forest',   label: 'Forest',   css: 'linear-gradient(160deg,#052e16,#166534)' },
  { id: 'plum',     label: 'Plum',     css: 'linear-gradient(160deg,#2e1065,#6d28d9)' },
  { id: 'rose',     label: 'Rose',     css: 'linear-gradient(160deg,#4c0519,#be185d)' },
  // Mesh / aurora designs
  { id: 'aurora',   label: 'Aurora',   css: 'radial-gradient(at 15% 20%,#6d28d9 0,transparent 45%),radial-gradient(at 85% 15%,#0e7490 0,transparent 45%),radial-gradient(at 50% 95%,#be185d 0,transparent 45%),#0f172a' },
  { id: 'ember',    label: 'Ember',    css: 'radial-gradient(at 20% 20%,#b45309 0,transparent 45%),radial-gradient(at 80% 25%,#9a3412 0,transparent 45%),radial-gradient(at 50% 95%,#7c2d12 0,transparent 50%),#1a1207' },
  { id: 'nebula',   label: 'Nebula',   css: 'radial-gradient(at 25% 15%,#1d4ed8 0,transparent 45%),radial-gradient(at 80% 30%,#7e22ce 0,transparent 45%),radial-gradient(at 50% 90%,#0891b2 0,transparent 50%),#0b1026' },
  // Patterns
  { id: 'dots',     label: 'Dots',     css: 'radial-gradient(rgba(255,255,255,0.12) 1.4px,transparent 1.5px) 0 0/22px 22px,linear-gradient(160deg,#111827,#1f2937)' },
  { id: 'grid',     label: 'Grid',     css: 'linear-gradient(rgba(255,255,255,0.09) 1px,transparent 1px) 0 0/26px 26px,linear-gradient(90deg,rgba(255,255,255,0.09) 1px,transparent 1px) 0 0/26px 26px,#0b1220' },
  { id: 'stripes',  label: 'Stripes',  css: 'repeating-linear-gradient(45deg,#172033 0 14px,#1e293b 14px 28px)' },
  { id: 'carbon',   label: 'Carbon',   css: 'repeating-linear-gradient(135deg,rgba(255,255,255,0.05) 0 2px,transparent 2px 9px),#0f172a' },
  { id: 'charcoal', label: 'Charcoal', css: '#111827' },
]
// A stored wallpaper is either a preset id or a photo URL (from the same
// Unsplash endpoint used for location photos). Photos get a baked-in dark scrim
// so the (forced-dark) profile text stays readable over any image.
const wallpaperCss = (val: string | null): string | null => {
  if (!val) return null
  const preset = WALLPAPERS.find(w => w.id === val)
  if (preset) return preset.css
  if (/^https?:\/\//i.test(val)) return `linear-gradient(rgba(15,23,42,0.55),rgba(15,23,42,0.7)),url("${val}") center/cover no-repeat`
  return null
}

// Reusable self-service picker for a background or banner. Photos come from the
// same Unsplash endpoint as location photos; designs are the CSS presets above.
// onPick receives the chosen value (preset id or photo URL), or null to clear.
function AppearancePicker({ title, value, onPick, searchPhotos }: {
  title: string
  value: string | null
  onPick: (v: string | null) => void
  searchPhotos: (q: string) => Promise<{ url: string; thumb: string; credit: string | null }[]>
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ url: string; thumb: string; credit: string | null }[]>([])
  const [searching, setSearching] = useState(false)

  async function run() {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    try {
      const r = await searchPhotos(q)
      setResults(r)
      if (r.length === 0) toast.info('No photos found — try another search')
    } catch {
      toast.error('Photo search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="px-6 sm:px-10 pb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <PaintBrush className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {value && <button onClick={() => onPick(null)} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); run() } }}
            placeholder="Search photos — beach, mountains, city…"
            className="pl-8 h-9"
          />
        </div>
        <button
          onClick={run}
          disabled={searching || !query.trim()}
          className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          {searching ? <CircleNotch className="h-4 w-4 animate-spin" /> : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
          {results.map(r => {
            const active = value === r.url
            return (
              <button
                key={r.url}
                onClick={() => onPick(r.url)}
                title={r.credit ? `Photo by ${r.credit}` : undefined}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-transform hover:scale-[1.03] ${active ? 'border-primary' : 'border-transparent'}`}
              >
                <img src={r.thumb} alt="" className="w-full h-full object-cover" />
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Check className="h-4 w-4 text-white drop-shadow" weight="bold" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mb-2">Or pick a design</p>
      <div className="flex flex-wrap gap-2">
        {WALLPAPERS.map(w => {
          const active = value === w.id
          return (
            <button
              key={w.id}
              onClick={() => onPick(w.id)}
              title={w.label}
              className={`relative h-12 w-12 rounded-xl overflow-hidden border-2 transition-transform hover:scale-105 ${active ? 'border-primary' : 'border-white/25'}`}
              style={{ background: w.css }}
            >
              {active && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check className="h-4 w-4 text-white drop-shadow" weight="bold" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ProfileDialog({ profile, onOpenChange }: Props) {
  const { state, dispatch, saveMyGlobe, saveMyWallpaper, saveMyBanner, searchPhotos } = useApp()
  const { posts, directory, locations, trips } = state

  const isSelf = !!profile?.uid && profile.uid === state.uid

  // Visited-countries globe. For your own profile this is editable and seeded
  // from the live profile (so it shows immediately, before the directory loads);
  // for others it's read-only from the directory entry.
  const [visited, setVisited] = useState<string[]>([])
  const [favourite, setFavourite] = useState<string | null>(null)
  const [wallpaper, setWallpaper] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const member = useMemo(() => {
    if (!profile) return null
    if (profile.uid) {
      const m = directory.find(d => d.uid === profile.uid)
      if (m) return m
    }
    return directory.find(d => norm(d.displayName) === norm(profile.name)) ?? null
  }, [profile, directory])

  useEffect(() => {
    if (isSelf) {
      setVisited(state.currentUserProfile?.visitedCountries ?? member?.visitedCountries ?? [])
      setFavourite(state.currentUserProfile?.favouriteCountry ?? member?.favouriteCountry ?? null)
      setWallpaper(state.currentUserProfile?.profileWallpaper ?? member?.profileWallpaper ?? null)
      setBanner(state.currentUserProfile?.profileBanner ?? member?.profileBanner ?? null)
    } else {
      setVisited(member?.visitedCountries ?? [])
      setFavourite(member?.favouriteCountry ?? null)
      setWallpaper(member?.profileWallpaper ?? null)
      setBanner(member?.profileBanner ?? null)
    }
  }, [isSelf, member, state.currentUserProfile])

  function applyWallpaper(v: string | null) {
    const next = v === null ? null : (wallpaper === v ? null : v)
    setWallpaper(next)
    saveMyWallpaper(next).catch(() => toast.error('Could not save your background'))
  }

  function applyBanner(v: string | null) {
    const next = v === null ? null : (banner === v ? null : v)
    setBanner(next)
    saveMyBanner(next).catch(() => toast.error('Could not save your banner'))
  }

  function persistGlobe(nextVisited: string[], nextFavourite: string | null) {
    setVisited(nextVisited)
    setFavourite(nextFavourite)
    saveMyGlobe(nextVisited, nextFavourite).catch(() => toast.error('Could not save your travel map'))
  }

  function addCountry(country: string) {
    if (!country || visited.includes(country)) return
    persistGlobe([...visited, country].sort(), favourite)
  }

  // Countries that come from reviews can't be removed (they're automatic);
  // they stay on the globe as long as the review exists.

  function removeCountry(country: string) {
    persistGlobe(visited.filter(c => c !== country), favourite === country ? null : favourite)
  }

  function toggleFavourite(country: string) {
    persistGlobe(visited, favourite === country ? null : country)
  }

  const reviews = useMemo(() => {
    if (!profile) return []
    const target = norm(profile.name)
    return posts.filter(p =>
      (profile.uid && p.userId === profile.uid) || norm(p.staff) === target
    )
  }, [profile, posts])

  // Countries the person has reviewed — these appear on their globe automatically
  // (derived from each review's linked location), on top of any added manually.
  const reviewCountries = useMemo(() => {
    const countries = new Set<string>()
    for (const p of reviews) {
      for (const id of (p.locationIds?.length ? p.locationIds : [p.locationId])) {
        if (!id) continue
        const loc = locations.find(l => l.id === id)
        if (loc?.country) countries.add(loc.country)
      }
    }
    return Array.from(countries)
  }, [reviews, locations])

  // Everything shaded on the globe: reviewed countries ∪ manually added ones.
  const allCountries = useMemo(
    () => Array.from(new Set([...reviewCountries, ...visited])).sort(),
    [reviewCountries, visited]
  )

  // Completed company trips this person took part in (participants are names).
  const tripsCount = useMemo(() => {
    if (!profile) return 0
    const target = norm(profile.name)
    return trips.filter(t => t.completed && (t.participants ?? []).some(p => norm(p) === target)).length
  }, [trips, profile])

  if (!profile) return null

  const name = titleCase(member?.displayName ?? profile.name)
  const avatarSrc = reviews.find(r => r.staffImage)?.staffImage ?? null
  const bannerSrc = reviews.find(r => r.images.length > 0)?.images[0] ?? null
  const wp = wallpaperCss(wallpaper)
  const heroColor = state.settings.color || '#05979a'
  // Banner precedence: a chosen design, else a chosen/review photo, else gradient.
  const bannerPreset = WALLPAPERS.find(w => w.id === banner)
  const bannerPhoto = banner && /^https?:\/\//i.test(banner) ? banner : null
  const heroPhoto = bannerPhoto ?? bannerSrc
  const roleBits = [member?.jobRole, member?.building, member?.salesDivision].filter(Boolean) as string[]

  const locNames = (id: string) => {
    const l = locations.find(x => x.id === id)
    return l?.name
  }

  function openReview(post: typeof reviews[number]) {
    onOpenChange(false)
    dispatch({ type: 'SET_OPEN_POST', post })
  }

  return (
    <Dialog open={!!profile} onOpenChange={onOpenChange}>
      <DialogContent size="blog" mobileSheet className="p-0 gap-0 overflow-hidden sm:max-h-[92dvh]">
        <DialogTitle className="sr-only">{name}</DialogTitle>

        <DialogClose className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div
          className={`overflow-y-auto max-h-[85dvh] sm:max-h-[92dvh] ${wp ? 'dark text-foreground' : ''}`}
          style={wp ? { background: wp } : undefined}
        >
          {/* Hero wrapper — un-clipped so the avatar can overhang and sit in front */}
          <div className="relative">
            {/* Banner (clipped so the zoomed image stays inside) */}
            <div className="relative h-36 sm:h-48 overflow-hidden">
              {bannerPreset ? (
                <>
                  <div className="absolute inset-0" style={{ background: bannerPreset.css }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                </>
              ) : heroPhoto ? (
                <>
                  <img src={heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
                  <div className="absolute inset-0 mix-blend-soft-light opacity-60" style={{ background: `linear-gradient(135deg, ${heroColor}, transparent 70%)` }} />
                </>
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${heroColor}, color-mix(in srgb, ${heroColor} 30%, transparent))` }} />
              )}

              {/* Name + role sit on the hero for a bolder header */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 pl-28 sm:pl-40">
                <h1 className="text-2xl sm:text-3xl font-semibold leading-tight truncate text-white drop-shadow-lg">{name}</h1>
                {roleBits.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {member?.jobRole && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/20 text-white backdrop-blur-sm"><Briefcase className="h-3 w-3" />{member.jobRole}</span>
                    )}
                    {member?.building && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/20 text-white backdrop-blur-sm"><Buildings className="h-3 w-3" />{member.building}</span>
                    )}
                    {member?.salesDivision && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/20 text-white backdrop-blur-sm"><MapPin className="h-3 w-3" />{member.salesDivision}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Avatar overhangs the banner's bottom-left and sits in front (not clipped) */}
            <Avatar className="absolute z-10 left-5 sm:left-7 -bottom-7 sm:-bottom-9 h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl ring-2 ring-primary/30">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={name} className="object-cover" />}
              <AvatarFallback className="text-xl sm:text-2xl">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Stats strip — auto-derived, gives the page some life */}
          <div className="px-6 sm:px-10 pt-10 sm:pt-12 pb-5">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { value: allCountries.length, label: allCountries.length === 1 ? 'Country' : 'Countries', Icon: GlobeHemisphereWest },
                { value: reviews.length, label: reviews.length === 1 ? 'Review' : 'Reviews', Icon: Camera },
                { value: tripsCount, label: tripsCount === 1 ? 'Trip' : 'Trips', Icon: MapPin },
              ].map(({ value, label, Icon }) => (
                <div key={label} className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 py-3">
                  <Icon className="h-4 w-4 text-primary mb-1" />
                  <span className="text-xl sm:text-2xl font-semibold leading-none text-foreground">{value}</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Self-service appearance — banner (hero strip) and background. */}
          {isSelf && (
            <>
              <AppearancePicker title="Banner" value={banner} onPick={applyBanner} searchPhotos={searchPhotos} />
              <AppearancePicker title="Background" value={wallpaper} onPick={applyWallpaper} searchPhotos={searchPhotos} />
            </>
          )}

          {/* Travel map — countries visited with the company (favourite shaded gold).
              Every profile shows a globe; it's just empty until countries are added. */}
          {(
            <div className="px-6 sm:px-10 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <GlobeHemisphereWest className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  {isSelf ? 'My travel map' : `Where ${name.split(' ')[0]} has been`}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {allCountries.length} countr{allCountries.length === 1 ? 'y' : 'ies'}
                </span>
              </div>

              <div className="h-56 sm:h-72 rounded-2xl overflow-hidden border border-border bg-muted">
                <ProfileGlobe visitedCountries={allCountries} favourite={favourite} color={state.settings.color || '#05979a'} />
              </div>

              {!isSelf && allCountries.length === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">No countries yet.</p>
              )}

              {isSelf && (
                <div className="mt-3 space-y-3">
                  <AppSelect
                    value=""
                    onChange={addCountry}
                    placeholder="Add a country you've visited…"
                    searchable
                    options={COUNTRIES.filter(c => !allCountries.includes(c)).map(c => ({ value: c, label: c }))}
                  />

                  {allCountries.length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {allCountries.map(c => {
                          const fav = favourite === c
                          const fromReview = reviewCountries.includes(c)
                          return (
                            <span
                              key={c}
                              className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs border ${fav ? 'border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-300' : 'border-border bg-muted text-foreground'}`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleFavourite(c)}
                                title={fav ? 'Favourite destination' : 'Mark as favourite'}
                                className="flex items-center"
                              >
                                <Star className={`h-3.5 w-3.5 ${fav ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`} weight={fav ? 'fill' : 'regular'} />
                              </button>
                              {c}
                              {fromReview ? (
                                <span title="From your reviews" className="flex items-center text-muted-foreground/60 pr-0.5">
                                  <Camera className="h-3 w-3" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeCountry(c)}
                                  title="Remove"
                                  className="flex items-center text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          )
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Countries from your reviews (<Camera className="inline h-3 w-3 -mt-0.5" />) appear automatically. Tap the <Star className="inline h-3 w-3 -mt-0.5 text-amber-500" weight="fill" /> to pick your favourite — it's shaded gold on your globe.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          <div className="px-6 sm:px-10 py-6">
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                <Camera className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">No reviews yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    tiltDir={i % 2 === 0 ? 1 : -1}
                    locationNames={(post.locationIds ?? [post.locationId])
                      .filter(Boolean)
                      .map(id => locNames(id as string))
                      .filter(Boolean) as string[]}
                    onClick={() => openReview(post)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
