import { supabase } from './supabase'
import type { Post, Course, Submission, Settings, Trip, Location, PostExtras } from './types'

const BUCKET = 'post-images'

export const DEFAULT_SETTINGS: Settings = {
  title: 'DAF Adventures',
  heading: 'Latest Staff Adventures',
  color: '#05979a',
  password: '1111',
  welcome: '',
  departureAirport: { name: 'LHR', lat: 51.5074, lng: -0.1278 },
  panelImages: { feed: null, map: null, courses: null, years: null, submit: null },
  adminFolders: [],
}

// ── Row mappers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMPTY_EXTRAS: PostExtras = { hotels: [], airlines: [], cruises: [], activities: [] }

function rowToPost(row: any): Post {
  const images: string[] =
    row.image_urls?.length ? row.image_urls : (row.image_url ? [row.image_url] : [])
  const extras: PostExtras = row.extras
    ? { ...EMPTY_EXTRAS, ...row.extras }
    : EMPTY_EXTRAS
  return {
    id: row.id,
    title: row.title,
    staff: row.staff,
    staffImage: row.staff_image_url ?? null,
    review: row.review,
    location: { name: row.loc_name, lat: row.loc_lat ?? null, lng: row.loc_lng ?? null },
    locationId: row.location_id ?? null,
    date: row.date ?? '',
    tags: row.tags ?? [],
    images,
    pinned: row.pinned ?? false,
    extras,
    userId: row.user_id ?? null,
    status: row.status ?? 'approved',
    folder: row.folder ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCourse(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    image: row.image_url ?? null,
    riseUrl: row.rise_url,
    location: { name: row.loc_name, lat: row.loc_lat ?? null, lng: row.loc_lng ?? null },
    locationId: row.location_id ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSubmission(row: any): Submission {
  return {
    id: row.id,
    name: row.name,
    location: { name: row.loc_name ?? '', lat: row.loc_lat ?? null, lng: row.loc_lng ?? null },
    date: row.date ?? '',
    review: row.review ?? '',
    images: row.image_urls ?? [],
    showOnMap: row.show_on_map ?? false,
    extras: row.extras ? { ...EMPTY_EXTRAS, ...row.extras } : { ...EMPTY_EXTRAS },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLocation(row: any): Location {
  return { id: row.id, name: row.name, country: row.country }
}



// ── Posts ─────────────────────────────────────────────────────────────────

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'approved')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToPost)
}

export async function fetchPendingPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToPost)
}

export async function approvePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ status: 'approved' })
    .eq('id', id)
  if (error) throw error
}

export async function submitPendingPost(post: Post, imagePaths: string[]): Promise<void> {
  const { error } = await supabase.from('posts').insert({
    id: post.id,
    title: post.title,
    staff: post.staff,
    staff_image_url: post.staffImage,
    staff_image_path: null,
    review: post.review,
    loc_name: post.location.name,
    loc_lat: post.location.lat,
    loc_lng: post.location.lng,
    location_id: post.locationId,
    date: post.date,
    tags: post.tags,
    image_url: post.images[0] ?? null,
    image_path: imagePaths[0] ?? null,
    image_urls: post.images,
    image_paths: imagePaths,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    user_id: post.userId,
    status: 'pending',
    folder: post.folder ?? null,
  })
  if (error) throw error
}

export async function insertPost(
  post: Post,
  imagePaths: string[],
  staffImagePath: string | null
): Promise<void> {
  const { error } = await supabase.from('posts').insert({
    id: post.id,
    title: post.title,
    staff: post.staff,
    staff_image_url: post.staffImage,
    staff_image_path: staffImagePath,
    review: post.review,
    loc_name: post.location.name,
    loc_lat: post.location.lat,
    loc_lng: post.location.lng,
    location_id: post.locationId,
    date: post.date,
    tags: post.tags,
    image_url: post.images[0] ?? null,
    image_path: imagePaths[0] ?? null,
    image_urls: post.images,
    image_paths: imagePaths,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    user_id: post.userId ?? null,
    status: post.status ?? 'approved',
    folder: post.folder ?? null,
  })
  if (error) throw error
}

export async function togglePinPost(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('posts').update({ pinned }).eq('id', id)
  if (error) throw error
}

export async function updatePost(
  post: Post,
  newImagePaths: string[] | undefined,
  newStaffImagePath: string | null | undefined
): Promise<void> {
  if (newImagePaths !== undefined) {
    const { data } = await supabase
      .from('posts').select('image_paths').eq('id', post.id).single()
    const oldPaths: string[] = data?.image_paths ?? []
    const toDelete = oldPaths.filter((p) => !newImagePaths.includes(p))
    await Promise.all(toDelete.map((p) => deleteImage(p).catch(() => {})))
  }
  if (newStaffImagePath !== undefined) {
    const { data } = await supabase
      .from('posts').select('staff_image_path').eq('id', post.id).single()
    if (data?.staff_image_path && data.staff_image_path !== newStaffImagePath) {
      await deleteImage(data.staff_image_path).catch(() => {})
    }
  }

  const { error } = await supabase.from('posts').update({
    title: post.title,
    staff: post.staff,
    staff_image_url: post.staffImage,
    review: post.review,
    loc_name: post.location.name,
    loc_lat: post.location.lat,
    loc_lng: post.location.lng,
    location_id: post.locationId,
    date: post.date,
    tags: post.tags,
    image_url: post.images[0] ?? null,
    image_urls: post.images,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    status: post.status ?? 'approved',
    folder: post.folder ?? null,
    ...(newImagePaths !== undefined ? { image_path: newImagePaths[0] ?? null, image_paths: newImagePaths } : {}),
    ...(newStaffImagePath !== undefined ? { staff_image_path: newStaffImagePath } : {}),
  }).eq('id', post.id)
  if (error) throw error
}

export async function removePost(id: string): Promise<void> {
  const { data } = await supabase.from('posts').select('image_paths, staff_image_path').eq('id', id).single()
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw error
  const paths: string[] = [
    ...(data?.image_paths ?? []),
    ...(data?.staff_image_path ? [data.staff_image_path] : []),
  ]
  await Promise.all(paths.map((p) => deleteImage(p).catch(() => {})))
}

// ── Courses ───────────────────────────────────────────────────────────────

export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToCourse)
}

export async function insertCourse(course: Course, imagePath: string | null): Promise<void> {
  const { error } = await supabase.from('courses').insert({
    id: course.id,
    title: course.title,
    description: course.description,
    image_url: course.image,
    image_path: imagePath,
    rise_url: course.riseUrl,
    loc_name: course.location.name,
    loc_lat: course.location.lat,
    loc_lng: course.location.lng,
    location_id: course.locationId,
  })
  if (error) throw new Error(error.message)
}

export async function updateCourse(
  course: Course,
  newImagePath: string | null | undefined
): Promise<void> {
  if (newImagePath !== undefined) {
    const { data } = await supabase.from('courses').select('image_path').eq('id', course.id).single()
    if (data?.image_path && data.image_path !== newImagePath) {
      await deleteImage(data.image_path).catch(() => {})
    }
  }
  const { error } = await supabase.from('courses').update({
    title: course.title,
    description: course.description,
    image_url: course.image,
    rise_url: course.riseUrl,
    loc_name: course.location.name,
    loc_lat: course.location.lat,
    loc_lng: course.location.lng,
    location_id: course.locationId,
    ...(newImagePath !== undefined ? { image_path: newImagePath } : {}),
  }).eq('id', course.id)
  if (error) throw new Error(error.message)
}

export async function removeCourse(id: string): Promise<void> {
  const { data } = await supabase.from('courses').select('image_path').eq('id', id).single()
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
  if (data?.image_path) await deleteImage(data.image_path).catch(() => {})
}

// ── Submissions ───────────────────────────────────────────────────────────

export async function fetchSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions').select('*').order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToSubmission)
}

export async function insertSubmission(
  submission: Submission,
  imagePaths: string[]
): Promise<void> {
  const full = {
    id: submission.id,
    name: submission.name,
    review: submission.review,
    date: submission.date || null,
    loc_name: submission.location.name || null,
    loc_lat: submission.location.lat ?? null,
    loc_lng: submission.location.lng ?? null,
    image_urls: submission.images,
    image_paths: imagePaths,
    show_on_map: false,
    extras: submission.extras ?? EMPTY_EXTRAS,
  }
  const { error } = await supabase.from('submissions').insert(full)
  if (!error) return
  if (error.message.includes('column') || error.code === '42703') {
    const { error: fallbackError } = await supabase.from('submissions').insert({
      id: submission.id,
      name: submission.name,
      review: submission.review,
      date: submission.date || null,
    })
    if (fallbackError) throw new Error(fallbackError.message)
    return
  }
  throw new Error(error.message)
}

export async function updateSubmission(submission: Submission, newImagePaths: string[]): Promise<void> {
  const { data } = await supabase.from('submissions').select('image_paths').eq('id', submission.id).single()
  const existingPaths: string[] = data?.image_paths ?? []
  const fields = {
    name: submission.name,
    loc_name: submission.location.name,
    loc_lat: submission.location.lat,
    loc_lng: submission.location.lng,
    date: submission.date,
    review: submission.review,
    image_urls: submission.images,
    image_paths: [...existingPaths, ...newImagePaths],
    show_on_map: submission.showOnMap,
  }
  const { error } = await supabase.from('submissions').update(fields).eq('id', submission.id)
  if (!error) return
  if (error.message.includes('show_on_map') || error.code === '42703') {
    const { show_on_map: _omit, ...withoutFlag } = fields
    const { error: e2 } = await supabase.from('submissions').update(withoutFlag).eq('id', submission.id)
    if (e2) throw new Error(e2.message)
    return
  }
  throw new Error(error.message)
}

export async function removeSubmission(id: string): Promise<void> {
  const { data } = await supabase.from('submissions').select('image_paths').eq('id', id).single()
  const { error } = await supabase.from('submissions').delete().eq('id', id)
  if (error) throw error
  const paths: string[] = data?.image_paths ?? []
  await Promise.all(paths.map((p) => deleteImage(p).catch(() => {})))
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<Settings> {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
  if (!data) return DEFAULT_SETTINGS
  return {
    title: data.title,
    heading: data.heading,
    color: data.color,
    password: data.password,
    welcome: data.welcome,
    departureAirport: {
      name: data.departure_name ?? 'LHR',
      lat: data.departure_lat ?? 51.5074,
      lng: data.departure_lng ?? -0.1278,
    },
    panelImages: { feed: null, map: null, courses: null, years: null, submit: null, ...(data.panel_images ?? {}) },
    adminFolders: data.admin_folders ?? [],
  }
}

export async function upsertSettings(settings: Settings): Promise<void> {
  const { error } = await supabase.from('settings').upsert({
    id: 1,
    title: settings.title,
    heading: settings.heading,
    color: settings.color,
    password: settings.password,
    welcome: settings.welcome,
  }, { onConflict: 'id' })
  if (error) throw error
  await supabase.from('settings').update({
    departure_name: settings.departureAirport?.name ?? 'LHR',
    departure_lat: settings.departureAirport?.lat ?? 51.5074,
    departure_lng: settings.departureAirport?.lng ?? -0.1278,
  }).eq('id', 1)
  await supabase.from('settings').update({ panel_images: settings.panelImages }).eq('id', 1)
  await supabase.from('settings').update({ admin_folders: settings.adminFolders ?? [] }).eq('id', 1)
}

// ── Locations ─────────────────────────────────────────────────────────────

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations').select('*').order('name', { ascending: true })
  if (error) return []
  return (data ?? []).map(rowToLocation)
}

export async function insertLocation(location: Location): Promise<void> {
  const { error } = await supabase.from('locations').insert({
    id: location.id, name: location.name, country: location.country,
  })
  if (error) throw new Error(error.message)
}

export async function updateLocation(location: Location): Promise<void> {
  const { error } = await supabase.from('locations').update({
    name: location.name, country: location.country,
  }).eq('id', location.id)
  if (error) throw new Error(error.message)
}

export async function removeLocation(id: string): Promise<void> {
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) throw error
}

// ── Trips ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTrip(row: any): Trip {
  return {
    id: row.id,
    name: row.name,
    participants: row.participants ?? [],
    date: row.date ?? '',
    image: row.image_url ?? null,
    locationId: row.location_id ?? null,
  }
}

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips').select('*').order('date', { ascending: false })
  if (error) return []
  return (data ?? []).map(rowToTrip)
}

export async function insertTrip(trip: Trip, imagePath: string | null): Promise<void> {
  const { error } = await supabase.from('trips').insert({
    id: trip.id,
    name: trip.name,
    participants: trip.participants,
    date: trip.date || null,
    image_url: trip.image,
    image_path: imagePath,
    location_id: trip.locationId,
  })
  if (error) throw new Error(error.message)
}

export async function updateTrip(trip: Trip, newImagePath: string | null | undefined): Promise<void> {
  if (newImagePath !== undefined) {
    const { data } = await supabase.from('trips').select('image_path').eq('id', trip.id).single()
    if (data?.image_path && data.image_path !== newImagePath) {
      await deleteImage(data.image_path).catch(() => {})
    }
  }
  const { error } = await supabase.from('trips').update({
    name: trip.name,
    participants: trip.participants,
    date: trip.date || null,
    image_url: trip.image,
    location_id: trip.locationId,
    ...(newImagePath !== undefined ? { image_path: newImagePath } : {}),
  }).eq('id', trip.id)
  if (error) throw new Error(error.message)
}

export async function removeTrip(id: string): Promise<void> {
  const { data } = await supabase.from('trips').select('image_path').eq('id', id).single()
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw error
  if (data?.image_path) await deleteImage(data.image_path).catch(() => {})
}

// ── Storage ───────────────────────────────────────────────────────────────

function compressImage(dataUrl: string, maxWidth = 1920, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = reject
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', quality)
    }
    img.src = dataUrl
  })
}

export async function uploadImage(
  dataUrl: string,
  id: string
): Promise<{ url: string; path: string }> {
  const blob = dataUrl.startsWith('data:') ? await compressImage(dataUrl) : await fetch(dataUrl).then(r => r.blob())
  const ext = 'jpg'
  const path = `${id}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function deleteImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}
