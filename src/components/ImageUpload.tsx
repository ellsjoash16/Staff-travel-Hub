import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { compressImage } from '@/lib/utils'

interface Props {
  value: string | null
  onChange: (data: string | null) => void
}

export function ImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    const data = await compressImage(file)
    onChange(data)
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer ${
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {value ? (
        <div className="relative">
          <img src={value} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Camera className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Click to upload or drag &amp; drop</p>
          <p className="text-xs mt-1 opacity-70">JPG, PNG, WEBP, GIF supported</p>
        </div>
      )}
    </div>
  )
}
