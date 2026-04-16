import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Trash2, Pencil, Upload, Loader2, BookOpen, CheckCircle2, Map, Plane, LayoutGrid } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MultiImageUpload } from './MultiImageUpload'
import { ImageUpload } from './ImageUpload'
import { LocationPicker } from './LocationPicker'
import { DatePicker } from './DatePicker'
import { useApp } from '@/context/AppContext'
import { today, fmtDate } from '@/lib/utils'
import type { Post, Course, PanelImages } from '@/lib/types'

const PALETTE = ['#0077b6', '#6366f1', '#ec4899', '#f97316', '#10b981', '#dc2626', '#7c3aed', '#0f766e']

interface PostForm {
  title: string; staff: string; staffImage: string | null
  review: string; locName: string; date: string; tags: string
  lat: number | null; lng: number | null; images: string[]
  showFlightPath: boolean
}

interface CourseForm {
  title: string; description: string; riseUrl: string
  locName: string; lat: number | null; lng: number | null
  image: string | null; showOnMap: boolean
}

const emptyPostForm = (): PostForm => ({
  title: '', staff: '', staffImage: null, review: '', locName: '',
  date: today(), tags: '', lat: null, lng: null, images: [],
  showFlightPath: false,
})

const emptyCourseForm = (): CourseForm => ({
  title: '', description: '', riseUrl: '', locName: '',
  lat: null, lng: null, image: null, showOnMap: false,
})

interface Props { open: boolean; onOpenChange: (open: boolean) => void }

export function AdminPanel({ open, onOpenChange }: Props) {
  const { state, addPost, editPost, deletePost, addCourse, editCourse, deleteCourse, deleteSubmission, saveSettings, savePageImages } = useApp()
  const { posts, courses, submissions, settings } = state

  const [tab, setTab] = useState('post')
  const [postForm, setPostForm] = useState<PostForm>(emptyPostForm())
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm())
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [sTitle, setSTitle] = useState(settings.title)
  const [sHeading, setSHeading] = useState(settings.heading)
  const [sWelcome, setSWelcome] = useState(settings.welcome)
  const [sColor, setSColor] = useState(settings.color)
  const [sHex, setSHex] = useState(settings.color)
  const [sPwd, setSPwd] = useState('')
  const [sAirportName, setSAirportName] = useState(settings.departureAirport?.name ?? 'LHR')
  const [sAirportLat, setSAirportLat] = useState(String(settings.departureAirport?.lat ?? 51.5074))
  const [sAirportLng, setSAirportLng] = useState(String(settings.departureAirport?.lng ?? -0.1278))

  const [pFeed, setPFeed] = useState<string | null>(settings.panelImages?.feed ?? null)
  const [pMap, setPMap] = useState<string | null>(settings.panelImages?.map ?? null)
  const [pCourses, setPCourses] = useState<string | null>(settings.panelImages?.courses ?? null)
  const [pYears, setPYears] = useState<string | null>(settings.panelImages?.years ?? null)
  const [pSubmit, setPSubmit] = useState<string | null>(settings.panelImages?.submit ?? null)

  useEffect(() => {
    if (open) {
      setSTitle(settings.title); setSHeading(settings.heading)
      setSWelcome(settings.welcome); setSColor(settings.color)
      setSHex(settings.color); setSPwd('')
      setSAirportName(settings.departureAirport?.name ?? 'LHR')
      setSAirportLat(String(settings.departureAirport?.lat ?? 51.5074))
      setSAirportLng(String(settings.departureAirport?.lng ?? -0.1278))
      setPFeed(settings.panelImages?.feed ?? null)
      setPMap(settings.panelImages?.map ?? null)
      setPCourses(settings.panelImages?.courses ?? null)
      setPYears(settings.panelImages?.years ?? null)
      setPSubmit(settings.panelImages?.submit ?? null)
    }
  }, [open, settings])

  function setPost<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setPostForm((f) => ({ ...f, [key]: value }))
  }

  function setCourse<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setCourseForm((f) => ({ ...f, [key]: value }))
  }

  // ── Post ──────────────────────────────────────────────────────────────────

  async function submitPost() {
    if (!postForm.title || !postForm.staff || !postForm.review || !postForm.locName) {
      toast.error('Please fill in all required fields'); return
    }
    const id = editingPostId || crypto.randomUUID()
    const existingImages = postForm.images.filter((i) => i.startsWith('https:'))
    const newDataUrls = postForm.images.filter((i) => i.startsWith('data:'))
    const staffImageDataUrl = postForm.staffImage?.startsWith('data:') ? postForm.staffImage : null
    const post: Post = {
      id, title: postForm.title, staff: postForm.staff,
      staffImage: postForm.staffImage?.startsWith('https:') ? postForm.staffImage : null,
      review: postForm.review,
      location: { name: postForm.locName, lat: postForm.lat, lng: postForm.lng },
      date: postForm.date || today(),
      tags: postForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      images: existingImages,
      showFlightPath: postForm.showFlightPath,
    }
    setSubmitting(true)
    try {
      if (editingPostId) {
        await editPost(post, newDataUrls, staffImageDataUrl)
        toast.success('Post updated!')
      } else {
        await addPost(post, newDataUrls, staffImageDataUrl)
        toast.success('Post published!')
      }
      setPostForm(emptyPostForm()); setEditingPostId(null)
    } catch (err) {
      console.error(err); toast.error('Something went wrong.')
    } finally { setSubmitting(false) }
  }

  function startEditPost(post: Post) {
    setPostForm({
      title: post.title, staff: post.staff, staffImage: post.staffImage,
      review: post.review, locName: post.location.name,
      date: post.date || today(), tags: post.tags.join(', '),
      lat: post.location.lat, lng: post.location.lng, images: post.images,
      showFlightPath: post.showFlightPath,
    })
    setEditingPostId(post.id); setTab('post')
  }

  async function handleDeletePost(id: string) {
    if (!confirm('Delete this post?')) return
    try { await deletePost(id); toast.success('Post deleted') }
    catch { toast.error('Failed to delete post') }
  }

  // Pre-fill post form from a submission
  function useSubmission(sub: typeof submissions[0]) {
    setPostForm({
      title: '', staff: sub.name, staffImage: null,
      review: sub.review, locName: sub.location.name,
      date: sub.date || today(), tags: '',
      lat: sub.location.lat, lng: sub.location.lng,
      images: sub.images, showFlightPath: false,
    })
    setEditingPostId(null)
    setTab('post')
    toast.success('Submission loaded — add a title and publish')
  }

  async function handleDeleteSubmission(id: string) {
    if (!confirm('Discard this submission?')) return
    try { await deleteSubmission(id); toast.success('Submission discarded') }
    catch { toast.error('Failed to discard') }
  }

  // ── Course ────────────────────────────────────────────────────────────────

  async function submitCourse() {
    if (!courseForm.title || !courseForm.riseUrl) {
      toast.error('Course title and Rise URL are required'); return
    }
    const id = editingCourseId || crypto.randomUUID()
    const imageDataUrl = courseForm.image?.startsWith('data:') ? courseForm.image : null
    const course: Course = {
      id, title: courseForm.title, description: courseForm.description || null,
      image: courseForm.image?.startsWith('https:') ? courseForm.image : null,
      riseUrl: courseForm.riseUrl,
      location: { name: courseForm.locName, lat: courseForm.lat, lng: courseForm.lng },
      showOnMap: courseForm.showOnMap,
    }
    setSubmitting(true)
    try {
      if (editingCourseId) {
        await editCourse(course, imageDataUrl); toast.success('Course updated!')
      } else {
        await addCourse(course, imageDataUrl); toast.success('Course added!')
      }
      setCourseForm(emptyCourseForm()); setEditingCourseId(null)
    } catch (err) {
      console.error(err); toast.error('Something went wrong.')
    } finally { setSubmitting(false) }
  }

  function startEditCourse(course: Course) {
    setCourseForm({
      title: course.title, description: course.description || '',
      riseUrl: course.riseUrl, locName: course.location.name,
      lat: course.location.lat, lng: course.location.lng,
      image: course.image, showOnMap: course.showOnMap,
    })
    setEditingCourseId(course.id); setTab('courses')
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('Delete this course?')) return
    try { await deleteCourse(id); toast.success('Course deleted') }
    catch { toast.error('Failed to delete course') }
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  function handleColorPicker(hex: string) { setSColor(hex); setSHex(hex) }

  function handleHexInput(raw: string) {
    setSHex(raw)
    const clean = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) setSColor(clean)
  }

  async function handleSaveSettings() {
    try {
      await saveSettings({
        ...settings,
        title: sTitle || 'Staff Travel Hub',
        heading: sHeading || 'Latest Staff Adventures',
        welcome: sWelcome,
        color: sColor,
        password: sPwd || settings.password,
        departureAirport: {
          name: sAirportName.trim().toUpperCase() || 'LHR',
          lat: parseFloat(sAirportLat) || 51.5074,
          lng: parseFloat(sAirportLng) || -0.1278,
        },
      })
      setSPwd(''); toast.success('Settings saved!')
    } catch (err: any) { toast.error(err?.message ?? 'Failed to save settings') }
  }

  async function handleSavePages() {
    try {
      const currentImages: PanelImages = {
        feed: pFeed?.startsWith('https:') ? pFeed : settings.panelImages?.feed ?? null,
        map: pMap?.startsWith('https:') ? pMap : settings.panelImages?.map ?? null,
        courses: pCourses?.startsWith('https:') ? pCourses : settings.panelImages?.courses ?? null,
        years: pYears?.startsWith('https:') ? pYears : settings.panelImages?.years ?? null,
        submit: pSubmit?.startsWith('https:') ? pSubmit : settings.panelImages?.submit ?? null,
      }
      const dataUrls: Partial<Record<keyof PanelImages, string | null>> = {
        ...(pFeed?.startsWith('data:') ? { feed: pFeed } : {}),
        ...(pMap?.startsWith('data:') ? { map: pMap } : {}),
        ...(pCourses?.startsWith('data:') ? { courses: pCourses } : {}),
        ...(pYears?.startsWith('data:') ? { years: pYears } : {}),
        ...(pSubmit?.startsWith('data:') ? { submit: pSubmit } : {}),
      }
      await savePageImages(currentImages, dataUrls)
      toast.success('Page backgrounds saved!')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save pages')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Admin Panel</DialogTitle>
        </DialogHeader>
        <DialogBody className="pt-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="post">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {editingPostId ? 'Edit Post' : 'Post'}
              </TabsTrigger>
              <TabsTrigger value="courses">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                {editingCourseId ? 'Edit Course' : 'Course'}
              </TabsTrigger>
              <TabsTrigger value="manage">
                Manage
                {submissions.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                    {submissions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="pages">
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Pages
              </TabsTrigger>
            </TabsList>

            {/* ── UPLOAD POST ── */}
            <TabsContent value="post" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Trip Photos</Label>
                <MultiImageUpload values={postForm.images} onChange={(imgs) => setPost('images', imgs)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Trip Title <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. Bali Adventure 2026" value={postForm.title} onChange={(e) => setPost('title', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Staff Member <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. Sarah Johnson" value={postForm.staff} onChange={(e) => setPost('staff', e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Profile Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <ImageUpload value={postForm.staffImage} onChange={(v) => setPost('staffImage', v)} />
              </div>

              <div className="space-y-1.5">
                <Label>Review / Description <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Share the experience, highlights, recommendations..."
                  value={postForm.review}
                  onChange={(e) => setPost('review', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Location Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. Bali, Indonesia" value={postForm.locName} onChange={(e) => setPost('locName', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Trip Date</Label>
                  <DatePicker value={postForm.date} onChange={(v) => setPost('date', v)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>📍 Pin on World Map</Label>
                <p className="text-xs text-muted-foreground">Click the map to set a pin</p>
                <LocationPicker lat={postForm.lat} lng={postForm.lng} onPick={(lat, lng) => { setPost('lat', lat); setPost('lng', lng) }} />
                <p className="text-xs text-muted-foreground">
                  {postForm.lat != null ? `📍 ${postForm.lat.toFixed(4)}, ${postForm.lng?.toFixed(4)}` : 'No pin set'}
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Plane className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Flight path animation</p>
                  <p className="text-xs text-muted-foreground">Show animated flight from {settings.departureAirport?.name ?? 'LHR'} when pin is clicked on the map</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPost('showFlightPath', !postForm.showFlightPath)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${postForm.showFlightPath ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${postForm.showFlightPath ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label>Tags <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                <Input placeholder="e.g. beach, culture, adventure" value={postForm.tags} onChange={(e) => setPost('tags', e.target.value)} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setPostForm(emptyPostForm()); setEditingPostId(null) }} disabled={submitting}>Clear</Button>
                <Button onClick={submitPost} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editingPostId ? '💾 Update Post' : '📤 Publish Post'}
                </Button>
              </div>
              {editingPostId && <p className="text-right text-xs text-amber-500">Editing existing post</p>}
            </TabsContent>

            {/* ── ADD COURSE ── */}
            <TabsContent value="courses" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Course Thumbnail <span className="text-destructive">*</span></Label>
                <ImageUpload value={courseForm.image} onChange={(v) => setCourse('image', v)} />
              </div>

              <div className="space-y-1.5">
                <Label>Course Title <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Bali Destination Guide" value={courseForm.title} onChange={(e) => setCourse('title', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea placeholder="Brief overview..." value={courseForm.description} onChange={(e) => setCourse('description', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Rise 360 Course URL <span className="text-destructive">*</span></Label>
                <Input type="url" placeholder="https://rise.articulate.com/share/..." value={courseForm.riseUrl} onChange={(e) => setCourse('riseUrl', e.target.value)} />
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Map className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Show on World Map</p>
                  <p className="text-xs text-muted-foreground">Pin this course on the map</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCourse('showOnMap', !courseForm.showOnMap)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseForm.showOnMap ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${courseForm.showOnMap ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {courseForm.showOnMap && (
                <div className="space-y-1.5">
                  <Label>Location Name</Label>
                  <Input placeholder="e.g. Bali, Indonesia" value={courseForm.locName} onChange={(e) => setCourse('locName', e.target.value)} />
                  <p className="text-xs text-muted-foreground pt-1">Click map to set pin</p>
                  <LocationPicker lat={courseForm.lat} lng={courseForm.lng} onPick={(lat, lng) => { setCourse('lat', lat); setCourse('lng', lng) }} />
                  <p className="text-xs text-muted-foreground">
                    {courseForm.lat != null ? `📍 ${courseForm.lat.toFixed(4)}, ${courseForm.lng?.toFixed(4)}` : 'No pin set'}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setCourseForm(emptyCourseForm()); setEditingCourseId(null) }} disabled={submitting}>Clear</Button>
                <Button onClick={submitCourse} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editingCourseId ? '💾 Update Course' : '📤 Add Course'}
                </Button>
              </div>
              {editingCourseId && <p className="text-right text-xs text-amber-500">Editing existing course</p>}
            </TabsContent>

            {/* ── MANAGE ── */}
            <TabsContent value="manage" className="space-y-6">

              {/* Submissions */}
              {submissions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Pending Submissions ({submissions.length})
                  </h3>
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
                        {sub.images[0] && (
                          <img src={sub.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{sub.name}</p>
                          {sub.location.name && (
                            <p className="text-xs text-muted-foreground">📍 {sub.location.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sub.review}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(sub.date)}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button size="sm" onClick={() => useSubmission(sub)} className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Post
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSubmission(sub.id)} className="text-xs">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr className="border-border mt-4" />
                </div>
              )}

              {/* Posts */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Posts ({posts.length})</h3>
                {posts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No posts yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Photo</th>
                          <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Title</th>
                          <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Staff</th>
                          <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Date</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((p) => (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                            <td className="py-2 px-3">
                              {p.images[0]
                                ? <img src={p.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover" />
                                : <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center text-lg">🌍</div>}
                            </td>
                            <td className="py-2 px-3 font-medium max-w-[140px] truncate">{p.title}</td>
                            <td className="py-2 px-3 hidden sm:table-cell text-muted-foreground">{p.staff}</td>
                            <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">{p.date || '—'}</td>
                            <td className="py-2 px-3">
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="secondary" onClick={() => startEditPost(p)}><Pencil className="h-3 w-3" /></Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeletePost(p.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Courses */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Courses ({courses.length})</h3>
                {courses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No courses yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Thumb</th>
                          <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Title</th>
                          <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Map</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((c) => (
                          <tr key={c.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                            <td className="py-2 px-3">
                              {c.image
                                ? <img src={c.image} alt="" className="w-11 h-11 rounded-lg object-cover" />
                                : <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center text-lg">📖</div>}
                            </td>
                            <td className="py-2 px-3 font-medium max-w-[160px] truncate">{c.title}</td>
                            <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">
                              {c.showOnMap ? '📍 Yes' : '—'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="secondary" onClick={() => startEditCourse(c)}><Pencil className="h-3 w-3" /></Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteCourse(c.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── SETTINGS ── */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Site Title</Label>
                  <Input placeholder="Staff Travel Hub" value={sTitle} onChange={(e) => setSTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Feed Heading</Label>
                  <Input placeholder="Latest Staff Adventures" value={sHeading} onChange={(e) => setSHeading(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Welcome Message</Label>
                <Input placeholder="Explore our team's adventures!" value={sWelcome} onChange={(e) => setSWelcome(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Primary Colour</Label>
                <div className="flex gap-2 flex-wrap">
                  {PALETTE.map((c) => (
                    <button key={c} type="button" onClick={() => handleColorPicker(c)}
                      className={`w-8 h-8 rounded-full transition-all border-2 ${sColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input type="color" value={sColor} onChange={(e) => handleColorPicker(e.target.value)}
                    className="h-10 w-12 rounded-md border border-input cursor-pointer flex-shrink-0" />
                  <Input placeholder="#0077b6" value={sHex} onChange={(e) => handleHexInput(e.target.value)} className="font-mono" maxLength={7} />
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-2">
                <Label>Departure Airport</Label>
                <p className="text-xs text-muted-foreground -mt-1">Origin point for all flight paths on the map</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">IATA Code</Label>
                    <Input
                      placeholder="LHR"
                      value={sAirportName}
                      onChange={(e) => setSAirportName(e.target.value)}
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="51.5074"
                      value={sAirportLat}
                      onChange={(e) => setSAirportLat(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="-0.1278"
                      value={sAirportLng}
                      onChange={(e) => setSAirportLng(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-1.5">
                <Label>New Admin Password <span className="font-normal text-muted-foreground">(leave blank to keep current)</span></Label>
                <Input type="password" placeholder="New password" value={sPwd} onChange={(e) => setSPwd(e.target.value)} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings}>Save Settings</Button>
              </div>
            </TabsContent>

            {/* ── PAGES ── */}
            <TabsContent value="pages" className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Page Backgrounds</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Upload background images for each section on the home page</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Feed</Label>
                  <ImageUpload value={pFeed} onChange={setPFeed} />
                </div>
                <div className="space-y-1.5">
                  <Label>World Map</Label>
                  <ImageUpload value={pMap} onChange={setPMap} />
                </div>
                <div className="space-y-1.5">
                  <Label>Training Courses</Label>
                  <ImageUpload value={pCourses} onChange={setPCourses} />
                </div>
                <div className="space-y-1.5">
                  <Label>By Year</Label>
                  <ImageUpload value={pYears} onChange={setPYears} />
                </div>
                <div className="space-y-1.5">
                  <Label>Submit Trip</Label>
                  <ImageUpload value={pSubmit} onChange={setPSubmit} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePages}>Save Pages</Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
