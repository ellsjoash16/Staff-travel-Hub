import { useRef, useState } from 'react'
import { Camera, X, Plus, GripVertical } from 'lucide-react'
import { compressImage } from '@/lib/utils'

const MIN = 4
const MAX = 10

interface Props {
  values: string[]
  onChange: (images: string[]) => void
}

export function MultiImageUpload({ values, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dropZoneActive, setDropZoneActive] = useState(false)

  const remaining = MAX - values.length
  const atMax = values.length >= MAX

  async function handleFiles(files: FileList) {
    const all = Array.from(files)
    const capped = all.slice(0, remaining)
    if (all.length > capped.length) {
      const { toast } = await import('sonner')
      toast.info(`Only ${capped.length} photo${capped.length !== 1 ? 's' : ''} added — maximum of ${MAX} reached`)
    }
    const compressed = await Promise.all(capped.map(compressImage))
    onChange([...values, ...compressed])
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

  // ── Reorder drag ────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, index: number) {
    dragIndexRef.current = index
    setDraggingIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDragLeave() { setDragOverIndex(null) }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === index) {
      resetDragState()
      return
    }
    const reordered = [...values]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(index, 0, moved)
    onChange(reordered)
    resetDragState()
  }

  function handleDragEnd() { resetDragState() }

  function resetDragState() {
    setDraggingIndex(null)
    setDragOverIndex(null)
    dragIndexRef.current = null
  }

  // ── Drop zone (file) events ─────────────────────────────────────────────

  function onDropZoneDragOver(e: React.DragEvent) {
    // Only activate for file drops, not image reorder drags
    if (dragIndexRef.current !== null) return
    e.preventDefault()
    setDropZoneActive(true)
  }

  function onDropZoneDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropZoneActive(false)
    }
  }

  function onDropZoneDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropZoneActive(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">

      {/* Thumbnail grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((src, i) => (
            <div
              key={i}
              className={`relative aspect-square rounded-xl overflow-hidden transition-all
                ${draggingIndex === i ? 'opacity-40' : 'opacity-100'}
                ${dragOverIndex === i ? 'ring-2 ring-primary' : ''}
              `}
              draggable
              onDragStart={e => handleDragStart(e, i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1 left-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3 w-3" />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] rounded px-1.5 py-0.5">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Always-visible drop zone (hidden at max) */}
      {!atMax && (
        <div
          className={`border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dropZoneActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={onDropZoneDragOver}
          onDragLeave={onDropZoneDragLeave}
          onDrop={onDropZoneDrop}
        >
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-1.5">
            {values.length === 0
              ? <Camera className="h-8 w-8 opacity-50" />
              : <Plus className="h-6 w-6 opacity-50" />
            }
            <p className="text-sm">
              {values.length === 0 ? 'Click to upload or drag & drop' : 'Add more photos'}
            </p>
            <p className="text-xs opacity-60">
              {values.length === 0
                ? `Minimum ${MIN}, maximum ${MAX} photos`
                : `${values.length} of ${MAX} — ${remaining} more allowed`
              }
            </p>
          </div>
        </div>
      )}

      {atMax && (
        <p className="text-xs text-center text-muted-foreground py-1">
          Maximum of {MAX} photos reached
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }}
        onClick={e => { (e.target as HTMLInputElement).value = '' }}
      />
    </div>
  )
}
