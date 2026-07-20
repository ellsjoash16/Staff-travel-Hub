import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

function toValue(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toValue) } }
  if (typeof val === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(val)) fields[k] = toValue(v)
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

function toFields(data) {
  const fields = {}
  for (const [k, v] of Object.entries(data)) fields[k] = toValue(v)
  return fields
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const { uid: callerUid } = await verifyIdToken(token, sa.project_id)

    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    // Verify admin
    const checkRes = await fetch(`${fsBase}/settings/main`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!checkRes.ok) throw new Error(`Settings read failed: ${checkRes.status}`)
    const checkDoc = await checkRes.json()
    const adminUids = checkDoc.fields?.adminUids?.arrayValue?.values
      ?.map(v => v.stringValue).filter(Boolean) ?? []
    if (!adminUids.includes(callerUid)) return res.status(403).json({ error: 'Forbidden' })

    const { collection, id, op, data, updateFields } = req.body
    if (!collection || !id || !op) return res.status(400).json({ error: 'collection, id and op are required' })

    // Only these collections may be written through this generic endpoint.
    // settings/userProfiles/adminUids have dedicated, guard-railed endpoints
    // and must never be reachable here.
    const ALLOWED_COLLECTIONS = ['posts', 'submissions', 'locations', 'trips', 'registrations']
    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      return res.status(403).json({ error: `Collection not permitted: ${collection}` })
    }
    // Reject anything that could break out of the intended document path.
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,1500}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid document id' })
    }

    const docPath = `${fsBase}/${collection}/${id}`

    if (op === 'delete') {
      const r = await fetch(docPath, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
      if (!r.ok && r.status !== 404) {
        const txt = await r.text()
        throw new Error(`Delete failed: ${r.status} ${txt.slice(0, 200)}`)
      }
      console.log(`[admin-write] ${callerUid} deleted ${collection}/${id}`)
      return res.status(200).json({ ok: true })
    }

    if (op === 'set' || op === 'update') {
      if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data is required for set/update' })
      const fields = toFields(data)
      const maskKeys = op === 'update' && Array.isArray(updateFields) ? updateFields : Object.keys(data)
      const maskQuery = maskKeys.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
      const r = await fetch(`${docPath}?${maskQuery}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      if (!r.ok) {
        const txt = await r.text()
        throw new Error(`Write failed: ${r.status} ${txt.slice(0, 200)}`)
      }
      console.log(`[admin-write] ${callerUid} ${op} ${collection}/${id}`)
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: `Unknown op: ${op}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[admin-write]', msg)
    res.status(500).json({ error: msg })
  }
}
