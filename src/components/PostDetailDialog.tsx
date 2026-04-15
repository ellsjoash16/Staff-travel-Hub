import { MapPin, User, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ImageSlideshow } from './ImageSlideshow'
import { fmtDateLong } from '@/lib/utils'
import type { Post } from '@/lib/types'

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
