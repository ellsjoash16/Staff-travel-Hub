import { X, ImagePlus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  review: string
  images: string[]          // full images array: [hero, img2, img3, ...]
  onReviewChange: (v: string) => void
}

// images[0] = hero (managed elsewhere)
// images[1..] = insertable photos
// review text uses '\n---\n' as internal separator — users never see it

export function BlogEditor({ review, images, onReviewChange }: Props) {
  const insertable = images.slice(1)
  const sections = review ? review.split('\n---\n') : ['']
  const placedCount = sections.length - 1
  const nextImage = insertable[placedCount]

  function updateSection(i: number, val: string) {
    const s = [...sections]
    s[i] = val
    onReviewChange(s.join('\n---\n'))
  }

  function insertAfter(i: number) {
    const s = [...sections]
    s.splice(i + 1, 0, '')
    onReviewChange(s.join('\n---\n'))
  }

  function removeAt(i: number) {
    const s = [...sections]
    const merged = [s[i], s[i + 1]].filter(Boolean).join('\n\n')
    s.splice(i, 2, merged)
    onReviewChange(s.join('\n---\n'))
  }

  return (
    <div className="space-y-2">
      {sections.map((section, i) => (
        <div key={i} className="space-y-2">
          <Textarea
            placeholder={i === 0 ? 'Write your review...' : 'Continue writing...'}
            value={section}
            onChange={e => updateSection(i, e.target.value)}
            className="min-h-[110px]"
            spellCheck
          />

          {/* Placed image thumbnail */}
          {i < placedCount && insertable[i] && (
            <div className="relative group rounded-xl overflow-hidden border border-border/50 shadow-sm">
              <img
                src={insertable[i]}
                alt=""
                className="w-full object-cover max-h-56"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                title="Remove photo from here"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                Photo {i + 2}
              </span>
            </div>
          )}

          {/* Insert next available photo */}
          {i === placedCount && nextImage && (
            <button
              type="button"
              onClick={() => insertAfter(i)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <img
                src={nextImage}
                alt=""
                className="h-10 w-16 object-cover rounded-lg flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                <ImagePlus className="h-4 w-4" />
                Insert photo {placedCount + 2} here
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
