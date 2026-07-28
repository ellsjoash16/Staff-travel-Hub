import { parseServiceAccount, verifyIdToken } from './_lib.js'

// Searches Unsplash for photos matching a location. The access key stays
// server-side; only authenticated app users can call this.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return res.status(500).json({ error: 'Photo search not configured' })

  const query = String(req.query.query ?? '').trim().slice(0, 100)
  if (!query) return res.status(400).json({ error: 'Missing query' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    await verifyIdToken(token, sa.project_id) // reject unauthenticated callers

    const url = `https://api.unsplash.com/search/photos?per_page=12&orientation=landscape&content_filter=high&query=${encodeURIComponent(query)}`
    const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } })
    if (!r.ok) return res.status(502).json({ error: `Unsplash error ${r.status}` })

    const data = await r.json()
    const results = (data.results ?? []).map((p) => ({
      url: `${p.urls.raw}&auto=format&fit=crop&w=800&q=75`,
      thumb: p.urls.thumb,
      credit: p.user?.name ?? null,
    }))
    return res.status(200).json({ results })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Search failed' })
  }
}
