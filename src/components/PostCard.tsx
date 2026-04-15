import { MapPin, Images } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fmtDate, initials } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface Props {
  post: Post
  onClick: () => void
}

export function PostCard({ post, onClick }: Props) {
  return (
    <article
      onClick={onClick}
      className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-border/40 w-full hover:-translate-y-0.5"
    >
      {/* Image with overlaid author */}
      <div className="relative overflow-hidden">
        {post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full aspect-[4/3] object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary/25 via-primary/10 to-transparent flex items-center justify-center text-6xl">
            🌍
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Multi-image badge */}
        {post.images.length > 1 && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2.5 py-1 border border-white/20">
            <Images className="h-3 w-3" />
            {post.images.length}
          </span>
        )}

        {/* Author info overlaid at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 ring-2 ring-white/80 flex-shrink-0 shadow-md">
              {post.staffImage && <AvatarImage src={post.staffImage} alt={post.staff} className="object-cover" />}
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-semibold">
                {initials(post.staff)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white leading-tight truncate drop-shadow">{post.staff}</p>
              <p className="text-xs text-white/80 flex items-center gap-0.5 truncate drop-shadow">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                {post.location.name}
              </p>
            </div>
          </div>
          <span className="text-xs text-white/70 flex-shrink-0 drop-shadow">{fmtDate(post.date)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2">
        <h3 className="font-bold text-base mb-1.5 leading-snug">{post.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{post.review}</p>
      </div>

      {post.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="blue">{tag}</Badge>
          ))}
        </div>
      )}
    </article>
  )
}
