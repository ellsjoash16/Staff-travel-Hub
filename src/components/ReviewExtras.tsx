import { useState } from 'react'
import { Plus, X, PencilSimple } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { PostExtras, ReviewItem } from '@/lib/types'

const MIN_DESC_WORDS = 100

function wordCount(s: string) {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length
}

const SECTIONS = [
  { key: 'airlines'   as const, label: 'Airlines',   singular: 'Airline',  img: '/airlines.jpg'    },
  { key: 'hotels'     as const, label: 'Hotels',     singular: 'Hotel',    img: '/hotels.webp'     },
  { key: 'cruises'    as const, label: 'Cruises',    singular: 'Cruise',   img: '/cruises.webp'    },
  { key: 'activities' as const, label: 'Activities', singular: 'Activity', img: '/activities.webp' },
  { key: 'dmcs'       as const, label: 'DMCs',       singular: 'DMC',      img: '/dmc.webp'        },
]

interface DraftState {
  category: keyof PostExtras
  editIndex: number | null  // null = adding new, number = editing existing
  name: string
  rating: number
  description: string
}

interface Props {
  value: PostExtras
  onChange: (extras: PostExtras) => void
}

export function ReviewExtras({ value, onChange }: Props) {
  const [draft, setDraft] = useState<DraftState | null>(null)

  function openAdd(key: keyof PostExtras) {
    setDraft({ category: key, editIndex: null, name: '', rating: 0, description: '' })
  }

  function openEdit(key: keyof PostExtras, index: number) {
    const item = (value[key] ?? [])[index]
    setDraft({ category: key, editIndex: index, name: item.name, rating: item.rating, description: item.description })
  }

  function removeItem(key: keyof PostExtras, index: number) {
    onChange({ ...value, [key]: (value[key] ?? []).filter((_, i) => i !== index) })
  }

  function saveDraft() {
    if (!draft || !draft.name.trim() || draft.rating === 0) return
    if (draft.description.trim() && wordCount(draft.description) < MIN_DESC_WORDS) return
    const newItem: ReviewItem = {
      name: draft.name.trim(),
      rating: draft.rating,
      description: draft.description.trim(),
    }
    const items = [...(value[draft.category] ?? [])]
    if (draft.editIndex !== null) {
      items[draft.editIndex] = newItem
    } else {
      items.push(newItem)
    }
    onChange({ ...value, [draft.category]: items })
    setDraft(null)
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map(({ key, label, singular, img }) => {
        const items: ReviewItem[] = value[key] ?? []
        const isOpen = draft?.category === key

        return (
          <div key={key} className="rounded-xl border border-border/60 overflow-hidden bg-card">
            {/* Section header */}
            <div className="relative flex items-center justify-between h-12 pr-3">
              <div className="absolute inset-y-0 left-0 w-24">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to right, transparent 40%, hsl(var(--card)) 100%)' }}
                />
              </div>
              <div className="relative flex items-center gap-2 pl-24 ml-2">
                <span className="text-sm font-semibold">{label}</span>
                {items.length > 0 && (
                  <span className="text-[11px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                )}
              </div>
              {!isOpen && (
                <button
                  type="button"
                  onClick={() => openAdd(key)}
                  className="relative flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                >
                  <Plus className="h-3 w-3" /> Add {singular}
                </button>
              )}
            </div>
            {(items.length > 0 || isOpen) && <div className="px-3 pb-3 pt-2 space-y-2">

            {/* Existing items */}
            {items.map((item, i) => {
              const isEditing = isOpen && draft?.editIndex === i
              if (isEditing) return null  // replaced by the edit form below
              return (
                <div key={i} className="bg-card rounded-lg p-2.5 border border-border/50">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-xs">{item.name}</p>
                        <span className="text-xs leading-none flex-shrink-0">
                          <span className="text-amber-400">{'★'.repeat(item.rating)}</span>
                          <span className="text-muted-foreground/30">{'★'.repeat(5 - item.rating)}</span>
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(key, i)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <PencilSimple className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(key, i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add / Edit form */}
            {isOpen && (
              <div className="space-y-2.5 bg-card rounded-lg p-3 border border-primary/20">
                <p className="text-xs font-medium text-muted-foreground">
                  {draft!.editIndex !== null ? `Editing ${singular}` : `New ${singular}`}
                </p>
                <Input
                  placeholder={`${singular} name`}
                  value={draft!.name}
                  onChange={e => setDraft(d => d ? { ...d, name: e.target.value } : d)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="space-y-1">
                  <p className="text-xs font-medium">
                    Star Rating <span className="text-destructive">*</span>
                    <span className="text-muted-foreground font-normal ml-1">— required to save</span>
                  </p>
                  <div className={`flex items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors ${draft!.rating === 0 ? 'bg-amber-500/8 border border-amber-500/25' : 'bg-muted/50'}`}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDraft(d => d ? { ...d, rating: n } : d)}
                        className={`text-2xl leading-none transition-colors px-0.5 ${n <= draft!.rating ? 'text-amber-400' : 'text-muted-foreground/25 hover:text-amber-300'}`}
                        aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                      >★</button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2 min-w-[2rem]">
                      {draft!.rating > 0 ? `${draft!.rating}/5` : 'Tap a star'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Textarea
                    placeholder="Description (optional)"
                    value={draft!.description}
                    onChange={e => setDraft(d => d ? { ...d, description: e.target.value } : d)}
                    className="text-sm min-h-[80px]"
                    spellCheck={true}
                  />
                  {(() => {
                    const wc = wordCount(draft!.description)
                    const hasText = draft!.description.trim().length > 0
                    const met = wc >= MIN_DESC_WORDS
                    if (!hasText) return (
                      <p className="text-xs text-muted-foreground">Minimum {MIN_DESC_WORDS} words required if applicable</p>
                    )
                    return (
                      <p className={`text-xs ${met ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
                        {wc} / {MIN_DESC_WORDS} words minimum{met ? ' ✓' : ''}
                      </p>
                    )
                  })()}
                </div>
                <div className="flex items-center justify-between">
                  {(() => {
                    const descTooShort = draft!.description.trim() && wordCount(draft!.description) < MIN_DESC_WORDS
                    const noName = !draft!.name.trim()
                    const noRating = draft!.rating === 0
                    if (noName && noRating) return <p className="text-xs text-muted-foreground">Enter a name and select a star rating</p>
                    if (noName) return <p className="text-xs text-muted-foreground">Enter a name to save</p>
                    if (noRating) return <p className="text-xs text-muted-foreground">Select a star rating to save</p>
                    if (descTooShort) return <p className="text-xs text-amber-600 dark:text-amber-400">Description needs at least {MIN_DESC_WORDS} words</p>
                    return <span />
                  })()}
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!draft!.name.trim() || draft!.rating === 0 || !!(draft!.description.trim() && wordCount(draft!.description) < MIN_DESC_WORDS)}
                      onClick={saveDraft}
                    >
                      {draft!.editIndex !== null ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </div>}
          </div>
        )
      })}
    </div>
  )
}
