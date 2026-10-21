import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

// Safe staff directory for ALL authenticated users.
// Returns only non-sensitive fields (name / role / building / division).
// Never exposes passport, medical, consent or ban data, and never the raw email.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    // Any valid signed-in user may read the directory — no admin gate.
    await verifyIdToken(token, sa.project_id)

    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`
    const str = (f) => (f && typeof f.stringValue === 'string' ? f.stringValue : null)
    const arr = (f) => (Array.isArray(f?.arrayValue?.values)
      ? f.arrayValue.values.map((v) => v.stringValue).filter(Boolean)
      : [])

    // 1. All Firestore profiles — PLAINTEXT fields only.
    //    firstName/lastName are AES-GCM encrypted at rest and cannot be read here,
    //    so names come from the (plaintext) Auth displayName / authDisplayName.
    const profileMap = new Map()
    let fsPageToken
    do {
      const params = new URLSearchParams({ pageSize: '300' })
      if (fsPageToken) params.set('pageToken', fsPageToken)
      const fsRes = await fetch(`${fsBase}/userProfiles?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!fsRes.ok) throw new Error(`Firestore list failed: ${fsRes.status}`)
      const fsData = await fsRes.json()
      for (const d of fsData.documents ?? []) {
        const uid = d.name.split('/').pop()
        const f = d.fields ?? {}
        profileMap.set(uid, {
          authDisplayName: str(f.authDisplayName),
          jobRole: str(f.jobRole),
          building: str(f.building),
          salesDivision: str(f.salesDivision),
          visitedCountries: arr(f.visitedCountries),
          favouriteCountry: str(f.favouriteCountry),
        })
      }
      fsPageToken = fsData.nextPageToken
    } while (fsPageToken)

    // 2. All Auth users (so accounts without a profile doc still appear)
    const authUsers = []
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
        authUsers.push({ uid: u.localId, email: u.email ?? null, displayName: u.displayName ?? null })
      }
      nextPageToken = listData.nextPageToken
    } while (nextPageToken)

    // 3. Merge into a safe directory
    const staff = authUsers.map((u) => {
      const p = profileMap.get(u.uid)
      const emailLocal = u.email ? u.email.split('@')[0] : ''
      const displayName = u.displayName || p?.authDisplayName || emailLocal || 'Unknown'
      return {
        uid: u.uid,
        displayName,
        jobRole: p?.jobRole ?? null,
        building: p?.building ?? null,
        salesDivision: p?.salesDivision ?? null,
        visitedCountries: p?.visitedCountries ?? [],
        favouriteCountry: p?.favouriteCountry ?? null,
      }
    })

    console.log(`[list-staff] returning ${staff.length} staff`)
    res.status(200).json({ staff })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[list-staff]', msg)
    res.status(500).json({ error: msg })
  }
}
