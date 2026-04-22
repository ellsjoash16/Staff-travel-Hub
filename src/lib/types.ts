export interface PostLocation {
  name: string
  lat: number | null
  lng: number | null
}

export interface Location {
  id: string
  name: string
  country: string
}

export interface ReviewItem {
  name: string
  rating: number
  description: string
}

export interface PostExtras {
  hotels: ReviewItem[]
  airlines: ReviewItem[]
  cruises: ReviewItem[]
  activities: ReviewItem[]
}

export interface Post {
  id: string
  title: string
  staff: string
  staffImage: string | null
  review: string
  location: PostLocation
  locationId: string | null
  date: string
  tags: string[]
  images: string[]
  pinned: boolean
  extras: PostExtras
  userId: string | null
  status: 'pending' | 'approved'
}

export interface Course {
  id: string
  title: string
  description: string | null
  image: string | null
  riseUrl: string
  location: PostLocation
  locationId: string | null
}

export interface Submission {
  id: string
  name: string
  location: PostLocation
  date: string
  review: string
  images: string[]
  showOnMap: boolean
  extras: PostExtras
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

export interface Trip {
  id: string
  name: string
  participants: string[]
  date: string
  image: string | null
  locationId: string | null
}

export type View = 'home' | 'feed' | 'map' | 'courses' | 'years' | 'submit' | 'settings' | 'pending'
