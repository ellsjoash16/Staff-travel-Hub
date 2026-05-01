import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Trash2, Clock, MapPin, ImageIcon, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/context/AppContext'
import { AdminPanel } from './AdminPanel'
import { removePost } from '@/lib/db'
import { fmtDate } from '@/lib/utils'
import type { Post } from '@/lib/types'

export function PendingView() {
  const { state, fetchPending, approvePostFn, dispatch } = useApp()
  const { pendingPosts } = state
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [editPost, setEditPost] = useState<Post | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        await fetchPending()
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to load pending posts')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleApprove(id: string) {
    setActionId(id)
    try {
      await approvePostFn(id)
      toast.success('Post approved and published!')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to approve post')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pending post? This cannot be undone.')) return
    setActionId(id)
    try {
      await removePost(id)
      dispatch({ type: 'SET_PENDING', posts: pendingPosts.filter(p => p.id !== id) })
      toast.success('Post deleted')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete post')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="font-gilbert text-xl">Pending Approvals</h1>
            <p className="text-sm text-muted-foreground">
              {pendingPosts.length} {pendingPosts.length === 1 ? 'submission' : 'submissions'} awaiting review
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading pending posts…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && pendingPosts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="font-medium mb-1">All caught up!</p>
          <p className="text-sm text-muted-foreground">No posts awaiting approval</p>
        </div>
      )}

      {/* List */}
      {!loading && pendingPosts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {pendingPosts.map(post => (
            <div
              key={post.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Thumbnail */}
              <div className="w-full sm:w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                {post.images[0] ? (
                  <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{post.title || 'Untitled'}</p>
                <p className="text-sm text-muted-foreground">Submitted by {post.staff || 'Unknown'}</p>
                {post.location.name && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {post.location.name}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {post.date && <span>{fmtDate(post.date)}</span>}
                  {post.images.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {post.images.length} {post.images.length === 1 ? 'image' : 'images'}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(post.id)}
                  disabled={actionId === post.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  {actionId === post.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditPost(post)}
                  disabled={actionId === post.id}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(post.id)}
                  disabled={actionId === post.id}
                  className="gap-1.5"
                >
                  {actionId === post.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle className="h-3.5 w-3.5" />
                  }
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AdminPanel
        open={!!editPost}
        onOpenChange={open => { if (!open) setEditPost(null) }}
        initialPost={editPost ?? undefined}
      />
    </div>
  )
}
