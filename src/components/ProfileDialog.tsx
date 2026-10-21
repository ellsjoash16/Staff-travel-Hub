import { useMemo, useState, useEffect } from 'react'
import { Briefcase, Buildings, MapPin, Camera, X, GlobeHemisphereWest, Star } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppSelect } from '@/components/ui/app-select'
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

export function ProfileDialog({ profile, onOpenChange }: Props) {
  const { state, dispatch, saveMyGlobe } = useApp()
  const { posts, directory, locations } = state

  const isSelf = !!profile?.uid && profile.uid === state.uid

  // Visited-countries globe. For your own profile this is editable and seeded
  // from the live profile (so it shows immediately, before the directory loads);
  // for others it's read-only from the directory entry.
  const [visited, setVisited] = useState<string[]>([])
  const [favourite, setFavourite] = useState<string | null>(null)

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
    } else {
      setVisited(member?.visitedCountries ?? [])
      setFavourite(member?.favouriteCountry ?? null)
    }
  }, [isSelf, member, state.currentUserProfile])

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

  if (!profile) return null

  const name = titleCase(member?.displayName ?? profile.name)
  const avatarSrc = reviews.find(r => r.staffImage)?.staffImage ?? null
  const bannerSrc = reviews.find(r => r.images.length > 0)?.images[0] ?? null
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

        <div className="overflow-y-auto max-h-[85dvh] sm:max-h-[92dvh]">
          {/* Header: photo banner (falls back to a gradient when no review photos) */}
          <div className="relative h-24 sm:h-28 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent overflow-hidden">
            {bannerSrc && (
              <>
                <img src={bannerSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/10" />
              </>
            )}
          </div>

          {/* Profile info — avatar straddles the band's bottom edge (halfway on the line) */}
          <div className="px-6 sm:px-10 pb-6">
            <div className="flex items-end gap-4 -mt-8 sm:-mt-10">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-md">
                {avatarSrc && <AvatarImage src={avatarSrc} alt={name} className="object-cover" />}
                <AvatarFallback className="text-lg sm:text-xl">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 relative z-10 -translate-y-9 sm:-translate-y-11">
                <h1 className="text-xl sm:text-2xl font-semibold leading-tight truncate text-white drop-shadow-lg">{name}</h1>
              </div>
            </div>

            <p className="text-sm text-muted-foreground -mt-7 sm:-mt-8 pl-20 sm:pl-24">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>

            {roleBits.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-xs sm:text-sm text-muted-foreground">
                {member?.jobRole && (
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{member.jobRole}</span>
                )}
                {member?.building && (
                  <span className="flex items-center gap-1.5"><Buildings className="h-3.5 w-3.5" />{member.building}</span>
                )}
                {member?.salesDivision && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{member.salesDivision}</span>
                )}
              </div>
            )}
          </div>

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
