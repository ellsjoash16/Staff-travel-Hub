import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import type { Post, Course, Submission, Settings, View, PanelImages, Trip, Location } from '@/lib/types'
import {
  fetchPosts, fetchCourses, fetchSettings, fetchSubmissions, fetchTrips, fetchLocations,
  insertPost, updatePost, removePost, togglePinPost,
  insertCourse, updateCourse, removeCourse,
  updateSubmission, removeSubmission,
  insertTrip, updateTrip, removeTrip,
  insertLocation, updateLocation, removeLocation,
  upsertSettings, updatePanelImages, uploadImage, DEFAULT_SETTINGS,
  fetchPendingPosts, approvePost, submitPendingPost,
} from '@/lib/db'
import { hexToHsl, extractStoragePath } from '@/lib/utils'

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
}

type Action =
  | { type: 'INIT'; posts: Post[]; courses: Course[]; submissions: Submission[]; trips: Trip[]; locations: Location[]; settings: Settings }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SET_FILTER'; filter: string | null }
  | { type: 'SET_ADMIN'; value: boolean }
  | { type: 'SET_PENDING'; posts: Post[] }
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
  addLocation: (location: Location) => Promise<void>
  editLocation: (location: Location) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  savePageImages: (images: PanelImages, dataUrls: Partial<Record<keyof PanelImages, string | null>>) => Promise<void>
  approvePostFn: (id: string) => Promise<void>
  fetchPending: () => Promise<void>
  promoteToAdmin: (appPassword: string) => Promise<boolean>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    posts: [], courses: [], submissions: [], trips: [], locations: [],
    settings: DEFAULT_SETTINGS,
    isAdmin: false, activeView: 'home', activeFilter: null, loading: true,
    pendingPosts: [],
  })

  // Initial data load
  useEffect(() => {
    async function init() {
      try {
        const [postsRes, coursesRes, submissionsRes, tripsRes, locationsRes, settingsRes] = await Promise.allSettled([
          fetchPosts(),
          fetchCourses(),
          fetchSubmissions(),
          fetchTrips(),
          fetchLocations(),
          fetchSettings(),
        ])
        dispatch({
          type: 'INIT',
          posts: postsRes.status === 'fulfilled' ? postsRes.value : [],
          courses: coursesRes.status === 'fulfilled' ? coursesRes.value : [],
          submissions: submissionsRes.status === 'fulfilled' ? submissionsRes.value : [],
          trips: tripsRes.status === 'fulfilled' ? tripsRes.value : [],
          locations: locationsRes.status === 'fulfilled' ? locationsRes.value : [],
          settings: settingsRes.status === 'fulfilled' ? settingsRes.value : DEFAULT_SETTINGS,
        })
      } finally {
        dispatch({ type: 'SET_LOADING', value: false })
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

  async function promoteToAdmin(appPassword: string): Promise<boolean> {
    if (appPassword !== state.settings.password) return false
    dispatch({ type: 'SET_ADMIN', value: true })
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
    let uploadedImages: string[] = []
    let uploadedPaths: string[] = []
    try {
      const results = await Promise.all(imageDataUrls.map((url, i) => uploadImage(url, `${submission.id}-${i}`)))
      uploadedImages = results.map((r) => r.url)
      uploadedPaths = results.map((r) => r.path)
    } catch {
      // Storage may restrict uploads
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
      userId: null,
      status: 'pending',
    }

    await submitPendingPost(post, uploadedPaths)
    // Don't add to state.posts — it's pending, not approved
  }

  async function editSubmission(submission: Submission, newDataUrls: string[]): Promise<void> {
    const uploaded = await Promise.all(newDataUrls.map((url) => uploadImage(url, submission.id)))
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
      addTrip, editTrip, deleteTrip,
      addLocation, editLocation, deleteLocation,
      saveSettings, savePageImages,
      approvePostFn, fetchPending, promoteToAdmin,
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

