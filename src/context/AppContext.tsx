import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import type { Post, Course, Submission, Settings, View, PanelImages } from '@/lib/types'
import {
  fetchPosts, fetchCourses, fetchSettings, fetchSubmissions,
  insertPost, updatePost, removePost,
  insertCourse, updateCourse, removeCourse,
  insertSubmission, removeSubmission,
  upsertSettings, uploadImage, DEFAULT_SETTINGS,
} from '@/lib/db'
import { hexToHsl, extractStoragePath } from '@/lib/utils'

const BUCKET = 'post-images'

export interface MapTarget { lat: number; lng: number; label: string }

interface AppState {
  posts: Post[]
  courses: Course[]
  submissions: Submission[]
  settings: Settings
  isAdmin: boolean
  activeView: View
  activeFilter: string | null
  loading: boolean
  mapTarget: MapTarget | null
}

type Action =
  | { type: 'INIT'; posts: Post[]; courses: Course[]; submissions: Submission[]; settings: Settings }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SET_FILTER'; filter: string | null }
  | { type: 'SET_ADMIN'; value: boolean }
  | { type: 'ADD_POST'; post: Post }
  | { type: 'UPDATE_POST'; post: Post }
  | { type: 'DELETE_POST'; id: string }
  | { type: 'ADD_COURSE'; course: Course }
  | { type: 'UPDATE_COURSE'; course: Course }
  | { type: 'DELETE_COURSE'; id: string }
  | { type: 'ADD_SUBMISSION'; submission: Submission }
  | { type: 'DELETE_SUBMISSION'; id: string }
  | { type: 'UPDATE_SETTINGS'; settings: Settings }
  | { type: 'SET_MAP_TARGET'; target: MapTarget | null }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
      return { ...state, posts: action.posts, courses: action.courses, submissions: action.submissions, settings: action.settings }
    case 'SET_LOADING': return { ...state, loading: action.value }
    case 'SET_VIEW': return { ...state, activeView: action.view }
    case 'SET_FILTER': return { ...state, activeFilter: action.filter }
    case 'SET_ADMIN': return { ...state, isAdmin: action.value }
    case 'ADD_POST': return { ...state, posts: [action.post, ...state.posts] }
    case 'UPDATE_POST': return { ...state, posts: state.posts.map((p) => p.id === action.post.id ? action.post : p) }
    case 'DELETE_POST': return { ...state, posts: state.posts.filter((p) => p.id !== action.id) }
    case 'ADD_COURSE': return { ...state, courses: [action.course, ...state.courses] }
    case 'UPDATE_COURSE': return { ...state, courses: state.courses.map((c) => c.id === action.course.id ? action.course : c) }
    case 'DELETE_COURSE': return { ...state, courses: state.courses.filter((c) => c.id !== action.id) }
    case 'ADD_SUBMISSION': return { ...state, submissions: [action.submission, ...state.submissions] }
    case 'DELETE_SUBMISSION': return { ...state, submissions: state.submissions.filter((s) => s.id !== action.id) }
    case 'UPDATE_SETTINGS': return { ...state, settings: action.settings }
    case 'SET_MAP_TARGET': return { ...state, mapTarget: action.target }
    default: return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  addPost: (post: Post, newDataUrls: string[], staffImageDataUrl: string | null) => Promise<void>
  editPost: (post: Post, newDataUrls: string[], staffImageDataUrl: string | null) => Promise<void>
  deletePost: (id: string) => Promise<void>
  addCourse: (course: Course, imageDataUrl: string | null) => Promise<void>
  editCourse: (course: Course, imageDataUrl: string | null) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
  submitReview: (submission: Submission, imageDataUrls: string[]) => Promise<void>
  deleteSubmission: (id: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  savePageImages: (images: PanelImages, dataUrls: Partial<Record<keyof PanelImages, string | null>>) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    posts: [], courses: [], submissions: [],
    settings: DEFAULT_SETTINGS,
    isAdmin: false, activeView: 'home', activeFilter: null, loading: true, mapTarget: null,
  })

  useEffect(() => {
    async function init() {
      try {
        const [posts, courses, submissions, settings] = await Promise.all([
          fetchPosts(), fetchCourses(), fetchSubmissions(), fetchSettings(),
        ])
        dispatch({ type: 'INIT', posts, courses, submissions, settings })
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

  async function addPost(post: Post, newDataUrls: string[], staffImageDataUrl: string | null): Promise<void> {
    const uploaded = await Promise.all(newDataUrls.map((url) => uploadImage(url, post.id)))
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
    const uploaded = await Promise.all(newDataUrls.map((url) => uploadImage(url, post.id)))
    let finalPost = { ...post, images: [...post.images, ...uploaded.map((r) => r.url)] }
    let newStaffImagePath: string | null | undefined = undefined
    if (staffImageDataUrl?.startsWith('data:')) {
      const result = await uploadImage(staffImageDataUrl, `staff-${post.id}`)
      finalPost = { ...finalPost, staffImage: result.url }
      newStaffImagePath = result.path
    } else if (staffImageDataUrl === null && post.staffImage === null) {
      newStaffImagePath = null
    }
    dispatch({ type: 'UPDATE_POST', post: finalPost })
    await updatePost(finalPost, [...keptPaths, ...uploaded.map((r) => r.path)], newStaffImagePath)
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
    dispatch({ type: 'UPDATE_COURSE', course: finalCourse })
    await updateCourse(finalCourse, newImagePath)
  }

  async function deleteCourse(id: string): Promise<void> {
    dispatch({ type: 'DELETE_COURSE', id })
    await removeCourse(id)
  }

  async function submitReview(submission: Submission, imageDataUrls: string[]): Promise<void> {
    const uploaded = await Promise.all(imageDataUrls.map((url) => uploadImage(url, submission.id)))
    const finalSubmission = { ...submission, images: uploaded.map((r) => r.url) }
    dispatch({ type: 'ADD_SUBMISSION', submission: finalSubmission })
    await insertSubmission(finalSubmission, uploaded.map((r) => r.path))
  }

  async function deleteSubmission(id: string): Promise<void> {
    dispatch({ type: 'DELETE_SUBMISSION', id })
    await removeSubmission(id)
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
    await upsertSettings(newSettings)
  }

  return (
    <AppContext.Provider value={{
      state, dispatch,
      addPost, editPost, deletePost,
      addCourse, editCourse, deleteCourse,
      submitReview, deleteSubmission,
      saveSettings, savePageImages,
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
