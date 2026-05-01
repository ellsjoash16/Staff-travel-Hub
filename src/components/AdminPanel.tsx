import { useState, useEffect, useRef } from 'react'
import { COUNTRIES } from '@/lib/countries'
import { toast } from 'sonner'
import { Trash2, Pencil, Loader2, CheckCircle2, X, Eye, Pin, PinOff, MapPin, Plane, Globe, Search, FolderOpen, FileUp, ChevronRight, CalendarDays, Plus, KeyRound, Users, RefreshCw, ShieldCheck } from 'lucide-react'
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
import type { Post, Trip, Location, PostExtras } from '@/lib/types'


const EMPTY_EXTRAS: PostExtras = { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] }

interface PostForm {
  title: string; staff: string; staffImage: string | null
  review: string; locName: string; locationId: string | null
  date: string; tags: string; images: string[]
  extras: PostExtras; salesNote: string; folder: string | null
}


interface TripForm {
  name: string; description: string; participants: string; date: string; image: string | null; locationId: string | null; external: boolean; international: boolean; showRegisterInterest: boolean; completed: boolean
}

interface LocationForm {
  name: string; country: string
}

const emptyPostForm = (): PostForm => ({
  title: '', staff: '', staffImage: null, review: '', locName: '',
  locationId: null, date: today(), tags: '', images: [],
  extras: { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] },
  salesNote: '', folder: null,
})

const emptyTripForm = (): TripForm => ({
  name: '', description: '', participants: '', date: today(), image: null, locationId: null, external: false, international: false, showRegisterInterest: false, completed: false,
})

const emptyLocationForm = (): LocationForm => ({ name: '', country: '' })

interface Props { open?: boolean; onOpenChange?: (open: boolean) => void; initialPost?: Post; inline?: boolean }

export function AdminPanel({ open = false, onOpenChange, initialPost, inline = false }: Props) {
  const { state, togglePin, addPost, editPost, deletePost, deleteSubmission, addTrip, editTrip, deleteTrip, addLocation, editLocation, deleteLocation, saveSettings, completeTrip, loadRegistrations, setRegistrationStatus, removeRegistration, removeUserProfile, loadUserProfiles, toggleAdminUid } = useApp()
  const { posts, courses, submissions, trips, locations, settings, registrations, userProfiles } = state

  const [tab, setTab] = useState('post')
  const [postForm, setPostForm] = useState<PostForm>(emptyPostForm())
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
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

  const [sPwd, setSPwd] = useState('')


  const [usersLoaded, setUsersLoaded] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [expandedRegTrip, setExpandedRegTrip] = useState<string | null>(null)

  useEffect(() => {
    if (open || inline) {
      setSPwd('')
      if (initialPost) startEditPost(initialPost)
      loadRegistrations().catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inline])

  async function handleLoadUsers() {
    setUsersLoading(true)
    try { await loadUserProfiles(); setUsersLoaded(true) }
    catch { toast.error('Failed to load users') }
    finally { setUsersLoading(false) }
  }

  function setPost<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setPostForm((f) => ({ ...f, [key]: value }))
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
      salesNote: postForm.salesNote.trim() || null,
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
      salesNote: post.salesNote ?? '',
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
      salesNote: sub.salesNote ?? '',
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
      salesNote: '',
      folder: null,
    })
    setEditingPostId(null)
    setPdfReviews([])
    toast.success(`Review loaded${r.images.length > 0 ? ` with ${r.images.length} photo${r.images.length > 1 ? 's' : ''}` : ' — add photos then publish'}`)
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
      id, name: tripForm.name,
      description: tripForm.description.trim() || null,
      participants,
      date: tripForm.date || today(),
      image: tripForm.image?.startsWith('https:') ? tripForm.image : null,
      locationId: tripForm.locationId,
      external: tripForm.external,
      international: tripForm.international,
      showRegisterInterest: tripForm.showRegisterInterest,
      completed: tripForm.completed,
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
      name: trip.name,
      description: trip.description ?? '',
      participants: trip.participants.join(', '),
      date: trip.date || today(), image: trip.image,
      locationId: trip.locationId ?? null,
      external: trip.external ?? false,
      international: trip.international ?? false,
      showRegisterInterest: trip.showRegisterInterest ?? false,
      completed: trip.completed ?? false,
    })
    setEditingTripId(trip.id); setTab('trips')
  }

  async function handleDeleteTrip(id: string) {
    if (!confirm('Delete this trip?')) return
    try { await deleteTrip(id); toast.success('Trip deleted') }
    catch { toast.error('Failed to delete trip') }
  }

  async function handleTripComplete(trip: Trip) {
    if (!confirm(`Mark "${trip.name}" as complete? It will move to the By Year tab.`)) return
    try {
      await completeTrip(trip)
      toast.success('Trip marked complete — now visible in By Year tab')
    } catch (err) {
      console.error(err); toast.error('Failed to complete trip')
    }
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

  async function handleSaveSettings() {
    if (!sPwd) { toast.error('Enter a new PIN'); return }
    if (sPwd.length !== 4) { toast.error('PIN must be exactly 4 digits'); return }
    try {
      await saveSettings({ ...settings, password: sPwd })
      setSPwd(''); toast.success('PIN updated!')
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to save') }
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

  const tabsContent = (
          <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === 'registrations') loadRegistrations() }}>
            <TabsList className="overflow-x-auto flex-nowrap">
              <TabsTrigger value="post" className="px-3 text-xs">{editingPostId ? 'Edit Post' : 'Post'}</TabsTrigger>
              <TabsTrigger value="locations" className="px-3 text-xs">{editingLocationId ? 'Edit Location' : 'Locations'}</TabsTrigger>
              <TabsTrigger value="trips" className="px-3 text-xs">{editingTripId ? 'Edit Trip' : 'Upcoming Trips'}</TabsTrigger>
              <TabsTrigger value="years" className="px-3 text-xs">By Year</TabsTrigger>
              <TabsTrigger value="registrations" className="px-3 text-xs">
                Registrations
                {registrations.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">{registrations.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="manage" className="px-3 text-xs">
                Manage
                {submissions.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                    {submissions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="px-3 text-xs">
                Users
                {userProfiles.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">{userProfiles.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="px-3 text-xs">Settings</TabsTrigger>
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

              <div className="space-y-1.5">
                <Label>Sales Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="Internal sales note — tips, highlights or talking points for the sales team…"
                  value={postForm.salesNote}
                  onChange={(e) => setPost('salesNote', e.target.value)}
                  rows={3}
                />
              </div>

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
                <Label>Short Description <span className="text-muted-foreground font-normal">(shown on upcoming trips page)</span></Label>
                <Textarea placeholder="e.g. A 7-night luxury retreat in Bali covering beach resorts, culture and cuisine…" value={tripForm.description} onChange={(e) => setTrip('description', e.target.value)} rows={3} />
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

              <div className="flex flex-wrap gap-4">
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
                <div className="flex items-center gap-2">
                  <input
                    id="trip-international"
                    type="checkbox"
                    checked={tripForm.international}
                    onChange={(e) => setTrip('international', e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <label htmlFor="trip-international" className="text-sm font-medium select-none cursor-pointer">
                    International
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="trip-completed"
                    type="checkbox"
                    checked={tripForm.completed}
                    onChange={(e) => setTrip('completed', e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <label htmlFor="trip-completed" className="text-sm font-medium select-none cursor-pointer">
                    Mark as completed
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="trip-register-interest"
                    type="checkbox"
                    checked={tripForm.showRegisterInterest}
                    onChange={(e) => setTrip('showRegisterInterest', e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <label htmlFor="trip-register-interest" className="text-sm font-medium select-none cursor-pointer">
                    Show Register Interest
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setTripForm(emptyTripForm()); setEditingTripId(null) }} disabled={submitting}>Clear</Button>
                <Button onClick={submitTrip} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editingTripId ? 'Update Trip' : 'Add Trip'}
                </Button>
              </div>
              {editingTripId && <p className="text-right text-xs text-amber-500">Editing existing trip</p>}

              {trips.filter(t => !t.completed).length > 0 && (
                <>
                  <hr className="border-border" />
                  <h3 className="font-semibold text-sm">Upcoming Trips ({trips.filter(t => !t.completed).length})</h3>
                  <div className="space-y-2">
                    {[...trips].filter(t => !t.completed).sort((a, b) => a.date.localeCompare(b.date)).map(t => (
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
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => startEditTrip(t)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteTrip(t.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[11px] gap-1" onClick={() => handleTripComplete(t)}>
                            <CheckCircle2 className="h-3 w-3" /> Trip Complete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── BY YEAR ── */}
            <TabsContent value="years" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Manually add past trips directly to the By Year view</p>
                <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={() => {
                  setTripForm({ ...emptyTripForm(), completed: true })
                  setEditingTripId(null)
                  setTab('trips')
                }}>
                  <Plus className="h-3.5 w-3.5" /> Add Past Trip
                </Button>
              </div>
              {(() => {
                const completedTrips = [...trips].filter(t => t.completed).sort((a, b) => b.date.localeCompare(a.date))
                if (completedTrips.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <CalendarDays className="h-10 w-10 text-primary/30 mb-3" />
                      <p className="text-sm font-medium text-foreground">No completed trips yet</p>
                      <p className="text-xs text-center mt-1">Add a past trip using the button above, or mark upcoming trips as complete</p>
                    </div>
                  )
                }
                const years = [...new Set(completedTrips.map(t => t.date?.slice(0, 4) || 'Unknown'))].sort((a, b) => b.localeCompare(a))
                return (
                  <>
                    <p className="text-sm text-muted-foreground">{completedTrips.length} completed trip{completedTrips.length !== 1 ? 's' : ''}</p>
                    {years.map(year => {
                      const yearTrips = completedTrips.filter(t => (t.date?.slice(0, 4) || 'Unknown') === year)
                      return (
                        <div key={year}>
                          <h3 className="font-gilbert text-base mb-2 text-foreground">{year}</h3>
                          <div className="space-y-2">
                            {yearTrips.map(t => {
                              const loc = t.locationId ? locations.find(l => l.id === t.locationId) : null
                              return (
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
                                    {loc && <p className="text-xs text-primary flex items-center gap-1 mt-0.5 truncate"><MapPin className="h-3 w-3 flex-shrink-0" />{loc.name}</p>}
                                    {t.participants.length > 0 && <p className="text-xs text-muted-foreground truncate">{t.participants.join(', ')}</p>}
                                    {t.date && <p className="text-xs text-muted-foreground">{fmtDate(t.date)}</p>}
                                  </div>
                                  <div className="flex gap-1.5 flex-shrink-0">
                                    <Button size="sm" variant="secondary" onClick={() => { startEditTrip(t); setTab('trips') }}><Pencil className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteTrip(t.id)}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
            </TabsContent>

            {/* ── REGISTRATIONS ── */}
            <TabsContent value="registrations" className="p-0 mt-0">
              {(() => {
                const STATUS_LABELS: Record<string, string> = {
                  requested: 'Requested',
                  pending_confirmation: 'Pending Confirmation',
                  confirmed: 'Confirmed',
                  refused: 'Refused',
                }
                const STATUS_STYLES: Record<string, string> = {
                  requested: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                  pending_confirmation: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                  refused: 'bg-destructive/10 text-destructive border-destructive/20',
                }

                const BG_REG = 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=1920&q=80'
                const todayStr = new Date().toISOString().slice(0, 10)
                const upcomingTrips = trips
                  .filter(t => t.date >= todayStr && !t.completed)
                  .sort((a, b) => a.date.localeCompare(b.date))

                const regsByTrip = new Map<string, typeof registrations>()
                for (const r of registrations) {
                  if (!regsByTrip.has(r.tripId)) regsByTrip.set(r.tripId, [])
                  regsByTrip.get(r.tripId)!.push(r)
                }

                function getLocation(locationId: string | null) {
                  return locationId ? (locations.find(l => l.id === locationId) ?? null) : null
                }

                // ── Detail page ──────────────────────────────────────────────
                if (expandedRegTrip) {
                  const trip = trips.find(t => t.id === expandedRegTrip)
                  const items = regsByTrip.get(expandedRegTrip) ?? []
                  const loc = trip ? getLocation(trip.locationId) : null
                  return (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <button onClick={() => setExpandedRegTrip(null)}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <ChevronRight className="h-4 w-4 rotate-180" /> Back
                        </button>
                      </div>

                      {trip && (
                        <div className="rounded-2xl overflow-hidden bg-card border border-border/60">
                          <div className="flex gap-3 p-3 items-center">
                            {trip.image
                              ? <img src={trip.image} alt={trip.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                              : <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Plane className="h-6 w-6 text-primary/40" /></div>
                            }
                            <div className="min-w-0">
                              <h3 className="font-gilbert text-lg leading-tight">{trip.name}</h3>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                {loc && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.name}</span>}
                                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(trip.date + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground">{items.length} registration{items.length !== 1 ? 's' : ''}</p>

                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Users className="h-8 w-8 mb-2 opacity-30" />
                          <p className="text-sm">No registrations for this trip yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {items.map(r => (
                            <div key={r.id} className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-sm">{r.firstName} {r.lastName}</p>
                                  {r.email && <p className="text-xs text-muted-foreground mt-0.5">{r.email}</p>}
                                  {r.passportNumber && <p className="text-xs text-muted-foreground mt-0.5">Passport: {r.passportNumber}</p>}
                                  {r.passportFirstName && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {r.passportFirstName}{r.passportMiddleNames ? ` ${r.passportMiddleNames}` : ''} {r.passportLastName}
                                      {r.dob ? ` · DOB: ${new Date(r.dob).toLocaleDateString('en-GB')}` : ''}
                                    </p>
                                  )}
                                  {r.medicalInfo && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Medical: {r.medicalInfo}</p>}
                                  {r.dataConsent && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Data consent</p>}
                                </div>
                                <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}>
                                  {STATUS_LABELS[r.status]}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(['requested', 'pending_confirmation', 'confirmed', 'refused'] as const).map(s => (
                                  <button key={s} onClick={() => setRegistrationStatus(r.id, s)} disabled={r.status === s}
                                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors disabled:opacity-40 disabled:cursor-default ${r.status === s ? STATUS_STYLES[s] : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}>
                                    {STATUS_LABELS[s]}
                                  </button>
                                ))}
                                <button onClick={() => { if (confirm('Delete this registration?')) removeRegistration(r.id) }}
                                  className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                // ── Trip list page ───────────────────────────────────────────
                const [featured, ...rest] = upcomingTrips

                return (
                  <div className="relative min-h-[400px]">
                    <div className="absolute inset-0 overflow-hidden rounded-b-lg pointer-events-none">
                      <div style={{ position:'absolute', inset:0, backgroundImage:`url(${BG_REG})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(14px) brightness(0.4) saturate(1.1)', transform:'scale(1.1)' }} />
                    </div>

                    <div className="relative p-4 space-y-4" style={{ zIndex: 1 }}>
                      <p className="text-white/70 text-xs">{registrations.length} registration{registrations.length !== 1 ? 's' : ''} across {upcomingTrips.length} upcoming trip{upcomingTrips.length !== 1 ? 's' : ''}</p>

                      {upcomingTrips.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-white/60">
                          <Plane className="h-10 w-10 mb-3 opacity-40" />
                          <p className="text-sm font-medium text-white">No upcoming trips</p>
                        </div>
                      )}

                      {featured && (() => {
                        const loc = getLocation(featured.locationId)
                        const regs = regsByTrip.get(featured.id) ?? []
                        return (
                          <div className="rounded-2xl overflow-hidden bg-card shadow-lg">
                            <div className="flex flex-col sm:flex-row min-h-[180px]">
                              <div className="relative sm:w-2/5 flex-shrink-0 min-h-[140px] sm:min-h-0">
                                {featured.image
                                  ? <img src={featured.image} alt={featured.name} className="absolute inset-0 w-full h-full object-cover" />
                                  : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><Plane className="h-10 w-10 text-primary/30" /></div>
                                }
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">Next Trip</div>
                              </div>
                              <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                                <div>
                                  <h3 className="font-gilbert text-lg leading-tight mb-1">{featured.name}</h3>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                    {loc && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.name}</span>}
                                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(featured.date + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
                                  </div>
                                </div>
                                <button onClick={() => setExpandedRegTrip(featured.id)}
                                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors self-start">
                                  <Users className="h-4 w-4" />
                                  Registrations ({regs.length})
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {rest.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {rest.map(trip => {
                            const loc = getLocation(trip.locationId)
                            const regs = regsByTrip.get(trip.id) ?? []
                            return (
                              <div key={trip.id} className="rounded-2xl overflow-hidden bg-card shadow-sm flex flex-col">
                                <div className="relative w-full h-32 flex-shrink-0">
                                  {trip.image
                                    ? <img src={trip.image} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
                                    : <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center"><Plane className="h-8 w-8 text-primary/25" /></div>
                                  }
                                </div>
                                <div className="flex-1 p-3 flex flex-col gap-2">
                                  <div>
                                    <h3 className="font-gilbert text-base leading-tight mb-0.5">{trip.name}</h3>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                      {loc && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.name}</span>}
                                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(trip.date + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
                                    </div>
                                  </div>
                                  <button onClick={() => setExpandedRegTrip(trip.id)}
                                    className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors self-start">
                                    <Users className="h-3.5 w-3.5" />
                                    Registrations ({regs.length})
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
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

                  </>
                )
              })()}
            </TabsContent>

            {/* ── USERS ── */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Search by email address…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Button size="sm" variant="secondary" className="gap-1.5 flex-shrink-0" onClick={handleLoadUsers} disabled={usersLoading}>
                  {usersLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {usersLoaded ? 'Refresh' : 'Load Users'}
                </Button>
              </div>

              {!usersLoaded ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="h-10 w-10 text-primary/30 mb-3" />
                  <p className="text-sm font-medium text-foreground">User accounts</p>
                  <p className="text-xs mt-1 text-center">Click "Load Users" to fetch all registered accounts</p>
                </div>
              ) : (() => {
                const q = userSearch.toLowerCase()
                const emailMatchUids = q
                  ? new Set(registrations.filter(r => r.email.toLowerCase().includes(q)).map(r => r.uid).filter(Boolean) as string[])
                  : null
                const filtered = userProfiles.filter(u =>
                  !q || emailMatchUids?.has(u.uid)
                )

                if (filtered.length === 0) return (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {userProfiles.length === 0 ? 'No registered users yet' : 'No users match your search'}
                  </p>
                )

                return (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? 's' : ''}{filtered.length !== userProfiles.length ? ` of ${userProfiles.length}` : ''}</p>
                    {filtered.map(u => {
                      const isExpanded = expandedUser === u.uid
                      const userRegistrations = registrations.filter(r => r.uid === u.uid)
                      return (
                        <div key={u.uid} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                          <button
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                            onClick={() => setExpandedUser(isExpanded ? null : u.uid)}
                          >
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {(u.firstName?.[0] || u.authDisplayName?.[0] || u.authEmail?.[0] || '?').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.authDisplayName || 'No name yet')}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {u.authEmail ?? registrations.find(r => r.uid === u.uid)?.email ?? ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {(settings.adminUids ?? []).includes(u.uid) && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Admin</span>
                              )}
                              {u.dataConsent && <span title="Data consent given"><ShieldCheck className="h-4 w-4 text-emerald-500" /></span>}
                              {userRegistrations.length > 0 && (
                                <span className="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">{userRegistrations.length} trip{userRegistrations.length !== 1 ? 's' : ''}</span>
                              )}
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border/60 px-4 py-4 space-y-4 bg-muted/20">
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Full name</p>
                                  <p className="font-medium">{u.firstName} {u.lastName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Date of birth</p>
                                  <p className="font-medium">{u.dob ? new Date(u.dob).toLocaleDateString('en-GB') : '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Passport name</p>
                                  <p className="font-medium">{u.passportFirstName} {u.passportMiddleNames ? `${u.passportMiddleNames} ` : ''}{u.passportLastName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Passport number</p>
                                  <p className="font-medium font-mono">{u.passportNumber || '—'}</p>
                                </div>
                                {u.medicalInfo && (
                                  <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground mb-0.5">Medical info</p>
                                    <p className="font-medium text-amber-600 dark:text-amber-400">{u.medicalInfo}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Admin access</p>
                                  <p className={`font-medium text-sm ${(settings.adminUids ?? []).includes(u.uid) ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {(settings.adminUids ?? []).includes(u.uid) ? '✓ Admin' : 'No'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Data consent</p>
                                  <p className={`font-medium text-sm ${u.dataConsent ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                    {u.dataConsent ? '✓ Consented' : 'Not given'}
                                  </p>
                                </div>
                              </div>

                              {userRegistrations.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Trip Registrations</p>
                                  <div className="space-y-1.5">
                                    {userRegistrations.map(r => (
                                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-card border border-border/60 px-3 py-2 text-sm">
                                        <span className="font-medium truncate">{r.tripName}</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                          r.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                          r.status === 'pending_confirmation' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                          r.status === 'refused' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                          'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                        }`}>{r.status.replace('_', ' ')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="text-[10px] text-muted-foreground font-mono">UID: {u.uid}</p>
                              <div className="flex items-center justify-between gap-2 pt-1">
                                {(() => {
                                  const isUserAdmin = (settings.adminUids ?? []).includes(u.uid)
                                  return (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={isUserAdmin ? 'secondary' : 'default'}
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try {
                                          await toggleAdminUid(u.uid)
                                          toast.success(isUserAdmin ? 'Admin access revoked' : 'Admin access granted')
                                        } catch {
                                          toast.error('Failed to update admin access')
                                        }
                                      }}
                                      className="gap-1.5"
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      {isUserAdmin ? 'Revoke Admin Access' : 'Grant Admin Access'}
                                    </Button>
                                  )
                                })()}
                                <Button
                                  size="sm" variant="destructive"
                                  onClick={() => { if (confirm(`Delete account for ${u.firstName} ${u.lastName}? This removes their saved profile but not their login.`)) removeUserProfile(u.uid) }}
                                  className="gap-1.5"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete Profile
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </TabsContent>

            {/* ── SETTINGS ── */}
            <TabsContent value="settings" className="space-y-3">
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Security</p>
                    <p className="text-xs text-muted-foreground">Change the admin PIN — leave blank to keep existing</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="max-w-[180px] space-y-1.5">
                    <Label>New Admin PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={sPwd}
                      onChange={(e) => setSPwd(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="font-mono tracking-[0.5em] text-center text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1 pb-1">
                <Button onClick={handleSaveSettings} className="px-6">Save PIN</Button>
              </div>
            </TabsContent>

          </Tabs>
  )

  if (inline) return tabsContent

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Admin Panel</DialogTitle>
        </DialogHeader>
        <DialogBody className="pt-2">
          {tabsContent}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
