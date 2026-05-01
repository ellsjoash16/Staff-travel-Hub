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
  airlines: ReviewItem[]
  hotels: ReviewItem[]
  cruises: ReviewItem[]
  activities: ReviewItem[]
  dmcs: ReviewItem[]
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
  salesNote: string | null
  userId: string | null
  status: 'pending' | 'approved'
  folder?: string | null
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
  staff?: string
  location: PostLocation
  date: string
  review: string
  images: string[]
  showOnMap: boolean
  extras: PostExtras
  salesNote: string | null
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
  adminFolders: string[]
  adminUids: string[]
}

export interface Trip {
  id: string
  name: string
  description: string | null
  participants: string[]
  date: string
  image: string | null
  locationId: string | null
  external: boolean
  completed: boolean
  international: boolean
  showRegisterInterest: boolean
}

export type RegistrationStatus = 'requested' | 'pending_confirmation' | 'confirmed' | 'refused'

export interface UserProfile {
  uid: string
  authEmail: string | null
  authDisplayName: string | null
  firstName: string
  lastName: string
  passportNumber: string
  passportFirstName: string
  passportMiddleNames: string | null
  passportLastName: string
  dob: string
  medicalInfo: string | null
  dataConsent: boolean
}

export interface Registration {
  id: string
  tripId: string
  tripName: string
  uid: string | null
  firstName: string
  lastName: string
  email: string
  passportNumber: string
  passportFirstName: string
  passportMiddleNames: string | null
  passportLastName: string
  dob: string
  medicalInfo: string | null
  dataConsent: boolean
  status: RegistrationStatus
}

export type View = 'home' | 'feed' | 'map' | 'upcoming' | 'years' | 'submit' | 'settings' | 'pending' | 'interest'
