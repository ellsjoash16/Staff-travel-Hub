import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const callerUid = await verifyIdToken(token, sa.project_id)

    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    // Read authoritative adminUids from Firestore
    const settingsRes = await fetch(`${fsBase}/settings/main`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!settingsRes.ok) throw new Error(`Firestore read failed: ${settingsRes.status}`)
    const settingsDoc = await settingsRes.json()
    const storedAdminUids = settingsDoc.fields?.adminUids?.arrayValue?.values
      ?.map(v => v.stringValue).filter(Boolean) ?? []

    // Caller must already be an admin
    if (!storedAdminUids.includes(callerUid)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Accept a single UID + action — never trust the client's full array
    const { uid: targetUid, action } = req.body
    if (!targetUid || typeof targetUid !== 'string') {
      return res.status(400).json({ error: 'uid must be a string' })
    }
    if (action !== 'add' && action !== 'remove') {
      return res.status(400).json({ error: 'action must be "add" or "remove"' })
    }

    let newUids
    if (action === 'add') {
      newUids = storedAdminUids.includes(targetUid)
        ? storedAdminUids
        : [...storedAdminUids, targetUid]
    } else {
      newUids = storedAdminUids.filter(u => u !== targetUid)
      if (newUids.length === 0) {
        return res.status(400).json({ error: 'Cannot remove all admins' })
      }
    }

    const patchRes = await fetch(
      `${fsBase}/settings/main?updateMask.fieldPaths=adminUids`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { adminUids: { arrayValue: { values: newUids.map(u => ({ stringValue: u })) } } },
        }),
      }
    )
    if (!patchRes.ok) {
      const txt = await patchRes.text()
      throw new Error(`Firestore write failed: ${patchRes.status} ${txt.slice(0, 200)}`)
    }

    // Also write isAdmin flag to the user's profile so the client can read it
    // without depending on settings/main timing
    await fetch(
      `${fsBase}/userProfiles/${targetUid}?updateMask.fieldPaths=isAdmin`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { isAdmin: { booleanValue: action === 'add' } } }),
      }
    ).catch(() => {})

    console.log(`[set-admin-uids] ${callerUid} ${action}ed ${targetUid} → [${newUids.join(', ')}]`)
    res.status(200).json({ adminUids: newUids })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[set-admin-uids]', msg)
    res.status(500).json({ error: msg })
  }
}
