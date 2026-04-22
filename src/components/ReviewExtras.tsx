import { useState } from 'react'
import { Hotel, Plane, Ship, Zap, Plus, X, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { PostExtras, ReviewItem } from '@/lib/types'

const SECTIONS = [
  { key: 'hotels'     as const, label: 'Hotels',     singular: 'Hotel',    Icon: Hotel, color: 'text-violet-500' },
  { key: 'airlines'   as const, label: 'Airlines',   singular: 'Airline',  Icon: Plane, color: 'text-sky-500'    },
  { key: 'cruises'    as const, label: 'Cruises',    singular: 'Cruise',   Icon: Ship,  color: 'text-blue-500'   },
  { key: 'activities' as const, label: 'Activities', singular: 'Activity', Icon: Zap,   color: 'text-orange-500' },
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
      {SECTIONS.map(({ key, label, singular, Icon, color }) => {
        const items: ReviewItem[] = value[key] ?? []
        const isOpen = draft?.category === key

        return (
          <div key={key} className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-medium">{label}</span>
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
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add {singular}
                </button>
              )}
            </div>

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
                        <Pencil className="h-3.5 w-3.5" />
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
              <div className="space-y-2 bg-card rounded-lg p-3 border border-primary/20">
                <p className="text-xs font-medium text-muted-foreground">
                  {draft!.editIndex !== null ? `Editing ${singular}` : `New ${singular}`}
                </p>
                <Input
                  placeholder={`${singular} name`}
                  value={draft!.name}
                  onChange={e => setDraft(d => d ? { ...d, name: e.target.value } : d)}
                  className="h-8 text-sm"
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDraft(d => d ? { ...d, rating: n } : d)}
                      className={`text-xl leading-none transition-colors ${n <= draft!.rating ? 'text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`}
                    >★</button>
                  ))}
                  {draft!.rating > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">{draft!.rating}/5</span>
                  )}
                </div>
                <Textarea
                  placeholder="Description (optional)"
                  value={draft!.description}
                  onChange={e => setDraft(d => d ? { ...d, description: e.target.value } : d)}
                  className="text-sm min-h-[80px]"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={!draft!.name.trim() || draft!.rating === 0}
                    onClick={saveDraft}
                  >
                    {draft!.editIndex !== null ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
