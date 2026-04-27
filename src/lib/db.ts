import {
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage'
import { db, storage } from './firebase'
import type { Post, Course, Submission, Settings, Trip, Location, PostExtras } from './types'

// ── Constants ─────────────────────────────────────────────────────────────

const EMPTY_EXTRAS: PostExtras = { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] }

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

// ── Posts ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPost(id: string, d: any): Post {
  const images: string[] = d.images?.length ? d.images : (d.image ? [d.image] : [])
  const extras: PostExtras = d.extras ? { ...EMPTY_EXTRAS, ...d.extras } : EMPTY_EXTRAS
  return {
    id,
    title: d.title ?? '',
    staff: d.staff ?? '',
    staffImage: d.staffImage ?? null,
    review: d.review ?? '',
    location: { name: d.locName ?? '', lat: d.locLat ?? null, lng: d.locLng ?? null },
    locationId: d.locationId ?? null,
    date: d.date ?? '',
    tags: d.tags ?? [],
    images,
    pinned: d.pinned ?? false,
    extras,
    userId: d.userId ?? null,
    status: d.status ?? 'approved',
    folder: d.folder ?? null,
  }
}

export async function fetchPosts(): Promise<Post[]> {
  const q = query(collection(db, 'posts'), where('status', '==', 'approved'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => docToPost(d.id, d.data()))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

export async function fetchPendingPosts(): Promise<Post[]> {
  const q = query(collection(db, 'posts'), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToPost(d.id, d.data()))
}

export async function approvePost(id: string): Promise<void> {
  await updateDoc(doc(db, 'posts', id), { status: 'approved' })
}

export async function submitPendingPost(post: Post, imagePaths: string[]): Promise<void> {
  await setDoc(doc(db, 'posts', post.id), {
    title: post.title,
    staff: post.staff,
    staffImage: post.staffImage ?? null,
    staffImagePath: null,
    review: post.review,
    locName: post.location.name,
    locLat: post.location.lat ?? null,
    locLng: post.location.lng ?? null,
    locationId: post.locationId ?? null,
    date: post.date,
    tags: post.tags,
    images: post.images,
    imagePaths,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    userId: post.userId ?? null,
    status: 'pending',
    folder: post.folder ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function insertPost(
  post: Post,
  imagePaths: string[],
  staffImagePath: string | null,
): Promise<void> {
  await setDoc(doc(db, 'posts', post.id), {
    title: post.title,
    staff: post.staff,
    staffImage: post.staffImage ?? null,
    staffImagePath,
    review: post.review,
    locName: post.location.name,
    locLat: post.location.lat ?? null,
    locLng: post.location.lng ?? null,
    locationId: post.locationId ?? null,
    date: post.date,
    tags: post.tags,
    images: post.images,
    imagePaths,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    userId: post.userId ?? null,
    status: post.status ?? 'approved',
    folder: post.folder ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function togglePinPost(id: string, pinned: boolean): Promise<void> {
  await updateDoc(doc(db, 'posts', id), { pinned })
}

export async function updatePost(
  post: Post,
  newImagePaths: string[] | undefined,
  newStaffImagePath: string | null | undefined,
): Promise<void> {
  const ref_ = doc(db, 'posts', post.id)

  if (newImagePaths !== undefined) {
    const snap = await getDoc(ref_)
    const oldPaths: string[] = snap.data()?.imagePaths ?? []
    const toDelete = oldPaths.filter((p) => !newImagePaths.includes(p))
    await Promise.all(toDelete.map((p) => deleteImage(p).catch(() => {})))
  }

  if (newStaffImagePath !== undefined) {
    const snap = await getDoc(ref_)
    const oldPath: string | null = snap.data()?.staffImagePath ?? null
    if (oldPath && oldPath !== newStaffImagePath) {
      await deleteImage(oldPath).catch(() => {})
    }
  }

  await updateDoc(ref_, {
    title: post.title,
    staff: post.staff,
    staffImage: post.staffImage ?? null,
    review: post.review,
    locName: post.location.name,
    locLat: post.location.lat ?? null,
    locLng: post.location.lng ?? null,
    locationId: post.locationId ?? null,
    date: post.date,
    tags: post.tags,
    images: post.images,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    status: post.status ?? 'approved',
    folder: post.folder ?? null,
    ...(newImagePaths !== undefined ? { imagePaths: newImagePaths } : {}),
    ...(newStaffImagePath !== undefined ? { staffImagePath: newStaffImagePath } : {}),
  })
}

export async function removePost(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'posts', id))
  const d = snap.data()
  await deleteDoc(doc(db, 'posts', id))
  const paths: string[] = [
    ...(d?.imagePaths ?? []),
    ...(d?.staffImagePath ? [d.staffImagePath] : []),
  ]
  await Promise.all(paths.map((p) => deleteImage(p).catch(() => {})))
}

// ── Courses ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToCourse(id: string, d: any): Course {
  return {
    id,
    title: d.title ?? '',
    description: d.description ?? null,
    image: d.image ?? null,
    riseUrl: d.riseUrl ?? '',
    location: { name: d.locName ?? '', lat: d.locLat ?? null, lng: d.locLng ?? null },
    locationId: d.locationId ?? null,
  }
}

export async function fetchCourses(): Promise<Course[]> {
  const snap = await getDocs(collection(db, 'courses'))
  return snap.docs.map((d) => docToCourse(d.id, d.data()))
}

export async function insertCourse(course: Course, imagePath: string | null): Promise<void> {
  await setDoc(doc(db, 'courses', course.id), {
    title: course.title,
    description: course.description ?? null,
    image: course.image ?? null,
    imagePath,
    riseUrl: course.riseUrl,
    locName: course.location.name,
    locLat: course.location.lat ?? null,
    locLng: course.location.lng ?? null,
    locationId: course.locationId ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function updateCourse(
  course: Course,
  newImagePath: string | null | undefined,
): Promise<void> {
  const ref_ = doc(db, 'courses', course.id)
  if (newImagePath !== undefined) {
    const snap = await getDoc(ref_)
    const oldPath: string | null = snap.data()?.imagePath ?? null
    if (oldPath && oldPath !== newImagePath) await deleteImage(oldPath).catch(() => {})
  }
  await updateDoc(ref_, {
    title: course.title,
    description: course.description ?? null,
    image: course.image ?? null,
    riseUrl: course.riseUrl,
    locName: course.location.name,
    locLat: course.location.lat ?? null,
    locLng: course.location.lng ?? null,
    locationId: course.locationId ?? null,
    ...(newImagePath !== undefined ? { imagePath: newImagePath } : {}),
  })
}

export async function removeCourse(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'courses', id))
  const imagePath: string | null = snap.data()?.imagePath ?? null
  await deleteDoc(doc(db, 'courses', id))
  if (imagePath) await deleteImage(imagePath).catch(() => {})
}

// ── Submissions ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToSubmission(id: string, d: any): Submission {
  return {
    id,
    name: d.name ?? '',
    location: { name: d.locName ?? '', lat: d.locLat ?? null, lng: d.locLng ?? null },
    date: d.date ?? '',
    review: d.review ?? '',
    images: d.images ?? [],
    showOnMap: d.showOnMap ?? false,
    extras: d.extras ? { ...EMPTY_EXTRAS, ...d.extras } : { ...EMPTY_EXTRAS },
  }
}

export async function fetchSubmissions(): Promise<Submission[]> {
  const snap = await getDocs(collection(db, 'submissions'))
  return snap.docs.map((d) => docToSubmission(d.id, d.data()))
}

export async function insertSubmission(
  submission: Submission,
  imagePaths: string[],
): Promise<void> {
  await setDoc(doc(db, 'submissions', submission.id), {
    name: submission.name,
    review: submission.review,
    date: submission.date || null,
    locName: submission.location.name || null,
    locLat: submission.location.lat ?? null,
    locLng: submission.location.lng ?? null,
    images: submission.images,
    imagePaths,
    showOnMap: false,
    extras: submission.extras ?? EMPTY_EXTRAS,
    submittedAt: serverTimestamp(),
  })
}

export async function updateSubmission(
  submission: Submission,
  newImagePaths: string[],
): Promise<void> {
  const snap = await getDoc(doc(db, 'submissions', submission.id))
  const existingPaths: string[] = snap.data()?.imagePaths ?? []
  await updateDoc(doc(db, 'submissions', submission.id), {
    name: submission.name,
    locName: submission.location.name,
    locLat: submission.location.lat ?? null,
    locLng: submission.location.lng ?? null,
    date: submission.date,
    review: submission.review,
    images: submission.images,
    imagePaths: [...existingPaths, ...newImagePaths],
    showOnMap: submission.showOnMap,
  })
}

export async function removeSubmission(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'submissions', id))
  const paths: string[] = snap.data()?.imagePaths ?? []
  await deleteDoc(doc(db, 'submissions', id))
  await Promise.all(paths.map((p) => deleteImage(p).catch(() => {})))
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<Settings> {
  const snap = await getDoc(doc(db, 'settings', 'main'))
  if (!snap.exists()) return DEFAULT_SETTINGS
  const d = snap.data()
  return {
    title: d.title ?? DEFAULT_SETTINGS.title,
    heading: d.heading ?? DEFAULT_SETTINGS.heading,
    color: d.color ?? DEFAULT_SETTINGS.color,
    password: d.password ?? DEFAULT_SETTINGS.password,
    welcome: d.welcome ?? DEFAULT_SETTINGS.welcome,
    departureAirport: {
      name: d.departureName ?? 'LHR',
      lat: d.departureLat ?? 51.5074,
      lng: d.departureLng ?? -0.1278,
    },
    panelImages: {
      feed: null, map: null, courses: null, years: null, submit: null,
      ...(d.panelImages ?? {}),
    },
    adminFolders: d.adminFolders ?? [],
  }
}

export async function upsertSettings(settings: Settings): Promise<void> {
  await setDoc(doc(db, 'settings', 'main'), {
    title: settings.title,
    heading: settings.heading,
    color: settings.color,
    password: settings.password,
    welcome: settings.welcome,
    departureName: settings.departureAirport?.name ?? 'LHR',
    departureLat: settings.departureAirport?.lat ?? 51.5074,
    departureLng: settings.departureAirport?.lng ?? -0.1278,
    panelImages: settings.panelImages,
    adminFolders: settings.adminFolders ?? [],
  })
}

// ── Locations ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToLocation(id: string, d: any): Location {
  return { id, name: d.name ?? '', country: d.country ?? '' }
}

export async function fetchLocations(): Promise<Location[]> {
  const snap = await getDocs(collection(db, 'locations'))
  return snap.docs
    .map((d) => docToLocation(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function insertLocation(location: Location): Promise<void> {
  await setDoc(doc(db, 'locations', location.id), {
    name: location.name,
    country: location.country,
  })
}

export async function updateLocation(location: Location): Promise<void> {
  await updateDoc(doc(db, 'locations', location.id), {
    name: location.name,
    country: location.country,
  })
}

export async function removeLocation(id: string): Promise<void> {
  await deleteDoc(doc(db, 'locations', id))
}

// ── Trips ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToTrip(id: string, d: any): Trip {
  return {
    id,
    name: d.name ?? '',
    participants: d.participants ?? [],
    date: d.date ?? '',
    image: d.image ?? null,
    locationId: d.locationId ?? null,
    external: d.external ?? false,
  }
}

export async function fetchTrips(): Promise<Trip[]> {
  const snap = await getDocs(collection(db, 'trips'))
  return snap.docs
    .map((d) => docToTrip(d.id, d.data()))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

export async function insertTrip(trip: Trip, imagePath: string | null): Promise<void> {
  await setDoc(doc(db, 'trips', trip.id), {
    name: trip.name,
    participants: trip.participants,
    date: trip.date || null,
    image: trip.image ?? null,
    imagePath,
    locationId: trip.locationId ?? null,
    external: trip.external ?? false,
    createdAt: serverTimestamp(),
  })
}

export async function updateTrip(
  trip: Trip,
  newImagePath: string | null | undefined,
): Promise<void> {
  const ref_ = doc(db, 'trips', trip.id)
  if (newImagePath !== undefined) {
    const snap = await getDoc(ref_)
    const oldPath: string | null = snap.data()?.imagePath ?? null
    if (oldPath && oldPath !== newImagePath) await deleteImage(oldPath).catch(() => {})
  }
  await updateDoc(ref_, {
    name: trip.name,
    participants: trip.participants,
    date: trip.date || null,
    image: trip.image ?? null,
    locationId: trip.locationId ?? null,
    external: trip.external ?? false,
    ...(newImagePath !== undefined ? { imagePath: newImagePath } : {}),
  })
}

export async function removeTrip(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'trips', id))
  const imagePath: string | null = snap.data()?.imagePath ?? null
  await deleteDoc(doc(db, 'trips', id))
  if (imagePath) await deleteImage(imagePath).catch(() => {})
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
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        quality,
      )
    }
    img.src = dataUrl
  })
}

export async function uploadImage(
  dataUrl: string,
  id: string,
): Promise<{ url: string; path: string }> {
  const blob = dataUrl.startsWith('data:')
    ? await compressImage(dataUrl)
    : await fetch(dataUrl).then((r) => r.blob())
  const path = `images/${id}-${Date.now()}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deleteImage(path: string): Promise<void> {
  await deleteObject(ref(storage, path))
}
