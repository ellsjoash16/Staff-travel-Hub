import { parseServiceAccount, getAccessToken } from './_lib.js'

// Public, read-only feed for the standalone DAF Adventures page (?view=adventures).
// Returns ONLY completed, non-event trips and the locations they reference — no
// posts, registrations, users, upcoming trips or settings are ever exposed.
// Firestore security rules stay locked; this endpoint reads via the service
// account server-side.

function fv(v) {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('nullValue' in v) return null
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fv)
  if ('mapValue' in v) {
    const o = {}
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = fv(val)
    return o
  }
  return null
}

const docId = name => name.split('/').pop()

async function listAll(fsBase, accessToken, collection) {
  const out = []
  let pageToken = ''
  do {
    const url = `${fsBase}/${collection}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) throw new Error(`Firestore ${collection} read failed: ${r.status}`)
    const j = await r.json()
    for (const d of j.documents || []) out.push(d)
    pageToken = j.nextPageToken || ''
  } while (pageToken)
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    const [tripDocs, locDocs] = await Promise.all([
      listAll(fsBase, accessToken, 'trips'),
      listAll(fsBase, accessToken, 'locations'),
    ])

    const trips = tripDocs
      .map(d => {
        const f = d.fields || {}
        return {
          id: docId(d.name),
          name: fv(f.name) ?? '',
          date: fv(f.date) ?? '',
          external: fv(f.external) ?? false,
          completed: fv(f.completed) ?? false,
          isEvent: fv(f.isEvent) ?? false,
          locationId: fv(f.locationId) ?? null,
          locationIds: fv(f.locationIds) ?? [],
          participants: fv(f.participants) ?? [],
          image: fv(f.image) ?? null,
        }
      })
      .filter(t => t.completed && !t.isEvent)

    const usedLocIds = new Set()
    for (const t of trips) {
      if (t.locationId) usedLocIds.add(t.locationId)
      for (const id of t.locationIds || []) usedLocIds.add(id)
    }

    const locations = locDocs
      .map(d => {
        const f = d.fields || {}
        return {
          id: docId(d.name),
          name: fv(f.name) ?? '',
          country: fv(f.country) ?? '',
          imageUrl: fv(f.imageUrl) ?? null,
        }
      })
      .filter(l => usedLocIds.has(l.id))

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ trips, locations })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[public-adventures]', msg)
    res.status(500).json({ error: msg })
  }
}
