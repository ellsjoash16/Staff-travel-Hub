import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import type { Post, Course, Submission, Settings, View, PanelImages, Trip, Location, Registration, RegistrationStatus, UserProfile } from '@/lib/types'
import {
  fetchPosts, fetchSettings, fetchTrips, fetchLocations,
  insertPost, updatePost, removePost, togglePinPost,
  updateSubmission, removeSubmission,
  insertTrip, updateTrip, removeTrip, markTripComplete,
  insertLocation, updateLocation, removeLocation,
  uploadImage, DEFAULT_SETTINGS,
  fetchPendingPosts, approvePost, submitPendingPost,
  fetchRegistrations, fetchMyRegistrations, updateRegistrationStatus, addTripParticipant, removeTripParticipant, deleteRegistration, deleteUserProfile,
  fetchAllUserProfiles, setUserBanned, fetchUserProfile, adminUpdateUserProfile,
} from '@/lib/db'
import { hexToHsl, extractStoragePath } from '@/lib/utils'
import { auth } from '@/lib/firebase'

// UIDs that are always admin — mirrors api/ensure-admin.js ALLOWED_UIDS
export const SUPERADMIN_UIDS = ['zjq9ki2IUNg3fUHGlda7N3pn6ko1', 'UdIhjIXCVfdPBwaQ6HnzM1jDYoa2']

const BUCKET = 'post-images'

async function apiFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

interface AppState {
  posts: Post[]
  courses: Course[]
  submissions: Submission[]
  trips: Trip[]
  locations: Location[]
  settings: Settings
  isAdmin: boolean
  activeView: View
  activeFilter: string | null
  loading: boolean
  pendingPosts: Post[]
  registrations: Registration[]
  userProfiles: (UserProfile & { updatedAt: string | null })[]
  myRegistrations: Registration[]
  currentUserProfile: { jobRole: string | null; salesDivision: string | null } | null
}

type Action =
  | { type: 'INIT'; posts: Post[]; submissions: Submission[]; trips: Trip[]; locations: Location[]; settings: Settings }
  | { type: 'ADD_COURSE'; course: Course }
  | { type: 'UPDATE_COURSE'; course: Course }
  | { type: 'DELETE_COURSE'; id: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SET_FILTER'; filter: string | null }
  | { type: 'SET_ADMIN'; value: boolean }
  | { type: 'SET_PENDING'; posts: Post[] }
  | { type: 'SET_REGISTRATIONS'; registrations: Registration[] }
  | { type: 'SET_USER_PROFILES'; profiles: (UserProfile & { updatedAt: string | null })[] }
  | { type: 'UPDATE_REGISTRATION_STATUS'; id: string; status: RegistrationStatus }
  | { type: 'DELETE_REGISTRATION'; id: string }
  | { type: 'DELETE_USER_PROFILE'; uid: string }
  | { type: 'SET_USER_BANNED'; uid: string; banned: boolean }
  | { type: 'SET_MY_REGISTRATIONS'; registrations: Registration[] }
  | { type: 'ADD_MY_REGISTRATION'; registration: Registration }
  | { type: 'SET_CURRENT_USER_PROFILE'; profile: { jobRole: string | null; salesDivision: string | null } | null }
  | { type: 'UPDATE_USER_PROFILE'; uid: string; fields: Partial<UserProfile> }
  | { type: 'UPDATE_TRIP_PARTICIPANTS'; tripId: string; name: string; action: 'add' | 'remove' }
  | { type: 'APPROVE_POST'; id: string }
  | { type: 'ADD_POST'; post: Post }
  | { type: 'UPDATE_POST'; post: Post }
  | { type: 'DELETE_POST'; id: string }

  | { type: 'ADD_SUBMISSION'; submission: Submission }
  | { type: 'UPDATE_SUBMISSION'; submission: Submission }
  | { type: 'DELETE_SUBMISSION'; id: string }
  | { type: 'ADD_TRIP'; trip: Trip }
  | { type: 'UPDATE_TRIP'; trip: Trip }
  | { type: 'DELETE_TRIP'; id: string }
  | { type: 'ADD_LOCATION'; location: Location }
  | { type: 'UPDATE_LOCATION'; location: Location }
  | { type: 'DELETE_LOCATION'; id: string }
  | { type: 'UPDATE_SETTINGS'; settings: Settings }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
      return { ...state, posts: action.posts, courses: [], submissions: action.submissions, trips: action.trips, locations: action.locations, settings: action.settings }
    case 'SET_LOADING': return { ...state, loading: action.value }
    case 'SET_VIEW': return { ...state, activeView: action.view }
    case 'SET_FILTER': return { ...state, activeFilter: action.filter }
    case 'SET_ADMIN': return { ...state, isAdmin: action.value }
    case 'SET_PENDING': return { ...state, pendingPosts: action.posts }
    case 'SET_REGISTRATIONS': return { ...state, registrations: action.registrations }
    case 'SET_USER_PROFILES': return { ...state, userProfiles: action.profiles }
    case 'UPDATE_REGISTRATION_STATUS': return { ...state, registrations: state.registrations.map(r => r.id === action.id ? { ...r, status: action.status } : r) }
    case 'DELETE_REGISTRATION': return { ...state, registrations: state.registrations.filter(r => r.id !== action.id) }
    case 'DELETE_USER_PROFILE': return { ...state, userProfiles: state.userProfiles.filter(u => u.uid !== action.uid) }
    case 'SET_USER_BANNED': return { ...state, userProfiles: state.userProfiles.map(u => u.uid === action.uid ? { ...u, banned: action.banned } : u) }
    case 'SET_MY_REGISTRATIONS': return { ...state, myRegistrations: action.registrations }
    case 'ADD_MY_REGISTRATION': return { ...state, myRegistrations: [...state.myRegistrations, action.registration] }
    case 'SET_CURRENT_USER_PROFILE': return { ...state, currentUserProfile: action.profile }
    case 'UPDATE_USER_PROFILE': return { ...state, userProfiles: state.userProfiles.map(u => u.uid === action.uid ? { ...u, ...action.fields } : u) }
    case 'UPDATE_TRIP_PARTICIPANTS': return {
      ...state,
      trips: state.trips.map(t => t.id === action.tripId ? {
        ...t,
        participants: action.action === 'add'
          ? t.participants.includes(action.name) ? t.participants : [...t.participants, action.name]
          : t.participants.filter(p => p !== action.name)
      } : t)
    }
    case 'APPROVE_POST': {
      const approved = state.pendingPosts.find(p => p.id === action.id)
      return {
        ...state,
        pendingPosts: state.pendingPosts.filter(p => p.id !== action.id),
        posts: approved
          ? [{ ...approved, status: 'approved' as const }, ...state.posts]
          : state.posts,
      }
    }
    case 'ADD_POST': return { ...state, posts: [action.post, ...state.posts] }
    case 'UPDATE_POST': return { ...state, posts: state.posts.map((p) => p.id === action.post.id ? action.post : p) }
    case 'DELETE_POST': return { ...state, posts: state.posts.filter((p) => p.id !== action.id) }

    case 'ADD_SUBMISSION': return { ...state, submissions: [action.submission, ...state.submissions] }
    case 'UPDATE_SUBMISSION': return { ...state, submissions: state.submissions.map((s) => s.id === action.submission.id ? action.submission : s) }
    case 'DELETE_SUBMISSION': return { ...state, submissions: state.submissions.filter((s) => s.id !== action.id) }
    case 'ADD_TRIP': return { ...state, trips: [action.trip, ...state.trips] }
    case 'UPDATE_TRIP': return { ...state, trips: state.trips.map((t) => t.id === action.trip.id ? action.trip : t) }
    case 'DELETE_TRIP': return { ...state, trips: state.trips.filter((t) => t.id !== action.id) }
    case 'ADD_LOCATION': return { ...state, locations: [...state.locations, action.location].sort((a, b) => a.name.localeCompare(b.name)) }
    case 'UPDATE_LOCATION': return { ...state, locations: state.locations.map((l) => l.id === action.location.id ? action.location : l) }
    case 'DELETE_LOCATION': return { ...state, locations: state.locations.filter((l) => l.id !== action.id) }
    case 'UPDATE_SETTINGS': return { ...state, settings: action.settings }
    default: return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  togglePin: (id: string, pinned: boolean) => Promise<void>
  addPost: (post: Post, newDataUrls: string[], staffImageDataUrl: string | null) => Promise<void>
  editPost: (post: Post, newDataUrls: string[], staffImageDataUrl: string | null) => Promise<void>
  deletePost: (id: string) => Promise<void>

  submitReview: (submission: Submission, imageDataUrls: string[]) => Promise<void>
  editSubmission: (submission: Submission, newDataUrls: string[]) => Promise<void>
  deleteSubmission: (id: string) => Promise<void>
  addTrip: (trip: Trip, imageDataUrl: string | null) => Promise<void>
  editTrip: (trip: Trip, imageDataUrl: string | null) => Promise<void>
  deleteTrip: (id: string) => Promise<void>
  completeTrip: (trip: Trip) => Promise<void>
  addLocation: (location: Location) => Promise<void>
  editLocation: (location: Location) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  savePageImages: (images: PanelImages, dataUrls: Partial<Record<keyof PanelImages, string | null>>) => Promise<void>
  approvePostFn: (id: string) => Promise<void>
  fetchPending: () => Promise<void>
  loadRegistrations: () => Promise<void>
  setRegistrationStatus: (id: string, status: RegistrationStatus) => Promise<void>
  removeRegistration: (id: string) => Promise<void>
  removeUserProfile: (uid: string) => Promise<void>
  loadUserProfiles: () => Promise<void>
  loadMyRegistrations: () => Promise<void>
  toggleAdminUid: (uid: string) => Promise<void>
  banUser: (uid: string, banned: boolean) => Promise<void>
  editUserProfile: (uid: string, fields: { firstName: string; lastName: string; passportFirstName: string; passportLastName: string; medicalInfo: string | null; jobRole: string | null; salesDivision: string | null }) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children, authUid }: { children: ReactNode; authUid: string | null }) {
  const [state, dispatch] = useReducer(reducer, {
    posts: [], courses: [], submissions: [], trips: [], locations: [],
    settings: DEFAULT_SETTINGS,
    isAdmin: false, activeView: 'home', activeFilter: null, loading: true,
    pendingPosts: [], registrations: [], userProfiles: [], myRegistrations: [],
    currentUserProfile: null,
  })

  // Initial data load
  useEffect(() => {
    async function init() {
      const uid = authUid ?? auth.currentUser?.uid
      const SETTINGS_KEY = 'dafagram:settings'

      // Superadmins are always admin — set immediately, no network call needed
      if (uid && SUPERADMIN_UIDS.includes(uid)) dispatch({ type: 'SET_ADMIN', value: true })

      // Fire ensure-admin silently in background to keep Firestore in sync
      if (uid) {
        auth.currentUser?.getIdToken()
          .then(token => { if (token) apiFetch('/api/ensure-admin', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }) })
          .catch(() => {})
      }

      // Kick off all data fetches in parallel
      const postsPromise = fetchPosts().catch(() => [] as Post[])
      const tripsPromise = fetchTrips().catch(() => [] as Trip[])
      const locationsPromise = fetchLocations().catch(() => [] as Location[])

      // Show cached settings immediately (stale-while-revalidate)
      let hasCached = false
      try {
        const raw = localStorage.getItem(SETTINGS_KEY)
        if (raw) {
          const cached: Settings = JSON.parse(raw)
          dispatch({ type: 'UPDATE_SETTINGS', settings: cached })
          if (uid && cached.adminUids?.includes(uid)) dispatch({ type: 'SET_ADMIN', value: true })
          dispatch({ type: 'SET_LOADING', value: false })
          hasCached = true
        }
      } catch {}

      // Fetch fresh settings from Firestore
      let resolvedSettings: Settings = DEFAULT_SETTINGS
      try {
        resolvedSettings = await fetchSettings()
        // Patch superadmin UID into local settings if Firestore hasn't synced yet
        if (uid && SUPERADMIN_UIDS.includes(uid) && !resolvedSettings.adminUids.includes(uid)) {
          resolvedSettings = { ...resolvedSettings, adminUids: [...resolvedSettings.adminUids, uid] }
        }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(resolvedSettings))
      } catch {}

      dispatch({ type: 'UPDATE_SETTINGS', settings: resolvedSettings })
      if (uid && resolvedSettings.adminUids?.includes(uid)) dispatch({ type: 'SET_ADMIN', value: true })
      if (!hasCached) dispatch({ type: 'SET_LOADING', value: false })

      const [posts, trips, locations] = await Promise.all([postsPromise, tripsPromise, locationsPromise])
      dispatch({ type: 'INIT', posts, submissions: [], trips, locations, settings: resolvedSettings })

      if (uid) {
        fetchMyRegistrations(uid).then(regs => dispatch({ type: 'SET_MY_REGISTRATIONS', registrations: regs })).catch(() => {})
        fetchUserProfile(uid).then(p => {
          if (p) dispatch({ type: 'SET_CURRENT_USER_PROFILE', profile: { jobRole: p.jobRole, salesDivision: p.salesDivision } })
        }).catch(() => {})
      }
    }
    init()
  }, [])

  useEffect(() => { document.title = state.settings.title }, [state.settings.title])

  useEffect(() => {
    const hsl = hexToHsl(state.settings.color)
    if (hsl) {
      document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
      document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
    }
  }, [state.settings.color])


  async function approvePostFn(id: string): Promise<void> {
    await approvePost(id)
    dispatch({ type: 'APPROVE_POST', id })
  }

  async function fetchPending(): Promise<void> {
    const posts = await fetchPendingPosts()
    dispatch({ type: 'SET_PENDING', posts })
  }

  async function loadRegistrations(): Promise<void> {
    const registrations = await fetchRegistrations()
    dispatch({ type: 'SET_REGISTRATIONS', registrations })
  }

  async function loadMyRegistrations(): Promise<void> {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const registrations = await fetchMyRegistrations(uid)
    dispatch({ type: 'SET_MY_REGISTRATIONS', registrations })
  }

  async function loadUserProfiles(): Promise<void> {
    const profiles = await fetchAllUserProfiles()
    dispatch({ type: 'SET_USER_PROFILES', profiles })
  }

  async function setRegistrationStatus(id: string, status: RegistrationStatus): Promise<void> {
    const reg = state.registrations.find(r => r.id === id)
    const prevStatus = reg?.status
    await updateRegistrationStatus(id, status)
    dispatch({ type: 'UPDATE_REGISTRATION_STATUS', id, status })
    if (reg) {
      const fullName = `${reg.firstName} ${reg.lastName}`.trim()
      if (status === 'confirmed' && prevStatus !== 'confirmed') {
        await addTripParticipant(reg.tripId, fullName)
        dispatch({ type: 'UPDATE_TRIP_PARTICIPANTS', tripId: reg.tripId, name: fullName, action: 'add' })
      } else if (prevStatus === 'confirmed' && status !== 'confirmed') {
        await removeTripParticipant(reg.tripId, fullName)
        dispatch({ type: 'UPDATE_TRIP_PARTICIPANTS', tripId: reg.tripId, name: fullName, action: 'remove' })
      }
    }
  }

  async function removeRegistration(id: string): Promise<void> {
    await deleteRegistration(id)
    dispatch({ type: 'DELETE_REGISTRATION', id })
  }

  async function removeUserProfile(uid: string): Promise<void> {
    await deleteUserProfile(uid)
    dispatch({ type: 'DELETE_USER_PROFILE', uid })
  }

  async function toggleAdminUid(uid: string): Promise<void> {
    const current = state.settings.adminUids ?? []
    const action = current.includes(uid) ? 'remove' : 'add'
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    // Send a single-UID mutation — server reads Firestore authoritatively so no
    // stale client state can corrupt the list
    const apiRes = await apiFetch('/api/set-admin-uids', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, action }),
    })
    const resBody = await apiRes.json().catch(() => ({})) as { adminUids?: string[]; error?: string }
    if (!apiRes.ok) throw new Error(resBody.error ?? `API error ${apiRes.status}`)
    // Use the server's returned adminUids as the new source of truth
    const freshUids: string[] = resBody.adminUids ?? [...(state.settings.adminUids ?? []), uid]
    const newSettings = { ...state.settings, adminUids: freshUids }
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings })
    try { localStorage.setItem('dafagram:settings', JSON.stringify(newSettings)) } catch {}
  }

  async function banUser(uid: string, banned: boolean): Promise<void> {
    await setUserBanned(uid, banned)
    dispatch({ type: 'SET_USER_BANNED', uid, banned })
  }

  async function editUserProfile(uid: string, fields: { firstName: string; lastName: string; passportFirstName: string; passportLastName: string; medicalInfo: string | null; jobRole: string | null; salesDivision: string | null }): Promise<void> {
    await adminUpdateUserProfile(uid, fields)
    dispatch({ type: 'UPDATE_USER_PROFILE', uid, fields })
  }

async function togglePin(id: string, pinned: boolean): Promise<void> {
    await togglePinPost(id, pinned)
    dispatch({ type: 'UPDATE_POST', post: { ...state.posts.find(p => p.id === id)!, pinned } })
  }

  async function addPost(post: Post, newDataUrls: string[], staffImageDataUrl: string | null): Promise<void> {
    const uploaded = await Promise.all(newDataUrls.map(url => uploadImage(url, post.id)))
    let finalPost = { ...post, images: uploaded.map((r) => r.url) }
    let staffImagePath: string | null = null
    if (staffImageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(staffImageDataUrl, `staff-${post.id}`)
      finalPost = { ...finalPost, staffImage: result.url }
      staffImagePath = result.path
    }
    await insertPost(finalPost, uploaded.map((r) => r.path), staffImagePath)
    dispatch({ type: 'ADD_POST', post: finalPost })
  }

  async function editPost(post: Post, newDataUrls: string[], staffImageDataUrl: string | null): Promise<void> {
    const keptPaths = post.images
      .map((url) => extractStoragePath(url, BUCKET))
      .filter((p): p is string => p !== null)
    const uploaded = await Promise.all(newDataUrls.map(url => uploadImage(url, post.id)))
    let finalPost = { ...post, images: [...post.images, ...uploaded.map((r) => r.url)] }
    let newStaffImagePath: string | null | undefined = undefined
    if (staffImageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(staffImageDataUrl, `staff-${post.id}`)
      finalPost = { ...finalPost, staffImage: result.url }
      newStaffImagePath = result.path
    } else if (staffImageDataUrl === null && post.staffImage === null) {
      newStaffImagePath = null
    }
    await updatePost(finalPost, [...keptPaths, ...uploaded.map((r) => r.path)], newStaffImagePath)
    const wasPending = state.pendingPosts.some(p => p.id === finalPost.id)
    if (wasPending && finalPost.status === 'approved') {
      dispatch({ type: 'SET_PENDING', posts: state.pendingPosts.filter(p => p.id !== finalPost.id) })
      dispatch({ type: 'ADD_POST', post: finalPost })
    } else {
      dispatch({ type: 'UPDATE_POST', post: finalPost })
    }
  }

  async function deletePost(id: string): Promise<void> {
    await removePost(id)
    dispatch({ type: 'DELETE_POST', id })
  }


  async function submitReview(submission: Submission, imageDataUrls: string[]): Promise<void> {
    const uploadedResults = await Promise.all(imageDataUrls.map((url, i) => uploadImage(url, `${submission.id}-${i}`)))
    const uploadedImages = uploadedResults.map(r => r.url)
    const uploadedPaths = uploadedResults.map(r => r.path)

    // Build a Post from the Submission and insert as pending
    const post: Post = {
      id: submission.id,
      title: submission.name, // use location/name as title fallback
      staff: submission.staff || submission.name,
      staffImage: null,
      review: submission.review,
      location: submission.location,
      locationId: null,
      date: submission.date,
      tags: [],
      images: uploadedImages,
      pinned: false,
      extras: submission.extras,
      salesNote: submission.salesNote ?? null,
      userId: null,
      status: 'pending',
    }

    await submitPendingPost(post, uploadedPaths)
    // Don't add to state.posts — it's pending, not approved
  }

  async function editSubmission(submission: Submission, newDataUrls: string[]): Promise<void> {
    const uploaded = await Promise.all(newDataUrls.map(url => uploadImage(url, submission.id)))
    const finalSubmission = {
      ...submission,
      images: [...submission.images, ...uploaded.map((r) => r.url)],
    }
    await updateSubmission(finalSubmission, uploaded.map((r) => r.path))
    dispatch({ type: 'UPDATE_SUBMISSION', submission: finalSubmission })
  }

  async function deleteSubmission(id: string): Promise<void> {
    await removeSubmission(id)
    dispatch({ type: 'DELETE_SUBMISSION', id })
  }

  async function addTrip(trip: Trip, imageDataUrl: string | null): Promise<void> {
    let finalTrip = trip
    let imagePath: string | null = null
    if (imageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(imageDataUrl, `trip-${trip.id}`)
      finalTrip = { ...trip, image: result.url }
      imagePath = result.path
    }
    await insertTrip(finalTrip, imagePath)
    dispatch({ type: 'ADD_TRIP', trip: finalTrip })
  }

  async function editTrip(trip: Trip, imageDataUrl: string | null): Promise<void> {
    let finalTrip = trip
    let newImagePath: string | null | undefined = undefined
    if (imageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(imageDataUrl, `trip-${trip.id}`)
      finalTrip = { ...trip, image: result.url }
      newImagePath = result.path
    } else if (imageDataUrl === null && trip.image === null) {
      newImagePath = null
    }
    await updateTrip(finalTrip, newImagePath)
    dispatch({ type: 'UPDATE_TRIP', trip: finalTrip })
  }

  async function deleteTrip(id: string): Promise<void> {
    await removeTrip(id)
    dispatch({ type: 'DELETE_TRIP', id })
  }

  async function completeTrip(trip: Trip): Promise<void> {
    const completed = { ...trip, completed: true }
    await markTripComplete(trip.id)
    dispatch({ type: 'UPDATE_TRIP', trip: completed })
  }

  async function addLocation(location: Location): Promise<void> {
    await insertLocation(location)
    dispatch({ type: 'ADD_LOCATION', location })
  }

  async function editLocation(location: Location): Promise<void> {
    await updateLocation(location)
    dispatch({ type: 'UPDATE_LOCATION', location })
  }

  async function deleteLocation(id: string): Promise<void> {
    await removeLocation(id)
    dispatch({ type: 'DELETE_LOCATION', id })
  }

  async function saveSettings(settings: Settings): Promise<void> {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const apiRes = await apiFetch('/api/save-settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: settings.title,
        heading: settings.heading,
        color: settings.color,
        password: settings.password,
        welcome: settings.welcome,
        notice: settings.notice ?? '',
        departureName: settings.departureAirport?.name ?? 'LHR',
        departureLat: settings.departureAirport?.lat ?? 51.5074,
        departureLng: settings.departureAirport?.lng ?? -0.1278,
        adminFolders: settings.adminFolders ?? [],
        panelImages: settings.panelImages,
      }),
    })
    if (!apiRes.ok) {
      const body = await apiRes.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? `API error ${apiRes.status}`)
    }
    dispatch({ type: 'UPDATE_SETTINGS', settings })
  }

  async function savePageImages(images: PanelImages, dataUrls: Partial<Record<keyof PanelImages, string | null>>): Promise<void> {
    const keys = ['feed', 'map', 'courses', 'years', 'submit'] as const
    const results = await Promise.all(
      keys.map(key => {
        const dataUrl = dataUrls[key]
        return dataUrl?.startsWith('data:') ? uploadImage(dataUrl, `panel-${key}`) : Promise.resolve(null)
      })
    )
    const uploaded = { ...images }
    keys.forEach((key, i) => { if (results[i]) uploaded[key] = results[i]!.url })
    const newSettings = { ...state.settings, panelImages: uploaded }
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const apiRes = await apiFetch('/api/save-settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ panelImages: uploaded }),
    })
    if (!apiRes.ok) {
      const body = await apiRes.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? `API error ${apiRes.status}`)
    }
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings })
  }

  return (
    <AppContext.Provider value={{
      state, dispatch,
      togglePin,
      addPost, editPost, deletePost,

      submitReview, editSubmission, deleteSubmission,
      addTrip, editTrip, deleteTrip, completeTrip,
      addLocation, editLocation, deleteLocation,
      saveSettings, savePageImages,
      approvePostFn, fetchPending, loadRegistrations, setRegistrationStatus, removeRegistration, removeUserProfile, loadUserProfiles, loadMyRegistrations, toggleAdminUid, banUser, editUserProfile,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

