import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

// Deletes a user completely: their Firestore profile AND their Firebase Auth
// login. Admin-only. The generic admin-write endpoint deliberately refuses the
// userProfiles collection, and it cannot touch Auth at all, so account deletion
// lives here on its own guard-railed route.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const { uid: callerUid } = await verifyIdToken(token, sa.project_id)

    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    // Verify the caller is an admin.
    const checkRes = await fetch(`${fsBase}/settings/main`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!checkRes.ok) throw new Error(`Settings read failed: ${checkRes.status}`)
    const checkDoc = await checkRes.json()
    const adminUids = checkDoc.fields?.adminUids?.arrayValue?.values
      ?.map(v => v.stringValue).filter(Boolean) ?? []
    if (!adminUids.includes(callerUid)) return res.status(403).json({ error: 'Forbidden' })

    const { uid } = req.body ?? {}
    if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,1500}$/.test(uid)) {
      return res.status(400).json({ error: 'Invalid uid' })
    }
    // Safety: never let an admin delete their own login through this route.
    if (uid === callerUid) {
      return res.status(400).json({ error: 'You cannot delete your own account' })
    }

    // 1. Delete the Firestore profile (ignore "already gone").
    const profileRes = await fetch(`${fsBase}/userProfiles/${uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok && profileRes.status !== 404) {
      const txt = await profileRes.text()
      throw new Error(`Profile delete failed: ${profileRes.status} ${txt.slice(0, 200)}`)
    }

    // 2. Delete the Firebase Auth login (ignore "already gone").
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid }),
    })
    if (!authRes.ok) {
      const data = await authRes.json().catch(() => ({}))
      const msg = data.error?.message ?? `Auth delete failed: ${authRes.status}`
      if (msg !== 'USER_NOT_FOUND') throw new Error(msg)
    }

    console.log(`[delete-user] admin ${callerUid} deleted account ${uid}`)
    res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[delete-user]', msg)
    res.status(500).json({ error: msg })
  }
}
