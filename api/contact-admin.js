import { parseServiceAccount, getAccessToken, verifyIdToken, checkRateLimit } from './_lib.js'
import { emailShell, COLORS } from './_email.js'

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

    const html = emailShell({
      preheader: `New message from ${esc(fromName)}`,
      heading: `New message from ${esc(fromName)}`,
      contentHtml: `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px">
          <tr>
            <td style="background-color:#f1f5f9;border-radius:10px;padding:12px 16px">
              <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.MUTED};margin-bottom:3px">From</div>
              <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:${COLORS.INK}">${esc(fromName)} &middot; <a href="mailto:${esc(fromEmail)}" style="color:${COLORS.BRAND};text-decoration:none">${esc(fromEmail)}</a></div>
            </td>
          </tr>
        </table>
        <div style="border-left:3px solid ${COLORS.BRAND};background-color:#fafbfc;border-radius:0 10px 10px 0;padding:16px 18px;white-space:pre-wrap;font-size:15px;line-height:1.6;color:#334155">${esc(message.trim())}</div>
      `,
      footNote: `Sent via DAFAGRAM &middot; Reply to this email to respond directly to ${esc(fromName)}.`,
    })

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
