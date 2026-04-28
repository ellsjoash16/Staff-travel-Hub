import { useState } from 'react'
import { MapPin, Images, Pin, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fmtDate, initials } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface Props {
  post: Post
  onClick: () => void
  tiltDir?: 1 | -1
}

export function PostCard({ post, onClick, tiltDir = 1 }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: hovered
          ? `rotate(${tiltDir * 0.6}deg) translateY(-3px)`
          : 'rotate(0deg) translateY(0px)',
        transition: 'transform 0.25s ease-out, box-shadow 0.25s ease-out',
      }}
      className={`group bg-card rounded-2xl overflow-hidden cursor-pointer border border-border/40 w-full ${
        hovered ? 'shadow-2xl' : 'shadow-md'
      }`}
    >
      {/* Image with overlaid author */}
      <div className="relative overflow-hidden">
        {post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full aspect-[4/3] object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary/25 via-primary/10 to-transparent flex items-center justify-center">
            <Globe className="h-12 w-12 text-primary/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {post.pinned && (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-primary backdrop-blur-sm text-primary-foreground text-xs font-semibold rounded-full px-2.5 py-1">
            <Pin className="h-3 w-3" /> Featured
          </span>
        )}

        {post.images.length > 1 && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2.5 py-1 border border-white/20">
            <Images className="h-3 w-3" />
            {post.images.length}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 2xl:h-11 2xl:w-11 ring-2 ring-white/80 flex-shrink-0 shadow-md">
              {post.staffImage && <AvatarImage src={post.staffImage} alt={post.staff} className="object-cover" />}
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-semibold">
                {initials(post.staff)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm 2xl:text-base text-white leading-tight truncate drop-shadow">{post.staff}</p>
              <p className="text-xs 2xl:text-sm text-white/80 flex items-center gap-0.5 truncate drop-shadow">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                {post.location.name}
              </p>
            </div>
          </div>
          <span className="text-xs text-white/70 flex-shrink-0 drop-shadow font-medium italic">
            {fmtDate(post.date)}
          </span>
        </div>
      </div>

      {/* Body with destination watermark */}
      <div className="relative px-4 2xl:px-5 pt-3 2xl:pt-4 pb-2 2xl:pb-3 overflow-hidden">
        {post.location.name && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="text-[4.5rem] font-black text-foreground/[0.04] whitespace-nowrap -rotate-12 leading-none tracking-widest uppercase">
              {post.location.name}
            </span>
          </div>
        )}
        <h3 className="relative font-bold text-base 2xl:text-lg mb-1.5 leading-snug">{post.title}</h3>
        <p className="relative text-sm 2xl:text-base text-muted-foreground leading-relaxed line-clamp-3">{post.review}</p>
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
