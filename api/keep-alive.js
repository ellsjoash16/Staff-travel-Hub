import { parseServiceAccount, getAccessToken } from './_lib.js'

export default async function handler(req, res) {
  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const fsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/settings/main`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    res.status(200).json({ ok: fsRes.ok, status: fsRes.status, ts: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'error' })
  }
}
