import { createSign, createVerify } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set')
    const sa = JSON.parse(raw)

    // ── 1. Service account → Google OAuth2 access token ───────────────────
    const now = Math.floor(Date.now() / 1000)
    const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const b = Buffer.from(JSON.stringify({
      iss: sa.client_email, sub: sa.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      iat: now, exp: now + 3600,
    })).toString('base64url')
    const saJwt = `${h}.${b}.${createSign('RSA-SHA256').update(`${h}.${b}`).sign(sa.private_key, 'base64url')}`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${saJwt}`,
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(`OAuth2: ${tokenData.error_description ?? tokenData.error ?? 'no token'}`)
    const accessToken = tokenData.access_token

    // ── 2. Verify caller's Firebase ID token ──────────────────────────────
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Malformed ID token')
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    const certsRes = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
    const certs = await certsRes.json()
    const cert = header.kid ? certs[header.kid] : undefined
    if (!cert) throw new Error(`Unknown signing key: ${header.kid}`)

    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${parts[0]}.${parts[1]}`)
    if (!verifier.verify(cert, parts[2], 'base64url')) throw new Error('Invalid token signature')

    if ((payload.exp ?? 0) <= Math.floor(Date.now() / 1000)) throw new Error('Token expired')
    if (payload.aud !== sa.project_id) throw new Error('Token audience mismatch')
    if (!payload.sub) throw new Error('No subject in token')
    const uid = payload.sub

    // ── 3. Check admin via Firestore REST ─────────────────────────────────
    const fsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/settings/main`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!fsRes.ok) throw new Error(`Firestore settings read failed: ${fsRes.status}`)
    const fsDoc = await fsRes.json()
    const adminUids = fsDoc.fields?.adminUids?.arrayValue?.values
      ?.map(v => v.stringValue)
      .filter(Boolean) ?? []
    if (!adminUids.includes(uid)) return res.status(403).json({ error: 'Forbidden' })

    // ── 4. List all Auth users via Identity Toolkit ───────────────────────
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
    console.error('[list-users] error:', msg)
    res.status(500).json({ error: msg })
  }
}
