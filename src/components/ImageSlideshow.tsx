import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  alt?: string
  className?: string
}

export function ImageSlideshow({ images, alt = '', className = '' }: Props) {
  const [index, setIndex] = useState(0)

  if (images.length === 0) return null

  if (images.length === 1) {
    return <img src={images[0]} alt={alt} className={className} />
  }

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex((i) => (i - 1 + images.length) % images.length)
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex((i) => (i + 1) % images.length)
  }

  return (
    <div className="relative group">
      <img src={images[index]} alt={alt} className={className} />

      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setIndex(i) }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-white scale-125' : 'bg-white/50'}`}
          />
        ))}
      </div>

      {/* Count badge */}
      {images.length > 1 && (
        <span className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-0.5">
          {index + 1}/{images.length}
        </span>
      )}
    </div>
  )
}
