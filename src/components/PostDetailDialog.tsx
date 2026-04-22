import { MapPin, User, Calendar, Hotel, Plane, Ship, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ImageSlideshow } from './ImageSlideshow'
import { fmtDateLong } from '@/lib/utils'
import type { Post, PostExtras } from '@/lib/types'

const EXTRA_SECTIONS: { key: keyof PostExtras; label: string; Icon: React.ElementType; color: string }[] = [
  { key: 'hotels',     label: 'Hotels',     Icon: Hotel, color: 'text-violet-500' },
  { key: 'airlines',   label: 'Airlines',   Icon: Plane, color: 'text-sky-500' },
  { key: 'cruises',    label: 'Cruises',    Icon: Ship,  color: 'text-blue-500' },
  { key: 'activities', label: 'Activities', Icon: Zap,   color: 'text-orange-500' },
]

interface Props {
  post: Post | null
  onOpenChange: (open: boolean) => void
}

export function PostDetailDialog({ post, onOpenChange }: Props) {
  if (!post) return null

  return (
    <Dialog open={!!post} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="font-outfit font-bold text-xl">{post.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {post.images.length > 0 && (
            <ImageSlideshow
              images={post.images}
              alt={post.title}
              className="w-full max-h-96 object-cover rounded-xl"
            />
          )}

          <div className="flex flex-wrap gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <strong className="text-foreground">{post.location.name}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-4 w-4 text-primary" />
              <strong className="text-foreground">{post.staff}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <strong className="text-foreground">{fmtDateLong(post.date)}</strong>
            </div>
          </div>

          <p className="text-sm leading-relaxed">{post.review}</p>

          {EXTRA_SECTIONS.map(({ key, label, Icon, color }) => {
            const items = post.extras?.[key] ?? []
            if (items.length === 0) return null
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <h4 className="font-semibold text-sm">{label}</h4>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="bg-muted/40 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <span className="text-amber-400 text-sm leading-none flex-shrink-0">
                        {'★'.repeat(item.rating)}
                        <span className="text-muted-foreground/30">{'★'.repeat(5 - item.rating)}</span>
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          })}

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="blue">{tag}</Badge>
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
