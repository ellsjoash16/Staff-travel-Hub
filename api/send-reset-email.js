import { parseServiceAccount, getAccessToken, checkRateLimit } from './_lib.js'
import { emailShell, button, COLORS } from './_email.js'

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// Public endpoint (the caller is signed out — they forgot their password).
// Generates a Firebase reset link server-side WITHOUT Firebase sending its own
// plain email, then delivers our branded email via Resend. Rate-limited, and
// always returns 200 so it never reveals which addresses have accounts.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Email service not configured' })

  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@(dialaflight|dafconcierge|lotusgroup)\.co\.uk$/i.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'Enter a valid work email address' })
  }

  try {
    const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    const accessToken = await getAccessToken(sa)
    const fsBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`

    // Throttle by address to stop reset-email bombing.
    const rl = await checkRateLimit(fsBase, accessToken, `reset_${email}`, { limit: 3, windowSeconds: 3600 })
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfter))
      return res.status(429).json({ error: 'Too many reset requests — please try again later.' })
    }

    // Ask Identity Toolkit for the reset link (returnOobLink means Firebase does
    // NOT send its own email — we send our own branded one instead).
    const oobRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:sendOobCode`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email, returnOobLink: true }),
    })
    const oobData = await oobRes.json()

    if (!oobRes.ok) {
      // Unknown address → act as if it worked (don't disclose account existence).
      if (oobData.error?.message === 'EMAIL_NOT_FOUND') {
        console.log(`[send-reset-email] no account for ${email} (silently ok)`)
        return res.status(200).json({ ok: true })
      }
      throw new Error(oobData.error?.message ?? `sendOobCode failed: ${oobRes.status}`)
    }

    // Firebase's oobLink points at its own generic reset page. Pull out just the
    // oobCode and point at OUR branded /reset page instead (same host that
    // served this request).
    const fbLink = oobData.oobLink
    if (!fbLink) throw new Error('No reset link returned')
    const oobCode = new URL(fbLink).searchParams.get('oobCode')
    if (!oobCode) throw new Error('No reset code in link')
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
    const link = `${proto}://${req.headers.host}/?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`

    const html = emailShell({
      preheader: 'Reset your DAFAGRAM password.',
      heading: 'Reset your password',
      contentHtml: `
        <p style="margin:0 0 8px">We received a request to reset the password for your DAFAGRAM account (<strong>${esc(email)}</strong>).</p>
        <p style="margin:0 0 4px">Click the button below to choose a new password. This link expires in about an hour.</p>
        ${button('Reset my password', link)}
        <p style="margin:16px 0 0;font-size:13px;color:${COLORS.MUTED}">If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="margin:16px 0 0;font-size:12px;color:${COLORS.MUTED};word-break:break-all">Button not working? Paste this link into your browser:<br><a href="${link}" style="color:${COLORS.BRAND}">${esc(link)}</a></p>
      `,
      footNote: 'Sent by DAFAGRAM — the DialAFlight staff travel hub.<br>Didn\'t request a password reset? You can ignore this email.',
    })

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DAFagram <noreply@dialaflight.co.uk>'
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [email], subject: 'Reset your DAFAGRAM password', html }),
    })
    if (!emailRes.ok) {
      const txt = await emailRes.text()
      throw new Error(`Resend error ${emailRes.status}: ${txt.slice(0, 200)}`)
    }

    console.log(`[send-reset-email] reset link sent to ${email}`)
    res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[send-reset-email]', msg)
    res.status(500).json({ error: msg })
  }
}
