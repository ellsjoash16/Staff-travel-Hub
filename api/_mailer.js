import nodemailer from 'nodemailer'

// Sends mail through Gmail SMTP using an App Password — no custom domain or
// domain verification required. Set these Vercel env vars:
//   GMAIL_USER          the full Gmail address (e.g. daf.travelhub@gmail.com)
//   GMAIL_APP_PASSWORD  a 16-char Google App Password (Account → Security →
//                       2-Step Verification → App passwords)
//   MAIL_FROM_NAME      optional display name (defaults to "DAFAGRAM")
let transporter = null

function getTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: pass.replace(/\s+/g, '') },
    })
  }
  return transporter
}

export function mailerConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

// Diagnostic: checks the SMTP login works without sending anything.
export async function verifyMailer() {
  const tx = getTransporter()
  if (!tx) return { ok: false, error: 'not configured' }
  try {
    await tx.verify()
    return { ok: true, user: process.env.GMAIL_USER, passLen: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').length }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), user: process.env.GMAIL_USER, passLen: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').length }
  }
}

/**
 * @param {{ to: string|string[], subject: string, html: string, cc?: string|string[], replyTo?: string }} opts
 */
export async function sendMail({ to, subject, html, cc, replyTo }) {
  const tx = getTransporter()
  if (!tx) throw new Error('Email service not configured (GMAIL_USER / GMAIL_APP_PASSWORD)')
  const fromName = process.env.MAIL_FROM_NAME || 'DAFAGRAM'
  await tx.sendMail({
    from: `${fromName} <${process.env.GMAIL_USER}>`,
    to,
    cc,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  })
}
