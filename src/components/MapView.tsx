import { MapViewGlobe } from './MapViewGlobe'
import type { Post } from '@/lib/types'

interface Props { onSelectPost: (post: Post) => void }

export function MapView({ onSelectPost }: Props) {
  return <MapViewGlobe onSelectPost={onSelectPost} />
}
