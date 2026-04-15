import { useRef } from 'react'
import { Camera, X, Plus } from 'lucide-react'
import { compressImage } from '@/lib/utils'

interface Props {
  values: string[]
  onChange: (images: string[]) => void
}

export function MultiImageUpload({ values, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    const compressed = await Promise.all(Array.from(files).map(compressImage))
    onChange([...values, ...compressed])
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((src, i) => (
            <div key={i} className="relative aspect-square">
              <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
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
