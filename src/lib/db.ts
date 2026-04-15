import { supabase } from './supabase'
import type { Post, Course, Submission, Settings } from './types'

const BUCKET = 'post-images'

export const DEFAULT_SETTINGS: Settings = {
  title: 'DAF Adventures',
  heading: 'Latest Staff Adventures',
  color: '#05979a',
  password: 'admin123',
  welcome: '',
  departureAirport: { name: 'LHR', lat: 51.5074, lng: -0.1278 },
}

// ── Row mappers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPost(row: any): Post {
  const images: string[] =
    row.image_urls?.length ? row.image_urls : (row.image_url ? [row.image_url] : [])
  return {
    id: row.id,
    title: row.title,
    staff: row.staff,
    staffImage: row.staff_image_url ?? null,
    review: row.review,
    location: { name: row.loc_name, lat: row.loc_lat ?? null, lng: row.loc_lng ?? null },
    date: row.date ?? '',
    tags: row.tags ?? [],
    images,
    showFlightPath: row.show_flight_path ?? false,
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
    showOnMap: row.show_on_map ?? false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSubmission(row: any): Submission {
  return {
    id: row.id,
    name: row.name,
    location: { name: row.loc_name, lat: row.loc_lat ?? null, lng: row.loc_lng ?? null },
    date: row.date ?? '',
    review: row.review ?? '',
    images: row.image_urls ?? [],
  }
}

// ── Posts ─────────────────────────────────────────────────────────────────

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToPost)
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
    date: post.date,
    tags: post.tags,
    image_url: post.images[0] ?? null,
    image_path: imagePaths[0] ?? null,
    image_urls: post.images,
    image_paths: imagePaths,
    show_flight_path: post.showFlightPath,
  })
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
    date: post.date,
    tags: post.tags,
    image_url: post.images[0] ?? null,
    image_urls: post.images,
    show_flight_path: post.showFlightPath,
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
    show_on_map: course.showOnMap,
  })
  if (error) throw error
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
    show_on_map: course.showOnMap,
    ...(newImagePath !== undefined ? { image_path: newImagePath } : {}),
  }).eq('id', course.id)
  if (error) throw error
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
  const { error } = await supabase.from('submissions').insert({
    id: submission.id,
    name: submission.name,
    loc_name: submission.location.name,
    loc_lat: submission.location.lat,
    loc_lng: submission.location.lng,
    date: submission.date,
    review: submission.review,
    image_urls: submission.images,
    image_paths: imagePaths,
  })
  if (error) throw error
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
  }
}

export async function upsertSettings(settings: Settings): Promise<void> {
  // Save core fields first — these columns always exist
  const { error } = await supabase.from('settings').upsert({
    id: 1,
    title: settings.title,
    heading: settings.heading,
    color: settings.color,
    password: settings.password,
    welcome: settings.welcome,
  }, { onConflict: 'id' })
  if (error) throw error

  // Save departure airport columns — silently skip if the migration hasn't been run yet
  await supabase.from('settings').update({
    departure_name: settings.departureAirport?.name ?? 'LHR',
    departure_lat: settings.departureAirport?.lat ?? 51.5074,
    departure_lng: settings.departureAirport?.lng ?? -0.1278,
  }).eq('id', 1)
}

// ── Storage ───────────────────────────────────────────────────────────────

export async function uploadImage(
  dataUrl: string,
  id: string
): Promise<{ url: string; path: string }> {
  const blob = await fetch(dataUrl).then((r) => r.blob())
  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
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
