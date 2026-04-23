import { useRef, useState } from 'react'
import { Camera, X, Plus } from 'lucide-react'
import { compressImage } from '@/lib/utils'

const MIN = 4
const MAX = 10

interface Props {
  values: string[]
  onChange: (images: string[]) => void
}

function FilmSprockets() {
  return <div className="film-sprockets w-full" />
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
    if (from === null || from === index) { resetDragState(); return }
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

  // ── Drop zone events ────────────────────────────────────────────────────

  function onDropZoneDragOver(e: React.DragEvent) {
    if (dragIndexRef.current !== null) return
    e.preventDefault()
    setDropZoneActive(true)
  }

  function onDropZoneDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropZoneActive(false)
  }

  function onDropZoneDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropZoneActive(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">

      {/* Film strip — shown once there are images */}
      {values.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#0a0a0a' }}>
          <FilmSprockets />

          <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide" style={{ background: '#111' }}>
            {values.map((src, i) => (
              <div
                key={i}
                className={`relative flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                  draggingIndex === i ? 'opacity-40 scale-90' : 'opacity-100 hover:border-white/60'
                } ${dragOverIndex === i ? 'border-primary scale-105' : 'border-white/20'}`}
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragOver={e => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                {i === 0 ? (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] text-center py-0.5 uppercase tracking-widest font-semibold">
                    Cover
                  </span>
                ) : (
                  <span className="absolute bottom-0.5 right-1 text-white/40 text-[8px] font-mono">{i + 1}</span>
                )}
              </div>
            ))}

            {/* Inline add button in the strip */}
            {!atMax && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex-shrink-0 w-20 h-20 rounded border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/40 hover:border-white/50 hover:text-white/70 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[9px] uppercase tracking-wider">Add</span>
              </button>
            )}
          </div>

          <FilmSprockets />

          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#0a0a0a' }}>
            <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
              {values.length} frame{values.length !== 1 ? 's' : ''} · drag to reorder
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {values.length < MIN
                ? <span className="text-amber-500">{MIN - values.length} more required</span>
                : `max ${MAX}`
              }
            </span>
          </div>
        </div>
      )}

      {/* Drop zone — always visible when under the max */}
      {!atMax && (
        <div
          className={`border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dropZoneActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
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
        <p className="text-xs text-center text-muted-foreground py-1">Maximum of {MAX} photos reached</p>
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
