import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSign, createVerify } from 'crypto'

interface ServiceAccount {
  client_email: string
  private_key: string
  project_id: string
}

// Sign a JWT using RS256 with the service account private key
function signJwt(payload: object, privateKey: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const input = `${header}.${body}`
  const sig = createSign('RSA-SHA256').update(input).sign(privateKey, 'base64url')
  return `${input}.${sig}`
}

// Exchange a service account JWT for a Google OAuth2 access token
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const jwt = signJwt({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    iat: now,
    exp: now + 3600,
  }, sa.private_key)

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await r.json() as { access_token?: string; error_description?: string; error?: string }
  if (!data.access_token) throw new Error(`OAuth2 error: ${data.error_description ?? data.error ?? 'unknown'}`)
  return data.access_token
}

// Verify a Firebase ID token using Google's public certs
async function verifyIdToken(token: string, projectId: string): Promise<string> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed ID token')

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as { kid?: string }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as {
    sub?: string; aud?: string; iss?: string; exp?: number
  }

  const keysRes = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  )
  const certs = await keysRes.json() as Record<string, string>
  const cert = header.kid ? certs[header.kid] : undefined
  if (!cert) throw new Error(`Unknown signing key: ${header.kid}`)

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${parts[0]}.${parts[1]}`)
  if (!verifier.verify(cert, parts[2], 'base64url')) throw new Error('Invalid token signature')

  const now = Math.floor(Date.now() / 1000)
  if ((payload.exp ?? 0) <= now) throw new Error('Token has expired')
  if (payload.aud !== projectId) throw new Error('Token audience mismatch')
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Token issuer mismatch')
  if (!payload.sub) throw new Error('Token has no subject')

  return payload.sub
}

// Check if a UID is in the adminUids array via Firestore REST
async function checkIsAdmin(uid: string, projectId: string, accessToken: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/main`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!r.ok) return false
  type FF = { arrayValue?: { values?: { stringValue?: string }[] } }
  const doc = await r.json() as { fields?: { adminUids?: FF } }
  const adminUids = doc.fields?.adminUids?.arrayValue?.values
    ?.map(v => v.stringValue)
    .filter((v): v is string => Boolean(v))
  return adminUids?.includes(uid) ?? false
}

// List all Firebase Auth users via Identity Toolkit REST API
async function listAllAuthUsers(
  projectId: string, accessToken: string
): Promise<{ uid: string; email: string | null; displayName: string | null }[]> {
  const users: { uid: string; email: string | null; displayName: string | null }[] = []
  let nextPageToken: string | undefined

  do {
    const params = new URLSearchParams({ maxResults: '1000' })
    if (nextPageToken) params.set('nextPageToken', nextPageToken)
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet?${params}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) {
      const text = await r.text()
      throw new Error(`listUsers API ${r.status}: ${text}`)
    }
    const data = await r.json() as {
      users?: { localId: string; email?: string; displayName?: string }[]
      nextPageToken?: string
    }
    for (const u of data.users ?? []) {
      users.push({ uid: u.localId, email: u.email ?? null, displayName: u.displayName ?? null })
    }
    nextPageToken = data.nextPageToken
  } while (nextPageToken)

  return users
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set')
    const sa = JSON.parse(raw) as ServiceAccount

    const accessToken = await getAccessToken(sa)
    const uid = await verifyIdToken(token, sa.project_id)

    if (!(await checkIsAdmin(uid, sa.project_id, accessToken))) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const users = await listAllAuthUsers(sa.project_id, accessToken)
    console.log(`[list-users] returning ${users.length} users for admin ${uid}`)
    res.status(200).json({ users })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[list-users] error:', msg)
    res.status(500).json({ error: msg })
  }
}
