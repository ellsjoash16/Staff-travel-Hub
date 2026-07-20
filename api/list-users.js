import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const { uid } = await verifyIdToken(token, sa.project_id)

    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    // Check admin
    const fsRes = await fetch(`${fsBase}/settings/main`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!fsRes.ok) throw new Error(`Firestore settings read failed: ${fsRes.status}`)
    const fsDoc = await fsRes.json()
    const adminUids = fsDoc.fields?.adminUids?.arrayValue?.values
      ?.map(v => v.stringValue).filter(Boolean) ?? []
    if (!adminUids.includes(uid)) return res.status(403).json({ error: 'Forbidden' })

    // List all Auth users
    const users = []
    let nextPageToken
    do {
      const params = new URLSearchParams({ maxResults: '1000' })
      if (nextPageToken) params.set('nextPageToken', nextPageToken)
      const listRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:batchGet?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!listRes.ok) {
        const txt = await listRes.text()
        throw new Error(`Identity Toolkit ${listRes.status}: ${txt.slice(0, 200)}`)
      }
      const listData = await listRes.json()
      for (const u of listData.users ?? []) {
        users.push({ uid: u.localId, email: u.email ?? null, displayName: u.displayName ?? null })
      }
      nextPageToken = listData.nextPageToken
    } while (nextPageToken)

    console.log(`[list-users] returning ${users.length} users for admin ${uid}`)
    res.status(200).json({ users })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[list-users]', msg)
    res.status(500).json({ error: msg })
  }
}
