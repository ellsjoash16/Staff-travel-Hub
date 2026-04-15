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

export interface Settings {
  title: string
  heading: string
  color: string
  password: string
  welcome: string
  departureAirport: { name: string; lat: number; lng: number }
}

export type View = 'feed' | 'map' | 'courses' | 'years' | 'submit'
