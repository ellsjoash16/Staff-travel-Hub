import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

// Fields an admin may edit on a user profile. Enforced server-side so that
// sensitive fields (isAdmin, banned, banUntil, adminUids, dataConsent) can
// never be written through this endpoint even if the client sends them.
const ALLOWED_FIELDS = [
  'firstName', 'lastName',
  'passportFirstName', 'passportLastName',
  'medicalInfo', 'jobRole', 'building', 'salesDivision',
]

function toValue(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  if (typeof val === 'string') return { stringValue: val }
  return { stringValue: String(val) }
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

    // Verify caller is an admin
    const checkRes = await fetch(`${fsBase}/settings/main`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!checkRes.ok) throw new Error(`Settings read failed: ${checkRes.status}`)
    const checkDoc = await checkRes.json()
    const adminUids = checkDoc.fields?.adminUids?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) ?? []
    if (!adminUids.includes(callerUid)) return res.status(403).json({ error: 'Forbidden' })

    const { uid, fields } = req.body
    if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,1500}$/.test(uid)) {
      return res.status(400).json({ error: 'Invalid uid' })
    }
    if (!fields || typeof fields !== 'object') return res.status(400).json({ error: 'fields is required' })

    const outFields = {}
    const maskPaths = []
    for (const key of ALLOWED_FIELDS) {
      if (key in fields) {
        outFields[key] = toValue(fields[key])
        maskPaths.push(key)
      }
    }
    if (maskPaths.length === 0) return res.status(400).json({ error: 'No editable fields provided' })

    const maskQuery = maskPaths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
    const r = await fetch(`${fsBase}/userProfiles/${uid}?${maskQuery}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: outFields }),
    })
    if (!r.ok) {
      const txt = await r.text()
      throw new Error(`Write failed: ${r.status} ${txt.slice(0, 200)}`)
    }
    console.log(`[edit-user-profile] ${callerUid} updated userProfiles/${uid}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[edit-user-profile]', msg)
    res.status(500).json({ error: msg })
  }
}
