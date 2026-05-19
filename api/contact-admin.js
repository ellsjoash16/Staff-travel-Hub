import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

const ADMIN_EMAIL = 'famadmin@dialaflight.co.uk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Email service not configured' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    await verifyIdToken(token, sa.project_id)

    const { fromName, fromEmail, message } = req.body
    if (!fromName || !fromEmail || !message?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1a1a1a">Message from ${fromName}</h2>
        <p style="color:#666;font-size:13px;margin-bottom:4px">${fromEmail}</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:14px">${message.trim()}</div>
        <p style="color:#666;font-size:12px;margin-top:24px">Sent via DAFagram — reply to this email to respond directly to ${fromName}.</p>
      </div>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DAFagram <noreply@resend.dev>',
        to: [ADMIN_EMAIL],
        reply_to: fromEmail,
        subject: `Message from ${fromName} — DAFagram`,
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
