import { useState, useEffect, useRef } from 'react'
import { COUNTRIES } from '@/lib/countries'
import { toast } from 'sonner'
import { Trash2, Pencil, Loader2, CheckCircle2, X, Eye, Pin, PinOff, MapPin, Plane, Globe, Search, FolderOpen, FileUp, ChevronRight } from 'lucide-react'
import { ReviewExtras } from './ReviewExtras'
import { BlogEditor } from './BlogEditor'
import { parsePdf, type ParsedReview } from '@/lib/parsePdf'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MultiImageUpload } from './MultiImageUpload'
import { ImageUpload } from './ImageUpload'
import { DatePicker } from './DatePicker'
import { useApp } from '@/context/AppContext'
import { today, fmtDate } from '@/lib/utils'
import type { Post, Course, PanelImages, Trip, Location, PostExtras } from '@/lib/types'

const PALETTE = ['#0077b6', '#6366f1', '#ec4899', '#f97316', '#10b981', '#dc2626', '#7c3aed', '#0f766e']

const EMPTY_EXTRAS: PostExtras = { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] }

interface PostForm {
  title: string; staff: string; staffImage: string | null
  review: string; locName: string; locationId: string | null
  date: string; tags: string; images: string[]
  extras: PostExtras; folder: string | null
}


interface CourseForm {
  title: string; description: string; riseUrl: string
  locName: string; locationId: string | null; image: string | null
}

interface TripForm {
  name: string; participants: string; date: string; image: string | null; locationId: string | null; external: boolean
}

interface LocationForm {
  name: string; country: string
}

const emptyPostForm = (): PostForm => ({
  title: '', staff: '', staffImage: null, review: '', locName: '',
  locationId: null, date: today(), tags: '', images: [],
  extras: { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] },
  folder: null,
})

const emptyCourseForm = (): CourseForm => ({
  title: '', description: '', riseUrl: '', locName: '',
  locationId: null, image: null,
})

const emptyTripForm = (): TripForm => ({
  name: '', participants: '', date: today(), image: null, locationId: null, external: false,
})

const emptyLocationForm = (): LocationForm => ({ name: '', country: '' })

interface Props { open: boolean; onOpenChange: (open: boolean) => void; initialPost?: Post }

export function AdminPanel({ open, onOpenChange, initialPost }: Props) {
  const { state, togglePin, addPost, editPost, deletePost, addCourse, editCourse, deleteCourse, deleteSubmission, addTrip, editTrip, deleteTrip, addLocation, editLocation, deleteLocation, saveSettings, savePageImages } = useApp()
  const { posts, courses, submissions, trips, locations, settings } = state

  const [tab, setTab] = useState('post')
  const [postForm, setPostForm] = useState<PostForm>(emptyPostForm())
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm())
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [tripForm, setTripForm] = useState<TripForm>(emptyTripForm())
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocationForm())
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [viewingSubId, setViewingSubId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [manageSearch, setManageSearch] = useState('')
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfReviews, setPdfReviews] = useState<ParsedReview[]>([])
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [manageFolder, setManageFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

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
      if (initialPost) startEditPost(initialPost)
    }
  }, [open])

  function setPost<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setPostForm((f) => ({ ...f, [key]: value }))
  }

  function setCourse<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setCourseForm((f) => ({ ...f, [key]: value }))
  }

  // ── Post ──────────────────────────────────────────────────────────────────

  async function submitPost() {
    if (!postForm.title || !postForm.staff || !postForm.review) {
      toast.error('Title, staff member and review are required'); return
    }
    const id = editingPostId || crypto.randomUUID()
    const existingImages = postForm.images.filter((i) => i.startsWith('https:'))
    const newDataUrls = postForm.images.filter((i) => i.startsWith('data:'))
    const staffImageDataUrl = postForm.staffImage?.startsWith('data:') ? postForm.staffImage : null
    const selectedLocation = locations.find(l => l.id === postForm.locationId)
    const post: Post = {
      id, title: postForm.title, staff: postForm.staff,
      staffImage: postForm.staffImage?.startsWith('https:') ? postForm.staffImage : null,
      review: postForm.review,
      location: { name: selectedLocation?.name ?? postForm.locName, lat: null, lng: null },
      locationId: postForm.locationId,
      date: postForm.date || today(),
      tags: [...new Set(postForm.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))],
      images: existingImages,
      pinned: editingPostId ? (posts.find(p => p.id === editingPostId)?.pinned ?? false) : false,
      extras: postForm.extras ?? EMPTY_EXTRAS,
      userId: null,
      status: 'approved',
      folder: postForm.folder ?? null,
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
      locationId: post.locationId,
      date: post.date || today(), tags: post.tags.join(', '),
      images: post.images,
      extras: post.extras ?? EMPTY_EXTRAS,
      folder: post.folder ?? null,
    })
    setEditingPostId(post.id); setTab('post')
  }

  async function handleDeletePost(id: string) {
    if (!confirm('Delete this post?')) return
    try { await deletePost(id); toast.success('Post deleted') }
    catch { toast.error('Failed to delete post') }
  }

  function useSubmission(sub: typeof submissions[0]) {
    setPostForm({
      title: '', staff: sub.name, staffImage: null,
      review: sub.review, locName: sub.location.name,
      locationId: null,
      date: sub.date || today(), tags: '',
      images: sub.images,
      extras: sub.extras ?? EMPTY_EXTRAS,
      folder: null,
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

  // ── PDF Import ────────────────────────────────────────────────────────────

  async function handlePdfFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file'); return
    }
    setPdfParsing(true)
    try {
      const reviews = await parsePdf(file)
      if (reviews.length === 0) {
        toast.error('No reviews found in this PDF')
      } else {
        setPdfReviews(reviews)
        toast.success(`Found ${reviews.length} review${reviews.length > 1 ? 's' : ''} — click one to load it`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to parse PDF')
    } finally {
      setPdfParsing(false)
    }
  }

  function loadPdfReview(r: ParsedReview) {
    setPostForm({
      title: r.title,
      staff: r.staff,
      staffImage: null,
      review: r.review,
      locName: r.location,
      locationId: null,
      date: r.date,
      tags: '',
      images: r.images,
      extras: { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] },
      folder: null,
    })
    setEditingPostId(null)
    setPdfReviews([])
    toast.success(`Review loaded${r.images.length > 0 ? ` with ${r.images.length} photo${r.images.length > 1 ? 's' : ''}` : ' — add photos then publish'}`)
  }

  // ── Course ────────────────────────────────────────────────────────────────

  async function submitCourse() {
    if (!courseForm.title || !courseForm.riseUrl) {
      toast.error('Course title and Rise URL are required'); return
    }
    const id = editingCourseId || crypto.randomUUID()
    const imageDataUrl = courseForm.image?.startsWith('data:') ? courseForm.image : null
    const selectedLocation = locations.find(l => l.id === courseForm.locationId)
    const course: Course = {
      id, title: courseForm.title, description: courseForm.description || null,
      image: courseForm.image?.startsWith('https:') ? courseForm.image : null,
      riseUrl: courseForm.riseUrl,
      location: { name: selectedLocation?.name ?? courseForm.locName, lat: null, lng: null },
      locationId: courseForm.locationId,
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
      locationId: course.locationId,
      image: course.image,
    })
    setEditingCourseId(course.id); setTab('courses')
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('Delete this course?')) return
    try { await deleteCourse(id); toast.success('Course deleted') }
    catch { toast.error('Failed to delete course') }
  }

  // ── Trips ─────────────────────────────────────────────────────────────────

  function setTrip<K extends keyof TripForm>(key: K, value: TripForm[K]) {
    setTripForm((f) => ({ ...f, [key]: value }))
  }

  async function submitTrip() {
    if (!tripForm.name) { toast.error('Trip name is required'); return }
    const id = editingTripId || crypto.randomUUID()
    const participants = tripForm.participants.split(',').map(s => s.trim()).filter(Boolean)
    const imageDataUrl = tripForm.image?.startsWith('data:') ? tripForm.image : null
    const trip: Trip = {
      id, name: tripForm.name, participants,
      date: tripForm.date || today(),
      image: tripForm.image?.startsWith('https:') ? tripForm.image : null,
      locationId: tripForm.locationId,
      external: tripForm.external,
    }
    setSubmitting(true)
    try {
      if (editingTripId) {
        await editTrip(trip, imageDataUrl); toast.success('Trip updated!')
      } else {
        await addTrip(trip, imageDataUrl); toast.success('Trip added!')
      }
      setTripForm(emptyTripForm()); setEditingTripId(null)
    } catch (err) {
      console.error(err); toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally { setSubmitting(false) }
  }

  function startEditTrip(trip: Trip) {
    setTripForm({
      name: trip.name, participants: trip.participants.join(', '),
      date: trip.date || today(), image: trip.image,
      locationId: trip.locationId ?? null,
      external: trip.external ?? false,
    })
    setEditingTripId(trip.id); setTab('trips')
  }

  async function handleDeleteTrip(id: string) {
    if (!confirm('Delete this trip?')) return
    try { await deleteTrip(id); toast.success('Trip deleted') }
    catch { toast.error('Failed to delete trip') }
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  async function submitLocation() {
    if (!locationForm.name || !locationForm.country) {
      toast.error('Name and country are required'); return
    }
    const id = editingLocationId || crypto.randomUUID()
    const location: Location = { id, name: locationForm.name, country: locationForm.country }
    setSubmitting(true)
    try {
      if (editingLocationId) {
        await editLocation(location); toast.success('Location updated!')
      } else {
        await addLocation(location); toast.success('Location added!')
      }
      setLocationForm(emptyLocationForm()); setEditingLocationId(null)
    } catch (err) {
      console.error(err); toast.error('Something went wrong saving location.')
    } finally { setSubmitting(false) }
  }

  function startEditLocation(loc: Location) {
    setLocationForm({ name: loc.name, country: loc.country })
    setEditingLocationId(loc.id); setTab('locations')
  }

  async function handleDeleteLocation(id: string) {
    if (!confirm('Delete this location? Posts and courses linked to it will be unlinked.')) return
    try { await deleteLocation(id); toast.success('Location deleted') }
    catch { toast.error('Failed to delete location') }
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  function handleColorPicker(hex: string) { setSColor(hex); setSHex(hex) }

  function handleHexInput(raw: string) {
    setSHex(raw)
    const clean = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) setSColor(clean)
  }

  async function handleSaveSettings() {
    if (sPwd && sPwd.length !== 4) {
      toast.error('Admin PIN must be exactly 4 digits')
      return
    }
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
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to save settings') }
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save pages')
    }
  }

  // ── Folders ───────────────────────────────────────────────────────────────

  async function addFolder() {
    const name = newFolderName.trim().toLowerCase()
    if (!name) return
    if (settings.adminFolders.includes(name)) { toast.error('Folder already exists'); return }
    const updated = { ...settings, adminFolders: [...settings.adminFolders, name].sort() }
    try { await saveSettings(updated); setNewFolderName('') }
    catch { toast.error('Failed to save folder') }
  }

  async function removeFolder(name: string) {
    if (!confirm(`Remove folder "${name}"? Posts in it will become unassigned.`)) return
    const updated = { ...settings, adminFolders: settings.adminFolders.filter(f => f !== name) }
    try { await saveSettings(updated); if (manageFolder === name) setManageFolder(null) }
    catch { toast.error('Failed to remove folder') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Admin Panel</DialogTitle>
        </DialogHeader>
        <DialogBody className="pt-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="overflow-x-auto flex-nowrap">
              <TabsTrigger value="post" className="px-3 text-xs">{editingPostId ? 'Edit Post' : 'Post'}</TabsTrigger>
              <TabsTrigger value="courses" className="px-3 text-xs">{editingCourseId ? 'Edit Course' : 'Course'}</TabsTrigger>
              <TabsTrigger value="locations" className="px-3 text-xs">{editingLocationId ? 'Edit Location' : 'Locations'}</TabsTrigger>
              <TabsTrigger value="trips" className="px-3 text-xs">{editingTripId ? 'Edit Trip' : 'Trips'}</TabsTrigger>
              <TabsTrigger value="manage" className="px-3 text-xs">
                Manage
                {submissions.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                    {submissions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="px-3 text-xs">Settings</TabsTrigger>
              <TabsTrigger value="pages" className="px-3 text-xs">Pages</TabsTrigger>
            </TabsList>

            {/* ── UPLOAD POST ── */}
            <TabsContent value="post" className="space-y-4">

              {/* PDF Import */}
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Import from Rise 360 PDF</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs gap-1.5"
                    disabled={pdfParsing}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    {pdfParsing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
                    {pdfParsing ? 'Reading…' : 'Upload PDF'}
                  </Button>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = '' }}
                  />
                </div>
                {pdfReviews.length > 0 && (
                  <div className="space-y-1.5">
                    {pdfReviews.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => loadPdfReview(r)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{r.title || '(no title)'}</p>
                          <p className="text-xs text-muted-foreground">{r.staff} · {r.location}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                <BlogEditor
                  review={postForm.review}
                  images={postForm.images}
                  onReviewChange={(v) => setPost('review', v)}
                />
                <p className="text-xs text-muted-foreground">
                  Photo 1 is always the hero. Click "Insert photo" to place the next photo at that point in the text.
                </p>
              </div>

              {/* ── Extras sections ── */}
              <ReviewExtras value={postForm.extras} onChange={(e) => setPost('extras', e)} />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={postForm.locationId ?? ''}
                    onChange={(e) => {
                      const loc = locations.find(l => l.id === e.target.value)
                      setPost('locationId', e.target.value || null)
                      if (loc) setPost('locName', loc.name)
                    }}
                  >
                    <option value="">— no location —</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}, {l.country}</option>
                    ))}
                  </select>
                  {locations.length === 0 && (
                    <p className="text-xs text-muted-foreground">Add locations in the Locations tab first</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Trip Date</Label>
                  <DatePicker value={postForm.date} onChange={(v) => setPost('date', v)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tags</Label>
                {(() => {
                  const currentTags = postForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
                  const allExisting = [...new Set(posts.flatMap(p => p.tags))].sort()
                  const suggestions = allExisting.filter(t => !currentTags.includes(t))
                  return (
                    <div className="space-y-2">
                      <Input
                        placeholder="Type a tag and press comma or enter"
                        value={postForm.tags}
                        onChange={(e) => setPost('tags', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); setPost('tags', currentTags.join(', ') + (currentTags.length ? ', ' : '')) }
                        }}
                      />
                      {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map(t => (
                            <button key={t} type="button"
                              className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                              onClick={() => setPost('tags', currentTags.length ? currentTags.join(', ') + ', ' + t : t)}
                            >{t}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {settings.adminFolders.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Admin Folder <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={postForm.folder ?? ''}
                    onChange={e => setPost('folder', e.target.value || null)}
                  >
                    <option value="">— no folder —</option>
                    {settings.adminFolders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setPostForm(emptyPostForm()); setEditingPostId(null) }} disabled={submitting}>Clear</Button>
                <Button onClick={submitPost} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editingPostId ? 'Update Post' : 'Publish Post'}
                </Button>
              </div>
              {editingPostId && <p className="text-right text-xs text-amber-500">Editing existing post</p>}
            </TabsContent>

            {/* ── ADD COURSE ── */}
            <TabsContent value="courses" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Course Thumbnail <span className="text-muted-foreground font-normal">(optional)</span></Label>
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

              <div className="space-y-1.5">
                <Label>Location</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={courseForm.locationId ?? ''}
                  onChange={(e) => {
                    const loc = locations.find(l => l.id === e.target.value)
                    setCourse('locationId', e.target.value || null)
                    if (loc) setCourse('locName', loc.name)
                  }}
                >
                  <option value="">— no location —</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}, {l.country}</option>
                  ))}
                </select>
                {locations.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add locations in the Locations tab first</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setCourseForm(emptyCourseForm()); setEditingCourseId(null) }} disabled={submitting}>Clear</Button>
                <Button onClick={submitCourse} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editingCourseId ? 'Update Course' : 'Add Course'}
                </Button>
              </div>
              {editingCourseId && <p className="text-right text-xs text-amber-500">Editing existing course</p>}
            </TabsContent>

            {/* ── LOCATIONS ── */}
            <TabsContent value="locations" className="space-y-4">
              <p className="text-xs text-muted-foreground">Create locations for the world map. Posts and courses are linked to locations — clicking a country on the globe shows all locations for that country.</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Location Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Bali"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country <span className="text-destructive">*</span></Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={locationForm.country}
                    onChange={(e) => setLocationForm(f => ({ ...f, country: e.target.value }))}
                  >
                    <option value="">— select country —</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setLocationForm(emptyLocationForm()); setEditingLocationId(null) }} disabled={submitting}>Clear</Button>
                <Button onClick={submitLocation} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editingLocationId ? 'Update Location' : 'Add Location'}
                </Button>
              </div>
              {editingLocationId && <p className="text-right text-xs text-amber-500">Editing existing location</p>}

              {locations.length > 0 && (
                <>
                  <hr className="border-border" />
                  <h3 className="font-semibold text-sm">All Locations ({locations.length})</h3>
                  <div className="space-y-2">
                    {locations.map(loc => {
                      const pCount = posts.filter(p => p.locationId === loc.id).length
                      const cCount = courses.filter(c => c.locationId === loc.id).length
                      return (
                        <div key={loc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{loc.name}</p>
                            <p className="text-xs text-muted-foreground">{loc.country} · {pCount} post{pCount !== 1 ? 's' : ''} · {cCount} course{cCount !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <Button size="sm" variant="secondary" onClick={() => startEditLocation(loc)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteLocation(loc.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── TRIPS ── */}
            <TabsContent value="trips" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Trip Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <ImageUpload value={tripForm.image} onChange={(v) => setTrip('image', v)} />
              </div>

              <div className="space-y-1.5">
                <Label>Trip Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Bali Retreat 2026" value={tripForm.name} onChange={(e) => setTrip('name', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Participants <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                <Input placeholder="e.g. Sarah Johnson, Mike Smith" value={tripForm.participants} onChange={(e) => setTrip('participants', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Date</Label>
                <DatePicker value={tripForm.date} onChange={(v) => setTrip('date', v)} />
              </div>

              <div className="space-y-1.5">
                <Label>Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <select
                  value={tripForm.locationId ?? ''}
                  onChange={(e) => setTrip('locationId', e.target.value || null)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— No location —</option>
                  {[...locations].sort((a, b) => a.name.localeCompare(b.name)).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.country})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="trip-external"
                  type="checkbox"
                  checked={tripForm.external}
                  onChange={(e) => setTrip('external', e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <label htmlFor="trip-external" className="text-sm font-medium select-none cursor-pointer">
                  External trip
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setTripForm(emptyTripForm()); setEditingTripId(null) }} disabled={submitting}>Clear</Button>
                <Button onClick={submitTrip} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editingTripId ? 'Update Trip' : 'Add Trip'}
                </Button>
              </div>
              {editingTripId && <p className="text-right text-xs text-amber-500">Editing existing trip</p>}

              {trips.length > 0 && (
                <>
                  <hr className="border-border" />
                  <h3 className="font-semibold text-sm">All Trips ({trips.length})</h3>
                  <div className="space-y-2">
                    {[...trips].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                        {t.image
                          ? <img src={t.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                          : <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Plane className="h-5 w-5 text-primary/50" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm truncate">{t.name}</p>
                            {t.external && <span className="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-1.5 py-0.5 flex-shrink-0">External</span>}
                          </div>
                          {t.participants.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">{t.participants.join(', ')}</p>
                          )}
                          {t.locationId && (() => { const loc = locations.find(l => l.id === t.locationId); return loc ? <p className="text-xs text-primary truncate flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" />{loc.name}</p> : null })()}
                          {t.date && <p className="text-xs text-muted-foreground">{fmtDate(t.date)}</p>}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <Button size="sm" variant="secondary" onClick={() => startEditTrip(t)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteTrip(t.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── MANAGE ── */}
            <TabsContent value="manage" className="space-y-5">
              {/* Search + Folder filter */}
              {(() => {
                const adminFolders = settings.adminFolders ?? []
                const q = manageSearch.toLowerCase()
                const filteredPosts = posts.filter(p => {
                  const matchFolder = manageFolder === null
                    ? true
                    : manageFolder === '__none__'
                      ? !p.folder
                      : p.folder === manageFolder
                  const matchSearch = !q || p.title.toLowerCase().includes(q) || p.staff.toLowerCase().includes(q) || p.location.name.toLowerCase().includes(q)
                  return matchFolder && matchSearch
                })
                const filteredCourses = courses.filter(c => {
                  const matchSearch = !q || c.title.toLowerCase().includes(q) || (c.location.name ?? '').toLowerCase().includes(q)
                  return matchSearch
                })
                return (
                  <>
                    {/* Folder management */}
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Folders</p>
                      <div className="flex flex-wrap gap-1.5">
                        {adminFolders.map(f => (
                          <span key={f} className="flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-0.5 text-xs">
                            <FolderOpen className="h-3 w-3 text-muted-foreground" />
                            {f}
                            <button onClick={() => removeFolder(f)} className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        {adminFolders.length === 0 && (
                          <span className="text-xs text-muted-foreground">No folders yet</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New folder name…"
                          value={newFolderName}
                          onChange={e => setNewFolderName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addFolder()}
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Button size="sm" onClick={addFolder} disabled={!newFolderName.trim()}>Add</Button>
                      </div>
                    </div>

                    {/* Search bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="search"
                        placeholder="Search posts, staff, destinations…"
                        value={manageSearch}
                        onChange={e => setManageSearch(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    {/* Folder filter chips */}
                    {adminFolders.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setManageFolder(null)}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            manageFolder === null
                              ? 'btn-gradient text-white'
                              : 'bg-muted border border-border text-muted-foreground hover:border-primary hover:text-primary'
                          }`}
                        >
                          All
                        </button>
                        {adminFolders.map(f => (
                          <button
                            key={f}
                            onClick={() => setManageFolder(manageFolder === f ? null : f)}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              manageFolder === f
                                ? 'btn-gradient text-white'
                                : 'bg-muted border border-border text-muted-foreground hover:border-primary hover:text-primary'
                            }`}
                          >
                            <FolderOpen className="h-3 w-3" />
                            {f}
                          </button>
                        ))}
                        <button
                          onClick={() => setManageFolder(manageFolder === '__none__' ? null : '__none__')}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            manageFolder === '__none__'
                              ? 'btn-gradient text-white'
                              : 'bg-muted border border-border text-muted-foreground hover:border-primary hover:text-primary'
                          }`}
                        >
                          Unassigned
                        </button>
                      </div>
                    )}

                    {/* Pending Submissions */}
                    {submissions.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          Pending Submissions ({submissions.length})
                        </h3>
                        <div className="space-y-3">
                          {submissions.map((sub) => (
                            <div key={sub.id} className="rounded-xl border border-border/60 overflow-hidden">
                              <div className="flex items-start gap-3 p-3 bg-muted/40">
                                {sub.images[0]
                                  ? <img src={sub.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                  : <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Globe className="h-5 w-5 text-muted-foreground/50" /></div>
                                }
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">{sub.name}</p>
                                  {sub.location.name && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" />{sub.location.name}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sub.review}</p>
                                  <p className="text-xs text-muted-foreground">{fmtDate(sub.date)}</p>
                                </div>
                                <div className="flex flex-col gap-1.5 flex-shrink-0">
                                  <Button size="sm" onClick={() => useSubmission(sub)} className="gap-1 text-xs">
                                    <CheckCircle2 className="h-3 w-3" /> Post
                                  </Button>
                                  <Button
                                    size="sm" variant="secondary"
                                    onClick={() => setViewingSubId(viewingSubId === sub.id ? null : sub.id)}
                                    className="text-xs gap-1"
                                  >
                                    {viewingSubId === sub.id ? <X className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteSubmission(sub.id)} className="text-xs">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {viewingSubId === sub.id && (
                                <div className="border-t border-border bg-background">
                                  {/* Hero image */}
                                  {sub.images[0] && (
                                    <img src={sub.images[0]} alt="" className="w-full aspect-video object-cover" />
                                  )}
                                  <div className="p-4 space-y-4">
                                    {/* Meta */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                      {sub.location.name && (
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{sub.location.name}</span>
                                      )}
                                      {sub.date && <span>{fmtDate(sub.date)}</span>}
                                    </div>
                                    {/* Review text */}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">{sub.review}</p>
                                    {/* Remaining images */}
                                    {sub.images.length > 1 && (
                                      <div className="flex gap-2 overflow-x-auto pb-1">
                                        {sub.images.slice(1).map((img, i) => (
                                          <img key={i} src={img} alt="" className="h-24 w-24 flex-shrink-0 rounded-xl object-cover border border-border" />
                                        ))}
                                      </div>
                                    )}
                                    {/* Extras summary */}
                                    {sub.extras && Object.values(sub.extras).some(arr => arr.length > 0) && (
                                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ratings submitted</p>
                                        {(['airlines','hotels','cruises','activities','dmcs'] as const).map(key => {
                                          const items = sub.extras?.[key] ?? []
                                          if (!items.length) return null
                                          return (
                                            <div key={key} className="text-xs text-muted-foreground">
                                              <span className="font-medium capitalize text-foreground">{key}</span>: {items.map(i => `${i.name} (${'★'.repeat(i.rating)})`).join(', ')}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                    <Button size="sm" onClick={() => { useSubmission(sub); setViewingSubId(null) }} className="gap-1 w-full">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Use this submission → Post tab
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <hr className="border-border mt-4" />
                      </div>
                    )}

                    {/* Posts */}
                    <div>
                      <h3 className="font-semibold text-sm mb-2">
                        Posts ({filteredPosts.length}{filteredPosts.length !== posts.length ? ` of ${posts.length}` : ''})
                      </h3>
                      {filteredPosts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">
                          {posts.length === 0 ? 'No posts yet' : 'No posts match your search'}
                        </p>
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
                              {filteredPosts.map((p) => (
                                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                                  <td className="py-2 px-3">
                                    {p.images[0]
                                      ? <img src={p.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover" />
                                      : <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center"><Globe className="h-5 w-5 text-muted-foreground/50" /></div>}
                                  </td>
                                  <td className="py-2 px-3 font-medium max-w-[140px] truncate">{p.title}</td>
                                  <td className="py-2 px-3 hidden sm:table-cell text-muted-foreground">{p.staff}</td>
                                  <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">{p.date || '—'}</td>
                                  <td className="py-2 px-3">
                                    <div className="flex gap-1.5">
                                      <Button size="sm" variant={p.pinned ? 'default' : 'secondary'} onClick={() => togglePin(p.id, !p.pinned)} title={p.pinned ? 'Unpin' : 'Pin to top'}>
                                        {p.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                      </Button>
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
                      <h3 className="font-semibold text-sm mb-2">
                        Courses ({filteredCourses.length}{filteredCourses.length !== courses.length ? ` of ${courses.length}` : ''})
                      </h3>
                      {filteredCourses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">
                          {courses.length === 0 ? 'No courses yet' : 'No courses match your search'}
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Thumb</th>
                                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Title</th>
                                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Location</th>
                                <th className="py-2 px-3" />
                              </tr>
                            </thead>
                            <tbody>
                              {filteredCourses.map((c) => (
                                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                                  <td className="py-2 px-3">
                                    {c.image
                                      ? <img src={c.image} alt="" className="w-11 h-11 rounded-lg object-cover" />
                                      : <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center text-lg">📖</div>}
                                  </td>
                                  <td className="py-2 px-3 font-medium max-w-[160px] truncate">{c.title}</td>
                                  <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">
                                    {c.locationId ? locations.find(l => l.id === c.locationId)?.name ?? '—' : '—'}
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
                  </>
                )
              })()}
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
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">IATA Code</Label>
                    <Input placeholder="LHR" value={sAirportName} onChange={(e) => setSAirportName(e.target.value)} maxLength={4} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Latitude</Label>
                    <Input type="number" step="0.0001" placeholder="51.5074" value={sAirportLat} onChange={(e) => setSAirportLat(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Longitude</Label>
                    <Input type="number" step="0.0001" placeholder="-0.1278" value={sAirportLng} onChange={(e) => setSAirportLng(e.target.value)} />
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-1.5">
                <Label>New Admin PIN <span className="font-normal text-muted-foreground">(4 digits — leave blank to keep current)</span></Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={sPwd}
                  onChange={(e) => setSPwd(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
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
                {(['feed','map','courses','years','submit'] as const).map(key => {
                  const labels = { feed: 'Feed', map: 'World Map', courses: 'Training Courses', years: 'By Year', submit: 'Submit Trip' }
                  const vals = { feed: pFeed, map: pMap, courses: pCourses, years: pYears, submit: pSubmit }
                  const setters = { feed: setPFeed, map: setPMap, courses: setPCourses, years: setPYears, submit: setPSubmit }
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label>{labels[key]}</Label>
                      <ImageUpload value={vals[key]} onChange={setters[key]} />
                    </div>
                  )
                })}
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
