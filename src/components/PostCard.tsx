import { useState } from 'react'
import { MapPin, Images, PushPin, Globe, PlayCircle } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fmtDate, initials, titleCase } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface Props {
  post: Post
  onClick: () => void
  tiltDir?: 1 | -1
  locationNames?: string[]
  compact?: boolean
}

export function PostCard({ post, onClick, tiltDir = 1, locationNames, compact = false }: Props) {
  const [hovered, setHovered] = useState(false)
  const locLabel = locationNames?.length ? locationNames.join(' · ') : post.location.name
  const watermark = locationNames?.[0] ?? post.location.name

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: hovered
          ? `rotate(${tiltDir * 0.6}deg) translateY(-3px)`
          : 'rotate(0deg) translateY(0px)',
        transition: 'transform 0.25s ease-out, box-shadow 0.25s ease-out',
      }}
      className={`group cursor-pointer w-full h-full rounded-2xl ${
        hovered ? 'shadow-2xl' : 'shadow-md'
      }`}
    >
    <article className="bg-card rounded-2xl overflow-hidden border border-border/40 w-full h-full flex flex-col">
      {/* Image with overlaid author */}
      <div className="relative overflow-hidden rounded-t-2xl flex-shrink-0">
        {post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className={`w-full ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'} object-cover rounded-t-2xl group-hover:scale-[1.03] transition-transform duration-500`}
            loading="lazy"
          />
        ) : (
          <div className={`w-full ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'} rounded-t-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent flex items-center justify-center`}>
            <Globe className="h-12 w-12 text-primary/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {post.riseUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <PlayCircle className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
          </div>
        )}

        {post.pinned && (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-primary backdrop-blur-sm text-primary-foreground text-xs font-semibold rounded-full px-2.5 py-1">
            <PushPin className="h-3 w-3" /> Featured
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
            <Avatar className={`${compact ? 'h-7 w-7' : 'h-9 w-9 xl:h-10 xl:w-10 2xl:h-11 2xl:w-11'} ring-2 ring-white/80 flex-shrink-0 shadow-md`}>
              {post.staffImage && <AvatarImage src={post.staffImage} alt={post.staff} className="object-cover" />}
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-semibold">
                {initials(post.staff)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={`font-semibold ${compact ? 'text-xs lg:text-sm' : 'text-sm lg:text-base xl:text-lg 2xl:text-xl'} text-white leading-tight truncate drop-shadow`}>{titleCase(post.staff)}</p>
              <p className={`${compact ? 'text-[10px] lg:text-xs' : 'text-xs lg:text-sm xl:text-base'} text-white/80 flex items-center gap-0.5 truncate drop-shadow`}>
                <MapPin className="h-2.5 w-2.5 lg:h-3 lg:w-3 flex-shrink-0" />
                {locLabel}
              </p>
            </div>
          </div>
          <span className={`${compact ? 'text-[10px] lg:text-xs' : 'text-xs lg:text-sm xl:text-base'} text-white/70 flex-shrink-0 drop-shadow font-medium italic`}>
            {fmtDate(post.date)}
          </span>
        </div>
      </div>

      {/* Body with destination watermark */}
      <div className="relative flex-1 px-4 xl:px-5 pt-3 xl:pt-4 pb-2 xl:pb-3 overflow-hidden">
        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className={`${compact ? 'text-[2.5rem]' : 'text-[3.5rem] xl:text-[4.5rem]'} font-black text-foreground/[0.04] whitespace-nowrap -rotate-12 leading-none tracking-widest uppercase`}>
              {watermark}
            </span>
          </div>
        )}
        <h3 className={`relative font-bold ${compact ? 'text-sm lg:text-base' : 'text-base lg:text-lg xl:text-xl 2xl:text-2xl'} mb-1.5 leading-snug`}>{post.title}</h3>
        {post.riseUrl ? (
          <p className={`relative ${compact ? 'text-xs' : 'text-sm lg:text-base xl:text-lg'} text-primary font-medium flex items-center gap-1.5`}>
            <PlayCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
            Click to see review
          </p>
        ) : (
          <p className={`relative ${compact ? 'text-xs lg:text-sm line-clamp-2 2xl:line-clamp-3' : 'text-sm lg:text-base xl:text-lg line-clamp-3'} text-muted-foreground leading-relaxed`}>{post.review}</p>
        )}
      </div>

      {!compact && post.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="blue">{tag}</Badge>
          ))}
        </div>
      )}
    </article>
    </div>
  )
}
