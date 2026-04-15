import { useState } from 'react'
import { Globe } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { PostCard } from './PostCard'
import { PostDetailDialog } from './PostDetailDialog'
import type { Post } from '@/lib/types'

export function FeedView() {
  const { state, dispatch } = useApp()
  const { posts, settings, activeFilter } = state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort()

  const filtered = activeFilter
    ? posts.filter((p) => p.tags.includes(activeFilter))
    : [...posts]

  const sorted = filtered.sort((a, b) => ((b.date || '') < (a.date || '') ? -1 : 1))

  return (
    <div className="flex flex-col items-center">
      {/* Section header */}
      <div className="w-full max-w-[500px] mb-5">
        <h2 className="font-outfit font-bold text-3xl text-foreground leading-tight">{settings.heading}</h2>
        {settings.welcome && (
          <p className="text-sm text-muted-foreground mt-1.5">{settings.welcome}</p>
        )}
      </div>

      {/* Filter bar */}
      {allTags.length > 0 && (
        <div className="w-full max-w-[500px] flex flex-wrap gap-1.5 mb-5">
          <button
            onClick={() => dispatch({ type: 'SET_FILTER', filter: null })}
            className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-all ${
              activeFilter === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground hover:border-primary hover:text-primary'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => dispatch({ type: 'SET_FILTER', filter: tag })}
              className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-all ${
                activeFilter === tag
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Globe className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="font-outfit font-bold text-xl mb-1 text-foreground">No trips posted yet</h3>
          <p className="text-sm text-center max-w-xs">Admins can upload photos and reviews from staff trips in the admin panel</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 w-full">
          {sorted.map((post) => (
            <div key={post.id} className="w-full max-w-[500px]">
              <PostCard post={post} onClick={() => setSelectedPost(post)} />
            </div>
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
