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

    // Read current adminUids
    const settingsRes = await fetch(`${fsBase}/settings/main`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    let adminUids = []
    if (settingsRes.ok) {
      const doc = await settingsRes.json()
      adminUids = doc.fields?.adminUids?.arrayValue?.values
        ?.map(v => v.stringValue).filter(Boolean) ?? []
    }

    // Already in adminUids — nothing to do
    if (adminUids.includes(callerUid)) {
      return res.status(200).json({ adminUids })
    }

    // Only these UIDs are permitted to self-enrol as admins
    const ALLOWED_UIDS = [
      'zjq9ki2IUNg3fUHGldA7N3pn6ko1',
      'UdIhjIXCVfdPBwaQ6HnzM1jDYoa2',
    ]
    if (!ALLOWED_UIDS.includes(callerUid)) {
      return res.status(200).json({ adminUids })
    }

    // Add caller to adminUids
    const newUids = [...adminUids, callerUid]
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

    // Write isAdmin: true to the user's profile
    await fetch(
      `${fsBase}/userProfiles/${callerUid}?updateMask.fieldPaths=isAdmin`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { isAdmin: { booleanValue: true } } }),
      }
    ).catch(() => {})

    console.log(`[ensure-admin] ${callerUid} added to adminUids`)
    res.status(200).json({ adminUids: newUids })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[ensure-admin]', msg)
    res.status(500).json({ error: msg })
  }
}
