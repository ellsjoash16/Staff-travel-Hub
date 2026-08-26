import { MapViewGlobe } from './MapViewGlobe'
import type { Post } from '@/lib/types'

interface Props { onSelectPost: (post: Post) => void; compact?: boolean }

export function MapView({ onSelectPost, compact }: Props) {
  return <MapViewGlobe onSelectPost={onSelectPost} compact={compact} />
}
