import { useState } from 'react'
import { MapPin, CalendarDays } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { fmtDate } from '@/lib/utils'

export function YearsView() {
  const { state } = useApp()
  const { posts } = state

  const years = [...new Set(
    posts.map((p) => p.date?.slice(0, 4) || 'Unknown')
  )].sort((a, b) => b.localeCompare(a))

  const [activeYear, setActiveYear] = useState(years[0] || '')

  const yearPosts = [...posts]
    .filter((p) => (p.date?.slice(0, 4) || 'Unknown') === activeYear)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <CalendarDays className="h-10 w-10 text-primary/50" />
        </div>
        <h3 className="font-outfit font-bold text-xl mb-1 text-foreground">No trips yet</h3>
        <p className="text-sm">Trips will appear here grouped by year</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-outfit font-bold text-3xl mb-5">Trips by Year</h2>

      {/* Year tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setActiveYear(year)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              activeYear === year
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Trip list */}
      {yearPosts.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No trips in {activeYear}</p>
      ) : (
        <div className="space-y-3">
          {yearPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/60 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              {/* Thumbnail */}
              {post.images.length > 0 ? (
                <img
                  src={post.images[0]}
                  alt={post.title}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-2xl">
                  🌍
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{post.staff}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0 text-primary" />
                  {post.location.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{post.title}</p>
              </div>

              {/* Date */}
              <span className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(post.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
