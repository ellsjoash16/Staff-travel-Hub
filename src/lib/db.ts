import {
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc,
  query, where, limit, serverTimestamp,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import type { Post, Submission, Settings, Trip, Location, PostExtras, Registration, RegistrationStatus, UserProfile } from './types'
import { encryptField, decryptField } from './crypto'

// ── Admin write helper ────────────────────────────────────────────────────

async function adminWrite(
  collection: string,
  id: string,
  op: 'set' | 'update' | 'delete',
  data?: Record<string, unknown>,
  updateFields?: string[],
): Promise<void> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Not authenticated')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch('/api/admin-write', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, id, op, data, updateFields }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? `Admin write failed: ${res.status}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

// ── Constants ─────────────────────────────────────────────────────────────

const EMPTY_EXTRAS: PostExtras = { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] }

export const DEFAULT_SETTINGS: Settings = {
  title: 'DAF Adventures',
  heading: 'Latest Staff Adventures',
  color: '#05979a',
  welcome: '',
  notice: '',
  departureAirport: { name: 'LHR', lat: 51.5074, lng: -0.1278 },
  panelImages: { feed: null, map: null, courses: null, years: null, submit: null },
  adminFolders: [],
  adminUids: [],
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
    locationId: d.locationId ?? (Array.isArray(d.locationIds) ? d.locationIds[0] ?? null : null),
    locationIds: Array.isArray(d.locationIds) ? d.locationIds : (d.locationId ? [d.locationId] : []),
    date: d.date ?? '',
    tags: d.tags ?? [],
    images,
    pinned: d.pinned ?? false,
    extras,
    salesNote: d.salesNote ?? null,
    riseUrl: d.riseUrl ?? null,
    userId: d.userId ?? null,
    status: d.status ?? 'approved',
    folder: d.folder ?? null,
  }
}

export async function fetchPosts(): Promise<Post[]> {
  const q = query(collection(db, 'posts'), where('status', '==', 'approved'), limit(200))
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
  await adminWrite('posts', id, 'update', { status: 'approved' }, ['status'])
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
    locationId: post.locationIds?.[0] ?? post.locationId ?? null,
    locationIds: post.locationIds ?? (post.locationId ? [post.locationId] : []),
    date: post.date,
    tags: post.tags,
    images: post.images,
    imagePaths,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    salesNote: post.salesNote ?? null,
    riseUrl: post.riseUrl ?? null,
    userId: post.userId ?? null,
    status: 'pending',
    folder: post.folder ?? null,
  })
}

export async function insertPost(
  post: Post,
  imagePaths: string[],
  staffImagePath: string | null,
): Promise<void> {
  await adminWrite('posts', post.id, 'set', {
    title: post.title,
    staff: post.staff,
    staffImage: post.staffImage ?? null,
    staffImagePath,
    review: post.review,
    locName: post.location.name,
    locLat: post.location.lat ?? null,
    locLng: post.location.lng ?? null,
    locationId: post.locationIds?.[0] ?? post.locationId ?? null,
    locationIds: post.locationIds ?? (post.locationId ? [post.locationId] : []),
    date: post.date,
    tags: post.tags,
    images: post.images,
    imagePaths,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    salesNote: post.salesNote ?? null,
    riseUrl: post.riseUrl ?? null,
    userId: post.userId ?? null,
    status: post.status ?? 'approved',
    folder: post.folder ?? null,
  })
}

export async function togglePinPost(id: string, pinned: boolean): Promise<void> {
  await adminWrite('posts', id, 'update', { pinned }, ['pinned'])
}

export async function setPostFolder(id: string, folder: string | null): Promise<void> {
  await adminWrite('posts', id, 'update', { folder: folder ?? null }, ['folder'])
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

  const data: Record<string, unknown> = {
    title: post.title,
    staff: post.staff,
    staffImage: post.staffImage ?? null,
    review: post.review,
    locName: post.location.name,
    locLat: post.location.lat ?? null,
    locLng: post.location.lng ?? null,
    locationId: post.locationIds?.[0] ?? post.locationId ?? null,
    locationIds: post.locationIds ?? (post.locationId ? [post.locationId] : []),
    date: post.date,
    tags: post.tags,
    images: post.images,
    pinned: post.pinned ?? false,
    extras: post.extras ?? EMPTY_EXTRAS,
    salesNote: post.salesNote ?? null,
    riseUrl: post.riseUrl ?? null,
    status: post.status ?? 'approved',
    folder: post.folder ?? null,
  }
  if (newImagePaths !== undefined) data.imagePaths = newImagePaths
  if (newStaffImagePath !== undefined) data.staffImagePath = newStaffImagePath
  await adminWrite('posts', post.id, 'set', data)
}

export async function removePost(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'posts', id))
  const d = snap.data()
  await adminWrite('posts', id, 'delete')
  const paths: string[] = [
    ...(d?.imagePaths ?? []),
    ...(d?.staffImagePath ? [d.staffImagePath] : []),
  ]
  await Promise.all(paths.map((p) => deleteImage(p).catch(() => {})))
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
    salesNote: d.salesNote ?? null,
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
    salesNote: submission.salesNote ?? null,
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
    welcome: d.welcome ?? DEFAULT_SETTINGS.welcome,
    notice: d.notice ?? '',
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
    adminUids: d.adminUids ?? [],
  }
}

export async function setAdminUids(uids: string[]): Promise<void> {
  await setDoc(doc(db, 'settings', 'main'), { adminUids: uids }, { merge: true })
}

export async function setUserBanned(uid: string, banned: boolean, banUntil: string | null = null): Promise<void> {
  await adminWrite('userProfiles', uid, 'update', { banned, banUntil }, ['banned', 'banUntil'])
}

export async function updatePanelImages(panelImages: Settings['panelImages']): Promise<void> {
  await updateDoc(doc(db, 'settings', 'main'), { panelImages })
}

export async function upsertSettings(settings: Settings): Promise<void> {
  await setDoc(doc(db, 'settings', 'main'), {
    title: settings.title,
    heading: settings.heading,
    color: settings.color,
    welcome: settings.welcome,
    notice: settings.notice ?? '',
    departureName: settings.departureAirport?.name ?? 'LHR',
    departureLat: settings.departureAirport?.lat ?? 51.5074,
    departureLng: settings.departureAirport?.lng ?? -0.1278,
    panelImages: settings.panelImages,
    adminFolders: settings.adminFolders ?? [],
  }, { merge: true })
}

// ── Locations ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToLocation(id: string, d: any): Location {
  return { id, name: d.name ?? '', country: d.country ?? '', imageUrl: d.imageUrl ?? null }
}

export async function fetchLocations(): Promise<Location[]> {
  const snap = await getDocs(query(collection(db, 'locations'), limit(500)))
  return snap.docs
    .map((d) => docToLocation(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function insertLocation(location: Location): Promise<void> {
  await adminWrite('locations', location.id, 'set', { name: location.name, country: location.country, imageUrl: location.imageUrl ?? null })
}

export async function updateLocation(location: Location): Promise<void> {
  await adminWrite('locations', location.id, 'set', { name: location.name, country: location.country, imageUrl: location.imageUrl ?? null })
}

export async function removeLocation(id: string): Promise<void> {
  await adminWrite('locations', id, 'delete')
}

// ── Trips ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToTrip(id: string, d: any): Trip {
  return {
    id,
    name: d.name ?? '',
    description: d.description ?? null,
    participants: d.participants ?? [],
    date: d.date ?? '',
    endDate: d.endDate ?? null,
    image: d.image ?? null,
    locationId: d.locationId ?? (Array.isArray(d.locationIds) ? d.locationIds[0] ?? null : null),
    locationIds: Array.isArray(d.locationIds) ? d.locationIds : (d.locationId ? [d.locationId] : []),
    external: d.external ?? false,
    completed: d.completed ?? false,
    international: d.international ?? false,
    showRegisterInterest: d.showRegisterInterest ?? false,
    isEvent: d.isEvent ?? false,
    eventType: d.eventType ?? null,
    eventBuilding: Array.isArray(d.eventBuilding) ? d.eventBuilding : d.eventBuilding ? [d.eventBuilding] : null,
    eventVenue: d.eventVenue ?? null,
    eventSpaces: d.eventSpaces ?? null,
    eventSponsor: d.eventSponsor ?? null,
    allowedRoles: Array.isArray(d.allowedRoles) ? d.allowedRoles : null,
    registrationDeadline: d.registrationDeadline ?? null,
  }
}

export async function fetchTrips(): Promise<Trip[]> {
  const snap = await getDocs(query(collection(db, 'trips'), limit(200)))
  return snap.docs
    .map((d) => docToTrip(d.id, d.data()))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

export async function insertTrip(trip: Trip, imagePath: string | null): Promise<void> {
  await adminWrite('trips', trip.id, 'set', {
    name: trip.name,
    description: trip.description ?? null,
    participants: trip.participants,
    date: trip.date || null,
    endDate: trip.endDate || null,
    image: trip.image ?? null,
    imagePath,
    locationId: trip.locationIds?.[0] ?? trip.locationId ?? null,
    locationIds: trip.locationIds ?? (trip.locationId ? [trip.locationId] : []),
    external: trip.external ?? false,
    completed: trip.completed ?? false,
    international: trip.international ?? false,
    showRegisterInterest: trip.showRegisterInterest ?? false,
    isEvent: trip.isEvent ?? false,
    eventType: trip.eventType ?? null,
    eventBuilding: trip.eventBuilding ?? null,
    eventVenue: trip.eventVenue ?? null,
    eventSpaces: trip.eventSpaces ?? null,
    eventSponsor: trip.eventSponsor ?? null,
    allowedRoles: trip.allowedRoles ?? null,
    registrationDeadline: trip.registrationDeadline ?? null,
  })
}

export async function markTripComplete(id: string): Promise<void> {
  await adminWrite('trips', id, 'update', { completed: true }, ['completed'])
}

export async function updateTrip(
  trip: Trip,
  newImagePath: string | null | undefined,
): Promise<void> {
  if (newImagePath !== undefined) {
    const snap = await getDoc(doc(db, 'trips', trip.id))
    const oldPath: string | null = snap.data()?.imagePath ?? null
    if (oldPath && oldPath !== newImagePath) await deleteImage(oldPath).catch(() => {})
  }
  const data: Record<string, unknown> = {
    name: trip.name,
    description: trip.description ?? null,
    participants: trip.participants,
    date: trip.date || null,
    endDate: trip.endDate || null,
    image: trip.image ?? null,
    locationId: trip.locationIds?.[0] ?? trip.locationId ?? null,
    locationIds: trip.locationIds ?? (trip.locationId ? [trip.locationId] : []),
    external: trip.external ?? false,
    completed: trip.completed ?? false,
    international: trip.international ?? false,
    showRegisterInterest: trip.showRegisterInterest ?? false,
    isEvent: trip.isEvent ?? false,
    eventType: trip.eventType ?? null,
    eventBuilding: trip.eventBuilding ?? null,
    eventVenue: trip.eventVenue ?? null,
    eventSpaces: trip.eventSpaces ?? null,
    eventSponsor: trip.eventSponsor ?? null,
    allowedRoles: trip.allowedRoles ?? null,
    registrationDeadline: trip.registrationDeadline ?? null,
  }
  if (newImagePath !== undefined) data.imagePath = newImagePath
  await adminWrite('trips', trip.id, 'set', data)
}

export async function removeTrip(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'trips', id))
  const imagePath: string | null = snap.data()?.imagePath ?? null
  await adminWrite('trips', id, 'delete')
  if (imagePath) await deleteImage(imagePath).catch(() => {})
}

// ── Registrations ─────────────────────────────────────────────────────────

export async function insertRegistration(reg: Registration): Promise<void> {
  const [
    firstName, lastName, email,
    passportFirstName, passportLastName,
    medicalInfo,
  ] = await Promise.all([
    encryptField(reg.firstName),
    encryptField(reg.lastName),
    encryptField(reg.email),
    encryptField(reg.passportFirstName),
    encryptField(reg.passportLastName),
    encryptField(reg.medicalInfo),
  ])
  await setDoc(doc(db, 'registrations', reg.id), {
    tripId: reg.tripId,
    tripName: reg.tripName,
    uid: reg.uid ?? null,
    firstName, lastName, email,
    passportFirstName, passportLastName,
    medicalInfo,
    dataConsent: reg.dataConsent,
    jobRole: reg.jobRole ?? null,
    salesDivision: reg.salesDivision ?? null,
    nominatedPeople: reg.nominatedPeople ?? [],
    visitedBefore: reg.visitedBefore ?? null,
    visitedWhen: reg.visitedWhen ?? null,
    keyLevel: reg.keyLevel ?? null,
    destinationInspiration: reg.destinationInspiration ?? null,
    whyChooseYou: reg.whyChooseYou ?? null,
    status: 'requested',
    submittedAt: serverTimestamp(),
  })
}

export async function fetchRegistrations(): Promise<Registration[]> {
  const snap = await getDocs(query(collection(db, 'registrations'), limit(1000)))
  const results = await Promise.all(snap.docs.map(async d => {
    const data = d.data()
    try {
      const [
        firstName, lastName, email,
        passportFirstName, passportLastName,
        medicalInfo,
      ] = await Promise.all([
        decryptField(data.firstName ?? null),
        decryptField(data.lastName ?? null),
        decryptField(data.email ?? data.workEmail ?? null),
        decryptField(data.passportFirstName ?? null),
        decryptField(data.passportLastName ?? data.passportSurname ?? null),
        decryptField(data.medicalInfo ?? data.medicalConditions ?? null),
      ])
      return {
        id: d.id,
        tripId: data.tripId ?? '',
        tripName: data.tripName ?? '',
        uid: data.uid ?? null,
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        email: email ?? '',
        passportFirstName: passportFirstName ?? '',
        passportLastName: passportLastName ?? '',
        medicalInfo,
        dataConsent: data.dataConsent ?? false,
        status: (data.status ?? 'requested') as RegistrationStatus,
        jobRole: data.jobRole ?? null,
        salesDivision: data.salesDivision ?? null,
        nominatedPeople: Array.isArray(data.nominatedPeople) ? data.nominatedPeople : [],
        visitedBefore: data.visitedBefore ?? null,
        visitedWhen: data.visitedWhen ?? null,
        keyLevel: data.keyLevel ?? null,
        destinationInspiration: data.destinationInspiration ?? null,
        whyChooseYou: data.whyChooseYou ?? null,
      } as Registration
    } catch {
      // Decryption failed for this doc — return a placeholder so it still shows
      return {
        id: d.id,
        tripId: data.tripId ?? '',
        tripName: data.tripName ?? '',
        uid: data.uid ?? null,
        firstName: '[encrypted]', lastName: '[encrypted]',
        email: '', passportFirstName: '', passportLastName: '',
        medicalInfo: null,
        dataConsent: data.dataConsent ?? false,
        status: (data.status ?? 'requested') as RegistrationStatus,
        jobRole: data.jobRole ?? null,
        salesDivision: data.salesDivision ?? null,
        nominatedPeople: [],
      } as Registration
    }
  }))
  return results
}

export async function updateRegistrationStatus(id: string, status: RegistrationStatus): Promise<void> {
  await adminWrite('registrations', id, 'update', { status }, ['status'])
}

export async function addTripParticipant(tripId: string, name: string): Promise<void> {
  const snap = await getDoc(doc(db, 'trips', tripId))
  const current: string[] = snap.data()?.participants ?? []
  if (!current.includes(name)) {
    await adminWrite('trips', tripId, 'update', { participants: [...current, name] }, ['participants'])
  }
}

export async function removeTripParticipant(tripId: string, name: string): Promise<void> {
  const snap = await getDoc(doc(db, 'trips', tripId))
  const current: string[] = snap.data()?.participants ?? []
  await adminWrite('trips', tripId, 'update', { participants: current.filter(p => p !== name) }, ['participants'])
}

export async function fetchMyRegistrations(uid: string): Promise<Registration[]> {
  const snap = await getDocs(query(collection(db, 'registrations'), where('uid', '==', uid)))
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      tripId: data.tripId ?? '',
      tripName: data.tripName ?? '',
      uid: data.uid ?? null,
      firstName: '', lastName: '', email: '',
      passportFirstName: '', passportLastName: '',
      medicalInfo: null, dataConsent: false,
      status: (data.status ?? 'requested') as RegistrationStatus,
      jobRole: data.jobRole ?? null,
      salesDivision: data.salesDivision ?? null,
      nominatedPeople: Array.isArray(data.nominatedPeople) ? data.nominatedPeople : [],
      visitedBefore: data.visitedBefore ?? null,
      visitedWhen: data.visitedWhen ?? null,
      keyLevel: data.keyLevel ?? null,
      destinationInspiration: data.destinationInspiration ?? null,
      whyChooseYou: data.whyChooseYou ?? null,
    } as Registration
  })
}

export async function deleteRegistration(id: string): Promise<void> {
  await adminWrite('registrations', id, 'delete')
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await adminWrite('userProfiles', uid, 'delete')
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'userProfiles', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  const [
    firstName, lastName,
    passportFirstName, passportLastName,
    medicalInfo,
  ] = await Promise.all([
    decryptField(data.firstName ?? null),
    decryptField(data.lastName ?? null),
    decryptField(data.passportFirstName ?? null),
    decryptField(data.passportLastName ?? null),
    decryptField(data.medicalInfo ?? null),
  ])
  return {
    uid,
    authEmail: data.authEmail ?? null,
    authDisplayName: data.authDisplayName ?? null,
    jobRole: data.jobRole ?? null,
    building: data.building ?? null,
    salesDivision: data.salesDivision ?? null,
    firstName: firstName ?? '',
    lastName: lastName ?? '',
    passportFirstName: passportFirstName ?? '',
    passportLastName: passportLastName ?? '',
    medicalInfo,
    dataConsent: data.dataConsent ?? false,
    banned: data.banned ?? false,
    banUntil: data.banUntil ?? null,
    isAdmin: data.isAdmin ?? false,
  }
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const [
    firstName, lastName,
    passportFirstName, passportLastName,
    medicalInfo,
  ] = await Promise.all([
    encryptField(profile.firstName),
    encryptField(profile.lastName),
    encryptField(profile.passportFirstName),
    encryptField(profile.passportLastName),
    encryptField(profile.medicalInfo),
  ])
  await setDoc(doc(db, 'userProfiles', profile.uid), {
    firstName, lastName,
    passportFirstName, passportLastName,
    medicalInfo,
    jobRole: profile.jobRole ?? null,
    building: profile.building ?? null,
    salesDivision: profile.salesDivision ?? null,
    dataConsent: profile.dataConsent,
    updatedAt: serverTimestamp(),
  })
}

export async function adminUpdateUserProfile(uid: string, fields: {
  firstName: string; lastName: string
  passportFirstName: string; passportLastName: string
  medicalInfo: string | null
  jobRole: string | null
  building: string | null
  salesDivision: string | null
}): Promise<void> {
  const [firstName, lastName, passportFirstName, passportLastName, medicalInfo] = await Promise.all([
    encryptField(fields.firstName),
    encryptField(fields.lastName),
    encryptField(fields.passportFirstName),
    encryptField(fields.passportLastName),
    encryptField(fields.medicalInfo),
  ])
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Not authenticated')
  const res = await fetch('/api/edit-user-profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid,
      fields: {
        firstName, lastName, passportFirstName, passportLastName, medicalInfo,
        jobRole: fields.jobRole ?? null,
        building: fields.building ?? null,
        salesDivision: fields.salesDivision ?? null,
      },
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Update failed: ${res.status}`)
  }
}

export async function adminCreateUser(fields: {
  email: string; password: string
  firstName: string; lastName: string; jobRole: string
  salesDivision?: string | null; building?: string | null
}): Promise<{ uid: string; email: string; displayName: string | null }> {
  const [firstNameEnc, lastNameEnc] = await Promise.all([
    encryptField(fields.firstName),
    encryptField(fields.lastName),
  ])
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Not authenticated')
  const res = await fetch('/api/create-user', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: fields.email.trim(),
      password: fields.password,
      displayName: `${fields.firstName.trim()} ${fields.lastName.trim()}`.trim(),
      jobRole: fields.jobRole,
      salesDivision: fields.salesDivision ?? null,
      building: fields.building ?? null,
      firstNameEnc, lastNameEnc,
    }),
  })
  const body = await res.json().catch(() => ({})) as { uid?: string; email?: string; displayName?: string | null; error?: string }
  if (!res.ok) throw new Error(body.error ?? `Create failed: ${res.status}`)
  return { uid: body.uid!, email: body.email ?? fields.email.trim(), displayName: body.displayName ?? null }
}

export async function saveJobRole(uid: string, jobRole: string, salesDivision?: string | null, building?: string | null): Promise<void> {
  await setDoc(doc(db, 'userProfiles', uid), { jobRole, salesDivision: salesDivision ?? null, building: building ?? null }, { merge: true })
}

// Called at sign-up so the name, role and building the user typed persist on
// their profile and carry over into every registration and the admin editor.
export async function saveSignupProfile(uid: string, fields: {
  firstName: string; lastName: string; jobRole: string
  salesDivision?: string | null; building?: string | null
}): Promise<void> {
  const [firstName, lastName] = await Promise.all([
    encryptField(fields.firstName),
    encryptField(fields.lastName),
  ])
  await setDoc(doc(db, 'userProfiles', uid), {
    firstName, lastName,
    jobRole: fields.jobRole,
    salesDivision: fields.salesDivision ?? null,
    building: fields.building ?? null,
  }, { merge: true })
}

export async function saveAccountRecord(uid: string, email: string | null, displayName: string | null): Promise<void> {
  await setDoc(doc(db, 'userProfiles', uid), {
    authEmail: email ?? null,
    authDisplayName: displayName ?? null,
    lastSignIn: serverTimestamp(),
  }, { merge: true })
}

export async function fetchAllUserProfiles(): Promise<(UserProfile & { updatedAt: string | null })[]> {
  // 1. Get all Firebase Auth users via Admin API (lists every account, not just those with Firestore profiles)
  const token = await auth.currentUser?.getIdToken()
  if (!token) return []

  const apiRes = await fetch('/api/list-users', { headers: { Authorization: `Bearer ${token}` } })
  if (!apiRes.ok) {
    const text = await apiRes.text()
    let detail = text.slice(0, 400)
    try {
      const j = JSON.parse(text) as { error?: string | { message?: string }; message?: string }
      const e = j.error
      detail = (typeof e === 'string' ? e : (e as { message?: string })?.message) ?? j.message ?? detail
    } catch { /* non-JSON */ }
    throw new Error(`API ${apiRes.status}: ${detail}`)
  }
  const { users } = await apiRes.json() as { users: { uid: string; email: string | null; displayName: string | null }[] }
  console.log(`[fetchAllUsers] API returned ${users.length} auth users`)

  // 2. Get all Firestore profiles (for passport/medical/consent data)
  const snap = await getDocs(collection(db, 'userProfiles'))
  const profileDataMap = new Map<string, ReturnType<typeof snap.docs[0]['data']>>()
  for (const d of snap.docs) profileDataMap.set(d.id, d.data())

  // 3. Merge: every Auth user gets a row; Firestore profile data attached where it exists
  const results = await Promise.all(users.map(async authUser => {
    const data = profileDataMap.get(authUser.uid)
    if (!data) {
      return {
        uid: authUser.uid,
        authEmail: authUser.email,
        authDisplayName: authUser.displayName,
        jobRole: null,
        salesDivision: null,
        firstName: '', lastName: '',
        passportFirstName: '', passportLastName: '',
        medicalInfo: null,
        dataConsent: false, banned: false, isAdmin: false,
        updatedAt: null,
      } as UserProfile & { updatedAt: string | null }
    }
    try {
      const [
        firstName, lastName,
        passportFirstName, passportLastName,
        medicalInfo,
      ] = await Promise.all([
        decryptField(data.firstName ?? null),
        decryptField(data.lastName ?? null),
        decryptField(data.passportFirstName ?? null),
        decryptField(data.passportLastName ?? null),
        decryptField(data.medicalInfo ?? null),
      ])
      return {
        uid: authUser.uid,
        authEmail: data.authEmail ?? authUser.email,
        authDisplayName: data.authDisplayName ?? authUser.displayName,
        jobRole: data.jobRole ?? null,
        building: data.building ?? null,
        salesDivision: data.salesDivision ?? null,
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        passportFirstName: passportFirstName ?? '',
        passportLastName: passportLastName ?? '',
        medicalInfo,
        dataConsent: data.dataConsent ?? false,
        banned: data.banned ?? false,
        banUntil: data.banUntil ?? null,
        isAdmin: data.isAdmin ?? false,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      } as UserProfile & { updatedAt: string | null }
    } catch {
      return {
        uid: authUser.uid,
        authEmail: data.authEmail ?? authUser.email,
        authDisplayName: data.authDisplayName ?? authUser.displayName,
        jobRole: data.jobRole ?? null,
        building: data.building ?? null,
        salesDivision: data.salesDivision ?? null,
        firstName: '[encrypted]', lastName: '[encrypted]',
        passportFirstName: '', passportLastName: '',
        medicalInfo: null,
        dataConsent: data.dataConsent ?? false,
        banned: data.banned ?? false,
        banUntil: data.banUntil ?? null,
        isAdmin: data.isAdmin ?? false,
        updatedAt: null,
      } as UserProfile & { updatedAt: string | null }
    }
  }))
  return results
}

// ── Storage ───────────────────────────────────────────────────────────────

function compressImage(dataUrl: string, maxWidth = 1920, quality = 0.75): Promise<Blob> {
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

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export async function uploadImage(
  dataUrl: string,
  _id: string,
): Promise<{ url: string; path: string }> {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
    throw new Error('Image hosting is not configured — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET')
  }
  const blob = dataUrl.startsWith('data:image/jpeg')
    ? await fetch(dataUrl).then((r) => r.blob())
    : dataUrl.startsWith('data:')
      ? await compressImage(dataUrl)
      : await fetch(dataUrl).then((r) => r.blob())

  const form = new FormData()
  form.append('file', blob)
  form.append('upload_preset', CLOUDINARY_PRESET)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Image upload failed (${res.status})${detail ? `: ${detail.slice(0, 120)}` : ''}`)
  }
  const json = await res.json()
  return { url: json.secure_url as string, path: json.public_id as string }
}

// Cloudinary deletes require a signed server call; at the free-tier scale
// orphaned images are harmless, so removal is a no-op on the client.
export async function deleteImage(_path: string): Promise<void> {
  return
}
