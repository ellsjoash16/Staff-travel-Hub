import { createSign, createVerify } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set')
    const sa = JSON.parse(raw)

    // ── 1. Service account → access token ─────────────────────────────────
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
    const callerUid = payload.sub

    // ── 3. Read settings/main from Firestore ──────────────────────────────
    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`
    const settingsRes = await fetch(`${fsBase}/settings/main`, { headers: { Authorization: `Bearer ${accessToken}` } })

    let storedPassword = null
    let storedAdminUids = []

    if (settingsRes.ok) {
      const settingsDoc = await settingsRes.json()
      storedPassword = settingsDoc.fields?.password?.stringValue ?? null
      storedAdminUids = settingsDoc.fields?.adminUids?.arrayValue?.values
        ?.map(v => v.stringValue).filter(Boolean) ?? []
    }

    // ── 4. Verify password ─────────────────────────────────────────────────
    const { password } = req.body
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'password is required' })
    }
    if (storedPassword === null || password !== storedPassword) {
      return res.status(403).json({ error: 'Incorrect password' })
    }

    // ── 5. Add caller to adminUids if not already present ─────────────────
    if (storedAdminUids.includes(callerUid)) {
      return res.status(200).json({ adminUids: storedAdminUids, alreadyAdmin: true })
    }

    const newUids = [...storedAdminUids, callerUid]

    const patchRes = await fetch(
      `${fsBase}/settings/main?updateMask.fieldPaths=adminUids`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            adminUids: { arrayValue: { values: newUids.map(uid => ({ stringValue: uid })) } },
          },
        }),
      }
    )
    if (!patchRes.ok) {
      const txt = await patchRes.text()
      throw new Error(`Firestore write failed: ${patchRes.status} ${txt.slice(0, 200)}`)
    }

    console.log(`[promote-to-admin] ${callerUid} promoted to admin`)
    res.status(200).json({ adminUids: newUids })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[promote-to-admin] error:', msg)
    res.status(500).json({ error: msg })
  }
}
