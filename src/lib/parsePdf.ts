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
}

export async function parsePdf(file: File): Promise<ParsedReview[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageLines: string[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()

    // Group text items by y-coordinate to reconstruct real lines
    const byY = new Map<number, string[]>()
    for (const item of content.items as any[]) {
      if (!('str' in item) || !item.str.trim()) continue
      // Round y to nearest 2pt so items on same visual line cluster together
      const y = Math.round(item.transform[5] / 2) * 2
      if (!byY.has(y)) byY.set(y, [])
      byY.get(y)!.push(item.str)
    }

    // Sort y descending (PDF y=0 is bottom of page)
    const sortedYs = [...byY.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const line = byY.get(y)!.join(' ').trim()
      if (line) pageLines.push(line)
    }

    pageLines.push('') // blank line between pages
  }

  const fullText = pageLines.join('\n')
  return splitIntoReviews(fullText)
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function splitIntoReviews(text: string): ParsedReview[] {
  const normalised = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const lessonPattern = /(?:CONTINUE\s*)?\bLesson\s+\d+\s+of\s+\d+\b/gi
  const chunks = normalised.split(lessonPattern).map(c => c.trim()).filter(Boolean)

  const reviews: ParsedReview[] = []
  for (const chunk of chunks) {
    const parsed = parseLesson(chunk)
    if (parsed) reviews.push(parsed)
  }
  return reviews
}

function parseLesson(chunk: string): ParsedReview | null {
  const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 3) return null

  // Find the "Name (Agency)" line — it identifies the staff member
  // Search within first 8 lines to be safe
  let staffLineIdx = -1
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    // Matches: "John Fell (Jordan)", "Max Letchfield (Brody)", etc.
    if (/^[A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+)? \([^)]+\)\s*$/.test(lines[i])) {
      staffLineIdx = i
      break
    }
  }

  // Fallback: look for any line containing "(Word)" in brackets in first 8 lines
  if (staffLineIdx === -1) {
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      if (/\([A-Z][a-z]+\)/.test(lines[i])) {
        staffLineIdx = i
        break
      }
    }
  }

  if (staffLineIdx === -1) return null

  // Everything before the staff line = title (join into one string)
  const title = lines.slice(0, staffLineIdx).join(' ').trim()
  const rawStaff = lines[staffLineIdx]

  // Extract just the name (before the bracket)
  const staffMatch = rawStaff.match(/^([^(]+?)\s*\(/)
  const staff = staffMatch ? staffMatch[1].trim() : rawStaff

  // Next line should be the date "March 2025"
  const rawDate = lines[staffLineIdx + 1] ?? ''
  const date = parseMonthYear(rawDate)

  // If rawDate looks like a real month/year, body starts 2 lines after staff
  // otherwise body starts 1 line after staff
  const hasDate = /^[A-Z][a-z]+ \d{4}$/.test(rawDate.trim())
  const bodyStart = staffLineIdx + (hasDate ? 2 : 1)

  const bodyLines = lines.slice(bodyStart)
  const review = bodyLines.join('\n\n').trim()

  const location = extractLocation(title)

  if (!title || !staff || !review) return null

  return { title, staff, date, location, review }
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
