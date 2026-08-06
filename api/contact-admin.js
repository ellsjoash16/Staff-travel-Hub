import { parseServiceAccount, getAccessToken, verifyIdToken, checkRateLimit } from './_lib.js'

const ADMIN_EMAIL = 'famadmin@dialaflight.co.uk'

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Email service not configured' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const { uid: callerUid } = await verifyIdToken(token, sa.project_id)  // reject unauthenticated callers
    const accessToken = await getAccessToken(sa)
    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    const { fromName, fromEmail, message } = req.body
    if (!fromName || !fromEmail || !message?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (String(fromName).length > 100 || String(message).length > 5000) {
      return res.status(400).json({ error: 'Input too long' })
    }
    if (typeof fromEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail) || fromEmail.length > 200) {
      return res.status(400).json({ error: 'Invalid sender email' })
    }

    const rl = await checkRateLimit(fsBase, accessToken, `contact_${callerUid}`, { limit: 5, windowSeconds: 3600 })
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfter))
      return res.status(429).json({ error: 'Too many messages — please try again later.' })
    }

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1a1a1a">Message from ${esc(fromName)}</h2>
        <p style="color:#666;font-size:13px;margin-bottom:4px">${esc(fromEmail)}</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:14px">${esc(message.trim())}</div>
        <p style="color:#666;font-size:12px;margin-top:24px">Sent via DAFagram — reply to this email to respond directly to ${esc(fromName)}.</p>
      </div>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DAFagram <noreply@dialaflight.co.uk>',
        to: [ADMIN_EMAIL],
        reply_to: fromEmail,
        subject: `Message from ${esc(fromName)} — DAFagram`,
        html,
      }),
    })

    if (!emailRes.ok) {
      const txt = await emailRes.text()
      throw new Error(`Resend error ${emailRes.status}: ${txt.slice(0, 200)}`)
    }

    console.log(`[contact-admin] ${fromName} <${fromEmail}>`)
    res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[contact-admin]', msg)
    res.status(500).json({ error: msg })
  }
}
