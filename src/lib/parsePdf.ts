import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface ParsedReview {
  title: string
  staff: string
  date: string   // YYYY-MM-DD
  location: string
  review: string
  images: string[] // data URLs extracted from the PDF
}

// Minimum image dimensions to filter out icons/UI elements
const MIN_IMG_PX = 150

export async function parsePdf(file: File): Promise<ParsedReview[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageLines: string[] = []
  // Collect all images across all pages, grouped by page
  const pageImages: string[][] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)

    // ── Text extraction ──────────────────────────────────────────────────────
    const content = await page.getTextContent()
    const byY = new Map<number, string[]>()
    for (const item of content.items as any[]) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5] / 2) * 2
      if (!byY.has(y)) byY.set(y, [])
      byY.get(y)!.push(item.str)
    }
    const sortedYs = [...byY.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const line = byY.get(y)!.join(' ').trim()
      if (line) pageLines.push(line)
    }
    pageLines.push('')

    // ── Image extraction ─────────────────────────────────────────────────────
    const imgs = await extractPageImages(page)
    pageImages.push(imgs)
  }

  const fullText = pageLines.join('\n')
  const allImages = pageImages.flat()
  return splitIntoReviews(fullText, allImages)
}

async function extractPageImages(page: any): Promise<string[]> {
  try {
    const ops = await page.getOperatorList()
    const seenKeys = new Set<string>()
    const imageKeys: string[] = []

    // OPS values: paintImageXObject=85, paintInlineImageXObject=86
    const PAINT_IMAGE = (pdfjsLib as any).OPS?.paintImageXObject ?? 85
    const PAINT_INLINE = (pdfjsLib as any).OPS?.paintInlineImageXObject ?? 86

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i]
      if (fn === PAINT_IMAGE || fn === PAINT_INLINE) {
        const key = ops.argsArray[i]?.[0]
        if (typeof key === 'string' && !seenKeys.has(key)) {
          seenKeys.add(key)
          imageKeys.push(key)
        }
      }
    }

    const dataUrls: string[] = []
    for (const key of imageKeys) {
      try {
        // Race with a 3s timeout so we never hang
        const img: any = await Promise.race([
          new Promise(resolve => page.objs.get(key, resolve)),
          new Promise(resolve => setTimeout(() => resolve(null), 3000)),
        ])
        if (!img?.data || img.width < MIN_IMG_PX || img.height < MIN_IMG_PX) continue

        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.createImageData(img.width, img.height)

        const src: Uint8ClampedArray = img.data
        const dst = imageData.data
        if (src.length === img.width * img.height * 3) {
          for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
            dst[j] = src[i]; dst[j + 1] = src[i + 1]; dst[j + 2] = src[i + 2]; dst[j + 3] = 255
          }
        } else {
          dst.set(src)
        }

        ctx.putImageData(imageData, 0, 0)
        dataUrls.push(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        // skip individual image failures
      }
    }
    return dataUrls
  } catch {
    // If image extraction fails entirely, return empty — don't break text parsing
    return []
  }
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function splitIntoReviews(text: string, allImages: string[]): ParsedReview[] {
  const normalised = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const lessonPattern = /(?:CONTINUE\s*)?\bLesson\s+\d+\s+of\s+\d+\b/gi
  const chunks = normalised.split(lessonPattern).map(c => c.trim()).filter(Boolean)

  // Distribute images evenly across lessons
  const perLesson = chunks.length > 0 ? Math.ceil(allImages.length / chunks.length) : 0

  const reviews: ParsedReview[] = []
  for (let i = 0; i < chunks.length; i++) {
    const parsed = parseLesson(chunks[i])
    if (parsed) {
      parsed.images = allImages.slice(i * perLesson, (i + 1) * perLesson)
      reviews.push(parsed)
    }
  }
  return reviews
}

function parseLesson(chunk: string): ParsedReview | null {
  const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 3) return null

  let staffLineIdx = -1
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    if (/^[A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+)? \([^)]+\)\s*$/.test(lines[i])) {
      staffLineIdx = i; break
    }
  }
  if (staffLineIdx === -1) {
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      if (/\([A-Z][a-z]+\)/.test(lines[i])) { staffLineIdx = i; break }
    }
  }
  if (staffLineIdx === -1) return null

  const title = lines.slice(0, staffLineIdx).join(' ').trim()
  const rawStaff = lines[staffLineIdx]
  const staffMatch = rawStaff.match(/^([^(]+?)\s*\(/)
  const staff = staffMatch ? staffMatch[1].trim() : rawStaff

  const rawDate = lines[staffLineIdx + 1] ?? ''
  const date = parseMonthYear(rawDate)
  const hasDate = /^[A-Z][a-z]+ \d{4}$/.test(rawDate.trim())
  const bodyStart = staffLineIdx + (hasDate ? 2 : 1)

  const review = lines.slice(bodyStart).join('\n\n').trim()
  const location = extractLocation(title)

  if (!title || !staff || !review) return null

  return { title, staff, date, location, review, images: [] }
}

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
}

function parseMonthYear(raw: string): string {
  const m = raw.toLowerCase().match(/(\w+)\s+(\d{4})/)
  if (!m) return new Date().toISOString().slice(0, 10)
  const month = MONTHS[m[1]] ?? '01'
  return `${m[2]}-${month}-01`
}

function extractLocation(title: string): string {
  const knownPlaces = [
    'Dubai', 'Abu Dhabi', 'Ras Al Khaimah', 'Jordan', 'Maldives',
    'Bali', 'Thailand', 'Egypt', 'Morocco', 'Kenya', 'Tanzania',
    'Oman', 'Qatar', 'Bahrain', 'Saudi Arabia',
  ]
  for (const place of knownPlaces) {
    if (title.toLowerCase().includes(place.toLowerCase())) return place
  }
  const m = title.match(/^([^,\-–]+)/)
  return m ? m[1].trim() : ''
}
