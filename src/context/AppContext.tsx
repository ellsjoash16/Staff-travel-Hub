import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import type { Post, Course, Submission, Settings, View, PanelImages, Trip, Location, Registration, RegistrationStatus, UserProfile } from '@/lib/types'
import {
  fetchPosts, fetchCourses, fetchSettings, fetchSubmissions, fetchTrips, fetchLocations,
  insertPost, updatePost, removePost, togglePinPost,
  insertCourse, updateCourse, removeCourse,
  updateSubmission, removeSubmission,
  insertTrip, updateTrip, removeTrip, markTripComplete,
  insertLocation, updateLocation, removeLocation,
  upsertSettings, updatePanelImages, setAdminUids, uploadImage, DEFAULT_SETTINGS,
  fetchPendingPosts, approvePost, submitPendingPost,
  fetchRegistrations, fetchMyRegistrations, updateRegistrationStatus, addTripParticipant, removeTripParticipant, deleteRegistration, deleteUserProfile,
  fetchAllUserProfiles,
} from '@/lib/db'
import { hexToHsl, extractStoragePath } from '@/lib/utils'
import { auth } from '@/lib/firebase'

const BUCKET = 'post-images'

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
}

type Action =
  | { type: 'INIT'; posts: Post[]; courses: Course[]; submissions: Submission[]; trips: Trip[]; locations: Location[]; settings: Settings }
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
  | { type: 'SET_MY_REGISTRATIONS'; registrations: Registration[] }
  | { type: 'ADD_MY_REGISTRATION'; registration: Registration }
  | { type: 'UPDATE_TRIP_PARTICIPANTS'; tripId: string; name: string; action: 'add' | 'remove' }
  | { type: 'APPROVE_POST'; id: string }
  | { type: 'ADD_POST'; post: Post }
  | { type: 'UPDATE_POST'; post: Post }
  | { type: 'DELETE_POST'; id: string }
  | { type: 'ADD_COURSE'; course: Course }
  | { type: 'UPDATE_COURSE'; course: Course }
  | { type: 'DELETE_COURSE'; id: string }
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
      return { ...state, posts: action.posts, courses: action.courses, submissions: action.submissions, trips: action.trips, locations: action.locations, settings: action.settings }
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
    case 'SET_MY_REGISTRATIONS': return { ...state, myRegistrations: action.registrations }
    case 'ADD_MY_REGISTRATION': return { ...state, myRegistrations: [...state.myRegistrations, action.registration] }
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
    case 'ADD_COURSE': return { ...state, courses: [action.course, ...state.courses] }
    case 'UPDATE_COURSE': return { ...state, courses: state.courses.map((c) => c.id === action.course.id ? action.course : c) }
    case 'DELETE_COURSE': return { ...state, courses: state.courses.filter((c) => c.id !== action.id) }
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
  addCourse: (course: Course, imageDataUrl: string | null) => Promise<void>
  editCourse: (course: Course, imageDataUrl: string | null) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
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
  promoteToAdmin: (appPassword: string) => Promise<boolean>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    posts: [], courses: [], submissions: [], trips: [], locations: [],
    settings: DEFAULT_SETTINGS,
    isAdmin: false, activeView: 'home', activeFilter: null, loading: true,
    pendingPosts: [], registrations: [], userProfiles: [], myRegistrations: [],
  })

  // Initial data load
  useEffect(() => {
    async function init() {
      try {
        const [postsRes, tripsRes, locationsRes, settingsRes] = await Promise.allSettled([
          fetchPosts(),
          fetchTrips(),
          fetchLocations(),
          fetchSettings(),
        ])
        dispatch({
          type: 'INIT',
          posts: postsRes.status === 'fulfilled' ? postsRes.value : [],
          courses: [],
          submissions: [],
          trips: tripsRes.status === 'fulfilled' ? tripsRes.value : [],
          locations: locationsRes.status === 'fulfilled' ? locationsRes.value : [],
          settings: settingsRes.status === 'fulfilled' ? settingsRes.value : DEFAULT_SETTINGS,
        })
      } finally {
        dispatch({ type: 'SET_LOADING', value: false })
      }
      // Auto-grant admin if UID is in adminUids list
      const uid = auth.currentUser?.uid
      if (uid) {
        const settings = settingsRes.status === 'fulfilled' ? settingsRes.value : DEFAULT_SETTINGS
        if (settings.adminUids?.includes(uid)) {
          dispatch({ type: 'SET_ADMIN', value: true })
        }
        fetchMyRegistrations(uid).then(regs => dispatch({ type: 'SET_MY_REGISTRATIONS', registrations: regs })).catch(() => {})
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
    dispatch({ type: 'APPROVE_POST', id })
    await approvePost(id)
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
    dispatch({ type: 'UPDATE_REGISTRATION_STATUS', id, status })
    await updateRegistrationStatus(id, status)
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
    const updated = current.includes(uid) ? current.filter(u => u !== uid) : [...current, uid]
    const newSettings = { ...state.settings, adminUids: updated }
    await setAdminUids(updated)
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings })
  }

  async function promoteToAdmin(appPassword: string): Promise<boolean> {
    if (appPassword !== state.settings.password) return false
    dispatch({ type: 'SET_ADMIN', value: true })
    // Also add this UID to adminUids so Firestore rules grant write access
    const uid = auth.currentUser?.uid
    if (uid && !state.settings.adminUids?.includes(uid)) {
      const updated = [...(state.settings.adminUids ?? []), uid]
      const newSettings = { ...state.settings, adminUids: updated }
      await setAdminUids(updated)
      dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings })
    }
    return true
  }

  async function togglePin(id: string, pinned: boolean): Promise<void> {
    dispatch({ type: 'UPDATE_POST', post: { ...state.posts.find(p => p.id === id)!, pinned } })
    await togglePinPost(id, pinned)
  }

  async function addPost(post: Post, newDataUrls: string[], staffImageDataUrl: string | null): Promise<void> {
    const uploaded: { url: string; path: string }[] = []
    for (const url of newDataUrls) uploaded.push(await uploadImage(url, post.id))
    let finalPost = { ...post, images: uploaded.map((r) => r.url) }
    let staffImagePath: string | null = null
    if (staffImageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(staffImageDataUrl, `staff-${post.id}`)
      finalPost = { ...finalPost, staffImage: result.url }
      staffImagePath = result.path
    }
    dispatch({ type: 'ADD_POST', post: finalPost })
    await insertPost(finalPost, uploaded.map((r) => r.path), staffImagePath)
  }

  async function editPost(post: Post, newDataUrls: string[], staffImageDataUrl: string | null): Promise<void> {
    const keptPaths = post.images
      .map((url) => extractStoragePath(url, BUCKET))
      .filter((p): p is string => p !== null)
    const uploaded: { url: string; path: string }[] = []
    for (const url of newDataUrls) uploaded.push(await uploadImage(url, post.id))
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
    dispatch({ type: 'DELETE_POST', id })
    await removePost(id)
  }

  async function addCourse(course: Course, imageDataUrl: string | null): Promise<void> {
    let finalCourse = course
    let imagePath: string | null = null
    if (imageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(imageDataUrl, course.id)
      finalCourse = { ...course, image: result.url }
      imagePath = result.path
    }
    dispatch({ type: 'ADD_COURSE', course: finalCourse })
    await insertCourse(finalCourse, imagePath)
  }

  async function editCourse(course: Course, imageDataUrl: string | null): Promise<void> {
    let finalCourse = course
    let newImagePath: string | null | undefined = undefined
    if (imageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(imageDataUrl, course.id)
      finalCourse = { ...course, image: result.url }
      newImagePath = result.path
    } else if (imageDataUrl === null && course.image === null) {
      newImagePath = null
    }
    await updateCourse(finalCourse, newImagePath)
    dispatch({ type: 'UPDATE_COURSE', course: finalCourse })
  }

  async function deleteCourse(id: string): Promise<void> {
    dispatch({ type: 'DELETE_COURSE', id })
    await removeCourse(id)
  }

  async function submitReview(submission: Submission, imageDataUrls: string[]): Promise<void> {
    const uploadedImages: string[] = []
    const uploadedPaths: string[] = []
    for (let i = 0; i < imageDataUrls.length; i++) {
      const result = await uploadImage(imageDataUrls[i], `${submission.id}-${i}`)
      uploadedImages.push(result.url)
      uploadedPaths.push(result.path)
    }

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
    const uploaded: { url: string; path: string }[] = []
    for (const url of newDataUrls) uploaded.push(await uploadImage(url, submission.id))
    const finalSubmission = {
      ...submission,
      images: [...submission.images, ...uploaded.map((r) => r.url)],
    }
    await updateSubmission(finalSubmission, uploaded.map((r) => r.path))
    dispatch({ type: 'UPDATE_SUBMISSION', submission: finalSubmission })
  }

  async function deleteSubmission(id: string): Promise<void> {
    dispatch({ type: 'DELETE_SUBMISSION', id })
    await removeSubmission(id)
  }

  async function addTrip(trip: Trip, imageDataUrl: string | null): Promise<void> {
    let finalTrip = trip
    let imagePath: string | null = null
    if (imageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(imageDataUrl, `trip-${trip.id}`)
      finalTrip = { ...trip, image: result.url }
      imagePath = result.path
    }
    dispatch({ type: 'ADD_TRIP', trip: finalTrip })
    await insertTrip(finalTrip, imagePath)
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
    dispatch({ type: 'DELETE_TRIP', id })
    await removeTrip(id)
  }

  async function completeTrip(trip: Trip): Promise<void> {
    const completed = { ...trip, completed: true }
    dispatch({ type: 'UPDATE_TRIP', trip: completed })
    await markTripComplete(trip.id)
  }

  async function addLocation(location: Location): Promise<void> {
    dispatch({ type: 'ADD_LOCATION', location })
    await insertLocation(location)
  }

  async function editLocation(location: Location): Promise<void> {
    dispatch({ type: 'UPDATE_LOCATION', location })
    await updateLocation(location)
  }

  async function deleteLocation(id: string): Promise<void> {
    dispatch({ type: 'DELETE_LOCATION', id })
    await removeLocation(id)
  }

  async function saveSettings(settings: Settings): Promise<void> {
    dispatch({ type: 'UPDATE_SETTINGS', settings })
    await upsertSettings(settings)
  }

  async function savePageImages(images: PanelImages, dataUrls: Partial<Record<keyof PanelImages, string | null>>): Promise<void> {
    const uploaded = { ...images }
    for (const key of ['feed', 'map', 'courses', 'years', 'submit'] as const) {
      const dataUrl = dataUrls[key]
      if (dataUrl?.startsWith('data:')) {
        const result = await uploadImage(dataUrl, `panel-${key}`)
        uploaded[key] = result.url
      }
    }
    const newSettings = { ...state.settings, panelImages: uploaded }
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings })
    await updatePanelImages(uploaded)
  }

  return (
    <AppContext.Provider value={{
      state, dispatch,
      togglePin,
      addPost, editPost, deletePost,
      addCourse, editCourse, deleteCourse,
      submitReview, editSubmission, deleteSubmission,
      addTrip, editTrip, deleteTrip, completeTrip,
      addLocation, editLocation, deleteLocation,
      saveSettings, savePageImages,
      approvePostFn, fetchPending, loadRegistrations, setRegistrationStatus, removeRegistration, removeUserProfile, loadUserProfiles, loadMyRegistrations, toggleAdminUid, promoteToAdmin,
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

