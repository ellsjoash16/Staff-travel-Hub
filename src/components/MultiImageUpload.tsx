import { useRef, useState } from 'react'
import { Camera, X, Plus, GripVertical } from 'lucide-react'
import { compressImage } from '@/lib/utils'

interface Props {
  values: string[]
  onChange: (images: string[]) => void
}

export function MultiImageUpload({ values, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  async function handleFiles(files: FileList) {
    const compressed = await Promise.all(Array.from(files).map(compressImage))
    onChange([...values, ...compressed])
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

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

  function handleDragLeave() {
    setDragOverIndex(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === index) {
      setDraggingIndex(null)
      setDragOverIndex(null)
      dragIndexRef.current = null
      return
    }
    const reordered = [...values]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(index, 0, moved)
    onChange(reordered)
    setDraggingIndex(null)
    setDragOverIndex(null)
    dragIndexRef.current = null
  }

  function handleDragEnd() {
    setDraggingIndex(null)
    setDragOverIndex(null)
    dragIndexRef.current = null
  }

  return (
    <div className="space-y-3">
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
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              {/* Drag handle */}
              <div className="absolute top-1 left-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3 w-3" />
              </div>
              {/* Remove button */}
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
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Add</span>
          </button>
        </div>
      )}

      {values.length === 0 && (
        <div
          className="border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
          }}
        >
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Camera className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Click to upload or drag &amp; drop</p>
            <p className="text-xs mt-1 opacity-70">Multiple photos supported</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files) }}
      />
    </div>
  )
}
