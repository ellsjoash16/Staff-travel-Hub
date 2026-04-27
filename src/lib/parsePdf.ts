import * as pdfjsLib from 'pdfjs-dist'

// Use the bundled worker
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

/**
 * Parse a Rise 360 PDF export into individual reviews.
 *
 * Rise structure:
 *   - Lessons separated by "CONTINUE" then "Lesson N of N"
 *   - Each lesson: title line, then "Name (Agency)\nMonth YYYY", then body
 */
export async function parsePdf(file: File): Promise<ParsedReview[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Extract all text page by page
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }

  const fullText = pages.join('\n')
  return splitIntoReviews(fullText)
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

function splitIntoReviews(text: string): ParsedReview[] {
  // Normalise whitespace runs within lines but preserve newlines
  const normalised = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

  // Split on lesson boundaries (handles "Lesson 1 of 3", "CONTINUE", etc.)
  // We split on the pattern that marks a new lesson
  const lessonPattern = /(?:CONTINUE\s*)?Lesson\s+\d+\s+of\s+\d+/gi
  const chunks = normalised.split(lessonPattern).map(c => c.trim()).filter(Boolean)

  const reviews: ParsedReview[] = []
  for (const chunk of chunks) {
    const parsed = parseLesson(chunk)
    if (parsed) reviews.push(parsed)
  }
  return reviews
}

function parseLesson(chunk: string): ParsedReview | null {
  const lines = chunk.split(/\n+/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 3) return null

  // First meaningful line is the title (may span 2 lines if long)
  // Look for "Name (Agency)" pattern within first 5 lines
  let titleLines: string[] = []
  let staffLine = -1
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    if (/^[A-Z][a-z]+ [A-Z][a-z]+ \([^)]+\)/.test(lines[i])) {
      staffLine = i
      titleLines = lines.slice(0, i)
      break
    }
  }

  // Fallback: title is first line, staff is second
  if (staffLine === -1) {
    titleLines = [lines[0]]
    staffLine = 1
  }

  const title = titleLines.join(' ').trim()
  const rawStaff = lines[staffLine] ?? ''

  // "John Fell (Jordan)" → name = "John Fell"
  const staffMatch = rawStaff.match(/^([^(]+?)\s*\(/)
  const staff = staffMatch ? staffMatch[1].trim() : rawStaff

  // Date is the line after staff: "March 2025"
  const rawDate = lines[staffLine + 1] ?? ''
  const date = parseMonthYear(rawDate)

  // Body starts after the date line
  const bodyLines = lines.slice(staffLine + 2)
  const review = bodyLines.join('\n\n')

  // Try to extract location from title or first body sentence
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
  // Common patterns: "Dubai ...", "Ras Al Khaimah ...", "Maldives ..."
  const knownPlaces = [
    'Dubai', 'Abu Dhabi', 'Ras Al Khaimah', 'Jordan', 'Maldives',
    'Bali', 'Thailand', 'Egypt', 'Morocco', 'Kenya', 'Tanzania',
    'Oman', 'Qatar', 'Bahrain', 'Saudi Arabia',
  ]
  for (const place of knownPlaces) {
    if (title.toLowerCase().includes(place.toLowerCase())) return place
  }
  // Fallback: first word(s) before dash or comma
  const m = title.match(/^([^,\-–]+)/)
  return m ? m[1].trim() : ''
}
