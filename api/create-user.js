import { parseServiceAccount, getAccessToken, verifyIdToken, checkRateLimit } from './_lib.js'

// Minimal Firestore REST field encoder for the string/null values we store.
function toFields(data) {
  const fields = {}
  for (const [k, v] of Object.entries(data)) {
    fields[k] = v === null || v === undefined ? { nullValue: null } : { stringValue: String(v) }
  }
  return fields
}

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
    const settingsRes = await fetch(`${fsBase}/settings/main`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!settingsRes.ok) throw new Error(`Settings read failed: ${settingsRes.status}`)
    const settingsDoc = await settingsRes.json()
    const adminUids = settingsDoc.fields?.adminUids?.arrayValue?.values
      ?.map(v => v.stringValue).filter(Boolean) ?? []
    if (!adminUids.includes(callerUid)) return res.status(403).json({ error: 'Forbidden' })

    // Throttle account creation per admin to prevent runaway/abuse.
    const rl = await checkRateLimit(fsBase, accessToken, `create-user:${callerUid}`, { limit: 30, windowSeconds: 60 })
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfter))
      return res.status(429).json({ error: 'Too many requests — try again shortly' })
    }

    // ── Admin resets another user's password ─────────────────────────────────
    // Caller has already been confirmed as an admin above. The admin's own
    // password is re-verified client-side before this is ever called. Sets a new
    // temporary password and forces a change on the user's next sign-in.
    if (req.body?.action === 'resetPassword') {
      const targetUid = req.body.uid
      const newPw = req.body.password
      if (!targetUid || typeof targetUid !== 'string') return res.status(400).json({ error: 'uid must be a string' })
      if (typeof newPw !== 'string' || newPw.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

      const updRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: targetUid, password: newPw }),
      })
      const updData = await updRes.json().catch(() => ({}))
      if (!updRes.ok) throw new Error(updData.error?.message ?? `Reset failed: ${updRes.status}`)

      // Force the user to set their own password on next sign-in.
      await fetch(`${fsBase}/userProfiles/${targetUid}?updateMask.fieldPaths=mustChangePassword`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { mustChangePassword: { booleanValue: true } } }),
      }).catch(() => {})

      console.log(`[create-user] admin ${callerUid} reset password for ${targetUid}`)
      return res.status(200).json({ ok: true })
    }

    const { email, password, displayName: rawDisplayName, jobRole, salesDivision, building, firstNameEnc, lastNameEnc } = req.body ?? {}

    // Capitalise the first letter of every word so names are consistent
    // regardless of how the admin typed them.
    const displayName = rawDisplayName
      ? String(rawDisplayName).replace(/(^|[\s'’-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase())
      : rawDisplayName

    // Validation
    const cleanEmail = String(email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@(dialaflight|dafconcierge|lotusgroup)\.co\.uk$/i.test(cleanEmail)) {
      return res.status(400).json({ error: 'Email must be a @dialaflight.co.uk, @dafconcierge.co.uk or @lotusgroup.co.uk address' })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Create the Auth account via the admin (project-scoped) signUp endpoint.
    // The service-account OAuth token has firebaseauth.users.create, so no one
    // is signed in on the client and no Web API key is required.
    const createRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password,
        displayName: displayName || undefined,
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok) {
      const msg = createData.error?.message ?? `Create failed: ${createRes.status}`
      if (msg === 'EMAIL_EXISTS') return res.status(409).json({ error: 'An account already exists with this email' })
      throw new Error(msg)
    }
    const newUid = createData.localId
    if (!newUid) throw new Error('No uid returned from account creation')

    // Write the user profile doc (firstName/lastName arrive already encrypted
    // from the admin client; the server never sees the plaintext names).
    const profileData = {
      authEmail: cleanEmail,
      authDisplayName: displayName || null,
      firstName: firstNameEnc ?? null,
      lastName: lastNameEnc ?? null,
      jobRole: jobRole || null,
      salesDivision: salesDivision || null,
      building: building || null,
    }
    const profile = {
      ...toFields(profileData),
      // Force a password change on first sign-in (temp password was set by admin).
      mustChangePassword: { booleanValue: true },
    }
    const maskQuery = [...Object.keys(profileData), 'mustChangePassword']
      .map(f => `updateMask.fieldPaths=${f}`).join('&')
    const writeRes = await fetch(`${fsBase}/userProfiles/${newUid}?${maskQuery}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: profile }),
    })
    if (!writeRes.ok) {
      const txt = await writeRes.text()
      throw new Error(`Profile write failed: ${writeRes.status} ${txt.slice(0, 200)}`)
    }

    console.log(`[create-user] admin ${callerUid} created ${newUid} (${cleanEmail})`)
    res.status(200).json({ uid: newUid, email: cleanEmail, displayName: displayName || null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[create-user]', msg)
    res.status(500).json({ error: msg })
  }
}
