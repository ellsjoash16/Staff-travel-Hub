import { parseServiceAccount, getAccessToken, verifyIdToken } from './_lib.js'

const FAM_ADMIN_EMAIL = 'famadmin@dialaflight.co.uk'
const LOTUS_LINK = 'http://lotusprofiles/PassportDetails'

function statusLabel(status) {
  switch (status) {
    case 'pending_confirmation': return 'Pending Confirmation'
    case 'confirmed':            return 'Confirmed'
    case 'refused':              return 'Unsuccessful'
    default:                     return status
  }
}

function buildEmail({ type, to, name, tripName, status }) {
  const firstName = name.split(' ')[0] || name

  if (type === 'registered') {
    return {
      subject: `Registration received – ${tripName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
          <h2 style="color:#1a1a1a">Hi ${firstName},</h2>
          <p>Thanks for registering your interest in <strong>${tripName}</strong>.</p>
          <p>We've received your registration and will be in touch soon with next steps.</p>
          <p style="color:#666;font-size:13px;margin-top:32px">— The DAFagram Team</p>
        </div>
      `,
    }
  }

  if (type === 'status_change') {
    const label = statusLabel(status)
    const isConfirmed = status === 'confirmed'
    const isRefused = status === 'refused'

    const bodyText = isConfirmed
      ? `Great news — your registration for <strong>${tripName}</strong> has been <strong style="color:#16a34a">confirmed</strong>!`
      : isRefused
      ? `Unfortunately, your registration for <strong>${tripName}</strong> has been <strong style="color:#dc2626">unsuccessful</strong> at this time.`
      : `Your registration for <strong>${tripName}</strong> has been updated to <strong>${label}</strong>.`

    const lotusSection = isConfirmed ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0">
        <p style="margin:0 0 8px;font-weight:600;color:#15803d">Next step: update your passport details</p>
        <p style="margin:0 0 12px;font-size:14px;color:#166534">Please make sure your passport details are up to date in Lotus Profiles before travel.</p>
        <a href="${LOTUS_LINK}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600">Update Passport Details</a>
      </div>
    ` : ''

    return {
      subject: `Registration update: ${label} – ${tripName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
          <h2 style="color:#1a1a1a">Hi ${firstName},</h2>
          <p>${bodyText}</p>
          ${lotusSection}
          <p style="color:#666;font-size:13px;margin-top:32px">— The DAFagram Team</p>
        </div>
      `,
    }
  }

  throw new Error('Unknown email type')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Email service not configured' })

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    await verifyIdToken(token, sa.project_id)

    const { type, to, name, tripName, status } = req.body
    if (!to || !name || !tripName || !type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DAFagram <noreply@dialaflight.co.uk>'
    const { subject, html } = buildEmail({ type, to, name, tripName, status })

    const isConfirmed = type === 'status_change' && status === 'confirmed'

    const payload = {
      from: fromEmail,
      to: [to],
      subject,
      html,
      ...(isConfirmed ? { cc: [FAM_ADMIN_EMAIL] } : {}),
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!emailRes.ok) {
      const txt = await emailRes.text()
      throw new Error(`Resend error ${emailRes.status}: ${txt.slice(0, 200)}`)
    }

    console.log(`[send-email] ${type} → ${to}${isConfirmed ? ` (cc: ${FAM_ADMIN_EMAIL})` : ''}`)
    res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[send-email]', msg)
    res.status(500).json({ error: msg })
  }
}
