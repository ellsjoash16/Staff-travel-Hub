import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

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

    const { email, password, displayName, jobRole, salesDivision, building, firstNameEnc, lastNameEnc } = req.body ?? {}

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
