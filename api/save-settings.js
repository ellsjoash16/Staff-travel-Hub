import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const { uid: callerUid } = await verifyIdToken(token, sa.project_id)

    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    // Check admin
    const checkRes = await fetch(`${fsBase}/settings/main`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!checkRes.ok) throw new Error(`Firestore settings read failed: ${checkRes.status}`)
    const checkDoc = await checkRes.json()
    const adminUids = checkDoc.fields?.adminUids?.arrayValue?.values
      ?.map(v => v.stringValue).filter(Boolean) ?? []
    if (!adminUids.includes(callerUid)) return res.status(403).json({ error: 'Forbidden' })

    const body = req.body
    const fields = {}
    const maskPaths = []

    function addStr(key, val) {
      fields[key] = { stringValue: val ?? '' }
      maskPaths.push(key)
    }
    function addNum(key, val) {
      fields[key] = { doubleValue: val }
      maskPaths.push(key)
    }
    function addArr(key, arr) {
      fields[key] = { arrayValue: { values: arr.map(v => ({ stringValue: v })) } }
      maskPaths.push(key)
    }

    if (body.title !== undefined) addStr('title', body.title)
    if (body.heading !== undefined) addStr('heading', body.heading)
    if (body.color !== undefined) addStr('color', body.color)
    if (body.welcome !== undefined) addStr('welcome', body.welcome)
    if (body.notice !== undefined) addStr('notice', body.notice)
    if (body.departureName !== undefined) addStr('departureName', body.departureName)
    if (body.departureLat !== undefined) addNum('departureLat', body.departureLat)
    if (body.departureLng !== undefined) addNum('departureLng', body.departureLng)
    if (body.adminFolders !== undefined) addArr('adminFolders', body.adminFolders)

    if (body.panelImages !== undefined) {
      const piFields = {}
      for (const [k, v] of Object.entries(body.panelImages)) {
        piFields[k] = v === null ? { nullValue: null } : { stringValue: String(v) }
      }
      fields.panelImages = { mapValue: { fields: piFields } }
      maskPaths.push('panelImages')
    }

    if (maskPaths.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const maskQuery = maskPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&')
    const patchRes = await fetch(`${fsBase}/settings/main?${maskQuery}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    if (!patchRes.ok) {
      const txt = await patchRes.text()
      throw new Error(`Firestore write failed: ${patchRes.status} ${txt.slice(0, 200)}`)
    }

    console.log(`[save-settings] ${callerUid} updated fields: ${maskPaths.join(', ')}`)
    res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[save-settings]', msg)
    res.status(500).json({ error: msg })
  }
}
