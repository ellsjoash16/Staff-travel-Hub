import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as admin from 'firebase-admin'

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set')
  const credential = admin.credential.cert(JSON.parse(raw) as admin.ServiceAccount)
  return admin.initializeApp({ credential })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const app = getAdminApp()

    // Verify the caller is authenticated
    const decoded = await app.auth().verifyIdToken(token)

    // Check they are an admin
    const settings = await app.firestore().collection('settings').doc('main').get()
    const adminUids: string[] = settings.data()?.adminUids ?? []
    if (!adminUids.includes(decoded.uid)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Page through all Auth users
    const users: { uid: string; email: string | null; displayName: string | null }[] = []
    let pageToken: string | undefined

    do {
      const result = await app.auth().listUsers(1000, pageToken)
      for (const u of result.users) {
        users.push({ uid: u.uid, email: u.email ?? null, displayName: u.displayName ?? null })
      }
      pageToken = result.pageToken
    } while (pageToken)

    console.log(`[list-users] returning ${users.length} users for admin ${decoded.uid}`)
    res.status(200).json({ users })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[list-users] error:', msg)
    res.status(500).json({ error: msg })
  }
}
