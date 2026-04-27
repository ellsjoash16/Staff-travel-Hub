import { MapPin, Calendar, Hotel, Plane, Ship, Zap, Building2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fmtDateLong, initials } from '@/lib/utils'
import type { Post, PostExtras } from '@/lib/types'

const EXTRA_SECTIONS: {
  key: keyof PostExtras
  label: string
  Icon: React.ElementType
  color: string
  pill: string
}[] = [
  { key: 'airlines',   label: 'Airlines',   Icon: Plane,     color: 'text-sky-500',     pill: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { key: 'hotels',     label: 'Hotels',     Icon: Hotel,     color: 'text-violet-500',  pill: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { key: 'cruises',    label: 'Cruises',    Icon: Ship,      color: 'text-blue-500',    pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { key: 'activities', label: 'Activities', Icon: Zap,       color: 'text-orange-500',  pill: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { key: 'dmcs',       label: 'DMCs',       Icon: Building2, color: 'text-emerald-500', pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
]

interface Props {
  post: Post | null
  onOpenChange: (open: boolean) => void
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm leading-none">
      <span className="text-amber-400">{'★'.repeat(rating)}</span>
      <span className="text-muted-foreground/25">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export function PostDetailDialog({ post, onOpenChange }: Props) {
  if (!post) return null

  const [heroImage, ...restImages] = post.images
  const hasExtras = EXTRA_SECTIONS.some(({ key }) => (post.extras?.[key] ?? []).length > 0)

  type Block = { type: 'text'; content: string } | { type: 'image'; src: string }
  const blocks: Block[] = []

  if (post.review.includes('\n---\n')) {
    // Explicit placement via BlogEditor
    const parts = post.review.split('\n---\n')
    parts.forEach((part, i) => {
      part.split(/\n+/).filter(Boolean).forEach(p => blocks.push({ type: 'text', content: p }))
      if (i < parts.length - 1 && restImages[i]) {
        blocks.push({ type: 'image', src: restImages[i] })
      }
    })
    // Append any remaining images not explicitly placed
    const placed = parts.length - 1
    restImages.slice(placed).forEach(src => blocks.push({ type: 'image', src }))
  } else {
    // Legacy: auto-distribute every 2 paragraphs
    const paragraphs = post.review.split(/\n+/).filter(Boolean)
    let imgIdx = 0
    for (let i = 0; i < paragraphs.length; i++) {
      blocks.push({ type: 'text', content: paragraphs[i] })
      if (imgIdx < restImages.length && (i + 1) % 2 === 0) {
        blocks.push({ type: 'image', src: restImages[imgIdx++] })
      }
    }
    while (imgIdx < restImages.length) blocks.push({ type: 'image', src: restImages[imgIdx++] })
  }

  return (
    <Dialog open={!!post} onOpenChange={onOpenChange}>
      <DialogContent size="blog" className="p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{post.title}</DialogTitle>

        {/* Custom close button */}
        <DialogClose className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[95vh]">

          {/* Hero image with title overlay */}
          {heroImage ? (
            <div className="relative w-full overflow-hidden flex-shrink-0">
              <img
                src={heroImage}
                alt={post.title}
                className="w-full aspect-[16/7] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-6 pt-20">
                {post.location.name && (
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <MapPin className="h-3 w-3 text-white/60" />
                    <span className="text-white/60 text-xs font-medium tracking-wide uppercase">{post.location.name}</span>
                  </div>
                )}
                <h1 className="font-gilbert text-2xl sm:text-4xl text-white leading-tight drop-shadow-lg">
                  {post.title}
                </h1>
              </div>
            </div>
          ) : (
            <div className="px-6 sm:px-10 pt-10 pb-2">
              <h1 className="font-gilbert text-2xl sm:text-3xl leading-snug">{post.title}</h1>
            </div>
          )}

          <div className="px-6 sm:px-10 py-6 space-y-7">

            {/* Author row */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/25 flex-shrink-0">
                {post.staffImage && <AvatarImage src={post.staffImage} alt={post.staff} className="object-cover" />}
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                  {initials(post.staff)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm leading-tight">{post.staff}</p>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary/70" />
                    {fmtDateLong(post.date)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Ratings ── */}
            {hasExtras && (
              <div className="rounded-2xl border border-border/70 bg-muted/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 bg-muted/40">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trip Ratings</h2>
                </div>
                <div className="divide-y divide-border/50">
                  {EXTRA_SECTIONS.map(({ key, label, Icon, color, pill }) => {
                    const items = post.extras?.[key] ?? []
                    if (items.length === 0) return null
                    return (
                      <div key={key} className="px-4 py-3 space-y-2.5">
                        {/* Category header */}
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${color}`} />
                          <span className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>{label}</span>
                        </div>
                        {/* Items grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {items.map((item, i) => (
                            <div key={i} className="bg-card rounded-xl border border-border/50 px-3 py-2.5 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm leading-tight truncate">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                                )}
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
                                <Stars rating={item.rating} />
                                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${pill}`}>
                                  {item.rating}/5
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Review body ── */}
            <div className="space-y-5">
              {blocks.map((block, i) =>
                block.type === 'text' ? (
                  <p key={i} className="text-sm sm:text-[15px] leading-[1.85] text-foreground/85">
                    {block.content}
                  </p>
                ) : (
                  <div key={i} className="rounded-2xl overflow-hidden shadow-md -mx-2 sm:-mx-4">
                    <img
                      src={block.src}
                      alt=""
                      className="w-full object-cover max-h-[500px]"
                      loading="lazy"
                    />
                  </div>
                )
              )}
            </div>

            {/* ── Tags ── */}
            {post.tags.length > 0 && (
              <div className="pt-4 border-t border-border flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="blue">{tag}</Badge>
                ))}
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
