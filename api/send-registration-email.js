import { parseServiceAccount, getAccessToken, verifyIdToken, checkRateLimit } from './_lib.js'
import { emailShell, button, pill, COLORS } from './_email.js'

async function isCallerAdmin(fsBase, accessToken, uid) {
  const res = await fetch(`${fsBase}/settings/main`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return false
  const doc = await res.json()
  const adminUids = doc.fields?.adminUids?.arrayValue?.values
    ?.map(v => v.stringValue).filter(Boolean) ?? []
  return adminUids.includes(uid)
}

const FAM_ADMIN_EMAIL = 'famadmin@dialaflight.co.uk'
const LOTUS_LINK = 'http://lotusprofiles/PassportDetails'

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function statusLabel(status) {
  switch (status) {
    case 'pending_confirmation': return 'Pending Confirmation'
    case 'confirmed':            return 'Confirmed'
    case 'refused':              return 'Unsuccessful'
    default:                     return status
  }
}

// A subtle "trip" info row shown under the greeting.
function tripRow(safeTrip) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px">
      <tr>
        <td style="background-color:#f1f5f9;border-radius:10px;padding:14px 18px">
          <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.MUTED};margin-bottom:3px">Trip</div>
          <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${COLORS.INK}">${safeTrip}</div>
        </td>
      </tr>
    </table>`
}

function buildEmail({ type, to, name, tripName, status }) {
  const firstName = esc(name.split(' ')[0] || name)
  const safeTrip = esc(tripName)

  if (type === 'registered') {
    return {
      subject: `Registration received – ${tripName}`,
      html: emailShell({
        preheader: `We've received your interest in ${tripName}.`,
        heading: `Thanks, ${firstName} — you're registered`,
        contentHtml: `
          <p style="margin:0 0 18px">We've received your interest in the trip below. Our team will review registrations and be in touch with the next steps soon.</p>
          ${tripRow(safeTrip)}
          <p style="margin:18px 0 0;color:${COLORS.MUTED};font-size:14px">Good luck — we'll let you know as soon as there's an update.</p>
        `,
      }),
    }
  }

  if (type === 'status_change') {
    const label = esc(statusLabel(status))
    const isConfirmed = status === 'confirmed'
    const isRefused = status === 'refused'

    const statusPill = isConfirmed
      ? pill('Confirmed', COLORS.GREEN)
      : isRefused
      ? pill('Unsuccessful', COLORS.RED)
      : pill(label, COLORS.BRAND)

    const bodyText = isConfirmed
      ? `Great news — your registration for the trip below has been <strong style="color:${COLORS.GREEN}">confirmed</strong>.`
      : isRefused
      ? `Unfortunately your registration for the trip below has been <strong style="color:${COLORS.RED}">unsuccessful</strong> this time. Keep an eye out — more trips are added regularly.`
      : `Your registration for the trip below has been updated.`

    const lotusSection = isConfirmed ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0">
        <tr>
          <td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 22px">
            <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#15803d;margin-bottom:6px">Next step: update your passport details</div>
            <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#166534">Please make sure your passport details are up to date in Lotus Profiles before travel.</p>
            ${button('Update Passport Details', LOTUS_LINK, COLORS.GREEN)}
          </td>
        </tr>
      </table>` : ''

    return {
      subject: `Registration update: ${label} – ${tripName}`,
      html: emailShell({
        preheader: `Your registration for ${tripName} is now ${label}.`,
        heading: `Hi ${firstName}, here's an update`,
        contentHtml: `
          <p style="margin:0 0 14px">${statusPill}</p>
          <p style="margin:0 0 18px">${bodyText}</p>
          ${tripRow(safeTrip)}
          ${lotusSection}
        `,
      }),
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
    const accessToken = await getAccessToken(sa)
    const { uid: callerUid } = await verifyIdToken(token, sa.project_id)
    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    const { type, to, name, tripName, status } = req.body
    if (!to || !name || !tripName || !type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 200) {
      return res.status(400).json({ error: 'Invalid recipient' })
    }
    if (String(name).length > 100 || String(tripName).length > 150) {
      return res.status(400).json({ error: 'Input too long' })
    }

    // Status-change emails announce confirmation/refusal and CC the fam admin —
    // only real admins may trigger them. "registered" emails stay open to any
    // authenticated user because they also go to nominated colleagues, so the
    // open path is rate-limited per caller to prevent abuse of the mail relay.
    if (type === 'status_change') {
      if (!(await isCallerAdmin(fsBase, accessToken, callerUid))) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } else {
      const rl = await checkRateLimit(fsBase, accessToken, `email_reg_${callerUid}`, { limit: 15, windowSeconds: 3600 })
      if (!rl.allowed) {
        res.setHeader('Retry-After', String(rl.retryAfter))
        return res.status(429).json({ error: 'Too many registration emails — please try again later.' })
      }
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DAFAGRAM <noreply@dafagram.co.uk>'
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
