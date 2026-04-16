export interface PostLocation {
  name: string
  lat: number | null
  lng: number | null
}

export interface Post {
  id: string
  title: string
  staff: string
  staffImage: string | null
  review: string
  location: PostLocation
  date: string
  tags: string[]
  images: string[]
  showFlightPath: boolean
}

export interface Course {
  id: string
  title: string
  description: string | null
  image: string | null
  riseUrl: string
  location: PostLocation
  showOnMap: boolean
}

export interface Submission {
  id: string
  name: string
  location: PostLocation
  date: string
  review: string
  images: string[]
}

export interface PanelImages {
  feed: string | null
  map: string | null
  courses: string | null
  years: string | null
  submit: string | null
}

export interface Settings {
  title: string
  heading: string
  color: string
  password: string
  welcome: string
  departureAirport: { name: string; lat: number; lng: number }
  panelImages: PanelImages
}

export type View = 'home' | 'feed' | 'map' | 'courses' | 'years' | 'submit'
