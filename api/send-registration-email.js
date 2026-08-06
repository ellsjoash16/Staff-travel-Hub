import { parseServiceAccount, getAccessToken, verifyIdToken, checkRateLimit } from './_lib.js'
import { sendMail, mailerConfigured } from './_mailer.js'

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

function buildEmail({ type, to, name, tripName, status }) {
  const firstName = esc(name.split(' ')[0] || name)
  const safeTrip = esc(tripName)

  if (type === 'registered') {
    return {
      subject: `Registration received – ${safeTrip}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
          <h2 style="color:#1a1a1a">Hi ${firstName},</h2>
          <p>Thanks for registering your interest in <strong>${safeTrip}</strong>.</p>
          <p>We've received your registration and will be in touch soon with next steps.</p>
          <p style="color:#666;font-size:13px;margin-top:32px">— The DAFagram Team</p>
        </div>
      `,
    }
  }

  if (type === 'status_change') {
    const label = esc(statusLabel(status))
    const isConfirmed = status === 'confirmed'
    const isRefused = status === 'refused'

    const bodyText = isConfirmed
      ? `Great news — your registration for <strong>${safeTrip}</strong> has been <strong style="color:#16a34a">confirmed</strong>!`
      : isRefused
      ? `Unfortunately, your registration for <strong>${safeTrip}</strong> has been <strong style="color:#dc2626">unsuccessful</strong> at this time.`
      : `Your registration for <strong>${safeTrip}</strong> has been updated to <strong>${label}</strong>.`

    const lotusSection = isConfirmed ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0">
        <p style="margin:0 0 8px;font-weight:600;color:#15803d">Next step: update your passport details</p>
        <p style="margin:0 0 12px;font-size:14px;color:#166534">Please make sure your passport details are up to date in Lotus Profiles before travel.</p>
        <a href="${LOTUS_LINK}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600">Update Passport Details</a>
      </div>
    ` : ''

    return {
      subject: `Registration update: ${label} – ${safeTrip}`,
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

  if (!mailerConfigured()) return res.status(500).json({ error: 'Email service not configured' })

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

    const { subject, html } = buildEmail({ type, to, name, tripName, status })

    const isConfirmed = type === 'status_change' && status === 'confirmed'

    await sendMail({
      to,
      subject,
      html,
      ...(isConfirmed ? { cc: FAM_ADMIN_EMAIL } : {}),
    })

    console.log(`[send-email] ${type} → ${to}${isConfirmed ? ` (cc: ${FAM_ADMIN_EMAIL})` : ''}`)
    res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[send-email]', msg)
    res.status(500).json({ error: msg })
  }
}
