/**
 * Parses the Firebase service account JSON from an environment variable.
 * Handles the common Vercel issue where \n escape sequences inside string
 * values get converted to actual newline characters, producing invalid JSON.
 */
export function parseServiceAccount(raw) {
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set')

  // First try a direct parse — works if env var was stored correctly
  try {
    return JSON.parse(raw)
  } catch {}

  // Vercel sometimes converts \n escape sequences in env vars to real newlines.
  // Walk the raw string and re-escape any actual newlines that appear inside
  // JSON string values (they're invalid there and must be \n).
  let result = ''
  let inString = false
  let i = 0
  while (i < raw.length) {
    const ch = raw[i]
    if (inString) {
      if (ch === '\\' && i + 1 < raw.length) {
        // Already-escaped character — copy both chars verbatim
        result += ch + raw[i + 1]
        i += 2
        continue
      }
      if (ch === '"') {
        inString = false
        result += ch
      } else if (ch === '\n') {
        result += '\\n'   // re-escape the bare newline
      } else if (ch === '\r') {
        // skip bare carriage returns
      } else {
        result += ch
      }
    } else {
      if (ch === '"') inString = true
      result += ch
    }
    i++
  }

  return JSON.parse(result)
}

/**
 * Builds a short-lived Google OAuth2 access token from a service account.
 */
export async function getAccessToken(sa) {
  const { createSign } = await import('crypto')
  const now = Math.floor(Date.now() / 1000)
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const b = Buffer.from(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    iat: now, exp: now + 3600,
  })).toString('base64url')
  const saJwt = `${h}.${b}.${createSign('RSA-SHA256').update(`${h}.${b}`).sign(sa.private_key, 'base64url')}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${saJwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`OAuth2: ${data.error_description ?? data.error ?? 'no token'}`)
  return data.access_token
}

/**
 * Verifies a Firebase ID token and returns the caller's UID.
 */
export async function verifyIdToken(token, projectId) {
  const { createVerify } = await import('crypto')
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
  if (payload.aud !== projectId) throw new Error('Token audience mismatch')
  if (!payload.sub) throw new Error('No subject in token')
  return payload.sub
}
