import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

// One-off / repeatable cleanup of "orphan" logins left behind by accounts that
// were deleted before login-deletion existed. An orphan is an email/password
// login (the way accounts are created here — admin "New user" and self sign-up)
// that no longer has a Firestore profile. Microsoft SSO logins and admins are
// never touched, because SSO users legitimately have no profile until they set
// a job role or register interest. Admin-only.
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

    // `dryRun: true` returns the candidates without deleting anything.
    const dryRun = req.body?.dryRun === true

    // 1. Collect the set of uids that currently have a Firestore profile.
    const profileUids = new Set()
    let pageToken
    do {
      const params = new URLSearchParams({ pageSize: '300' })
      if (pageToken) params.set('pageToken', pageToken)
      const r = await fetch(`${fsBase}/userProfiles?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!r.ok) throw new Error(`Profiles list failed: ${r.status}`)
      const data = await r.json()
      for (const d of data.documents ?? []) {
        const name = d.name ?? ''
        const id = name.slice(name.lastIndexOf('/') + 1)
        if (id) profileUids.add(id)
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    // 2. Walk every Auth user and pick the password-only orphans.
    const candidates = []
    let scanned = 0
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
        scanned++
        const uid = u.localId
        if (!uid || uid === callerUid) continue
        if (adminUids.includes(uid)) continue
        if (profileUids.has(uid)) continue

        const providers = (u.providerUserInfo ?? []).map(p => p.providerId).filter(Boolean)
        const hasPassword = providers.includes('password') || !!u.passwordHash
        const federated = providers.some(p => p !== 'password') // e.g. microsoft.com
        if (!hasPassword || federated) continue // keep SSO / non-password logins

        candidates.push({ uid, email: u.email ?? null })
      }
      nextPageToken = listData.nextPageToken
    } while (nextPageToken)

    if (dryRun) {
      return res.status(200).json({ scanned, orphans: candidates.length, candidates, deleted: 0 })
    }

    // 3. Delete each orphan login.
    let deleted = 0
    for (const c of candidates) {
      const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: c.uid }),
      })
      if (authRes.ok) { deleted++; continue }
      const data = await authRes.json().catch(() => ({}))
      const msg = data.error?.message ?? `status ${authRes.status}`
      if (msg === 'USER_NOT_FOUND') { deleted++; continue }
      console.error(`[purge-orphan-logins] failed to delete ${c.uid}: ${msg}`)
    }

    console.log(`[purge-orphan-logins] admin ${callerUid} scanned ${scanned}, deleted ${deleted}/${candidates.length} orphan logins`)
    res.status(200).json({ scanned, orphans: candidates.length, deleted })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[purge-orphan-logins]', msg)
    res.status(500).json({ error: msg })
  }
}
