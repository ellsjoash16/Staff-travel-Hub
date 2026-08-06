// Shared, email-client-safe HTML layout for all DAFAGRAM emails.
// Table-based with inline styles so it renders consistently in Gmail, Outlook,
// Apple Mail and mobile clients.

const BRAND = '#05979a'
const BRAND_DARK = '#064e5a'
const INK = '#0f172a'
const MUTED = '#64748b'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

// A bullet-proof (Outlook-safe) call-to-action button.
export function button(label, href, color = BRAND) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0">
    <tr>
      <td align="center" bgcolor="${color}" style="border-radius:10px">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px">${label}</a>
      </td>
    </tr>
  </table>`
}

// A small coloured status pill.
export function pill(label, color) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background-color:${color}1a;color:${color};font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.3px;text-transform:uppercase">${label}</span>`
}

/**
 * Wraps inner content in the branded shell.
 * @param {{ preheader?: string, heading?: string, contentHtml: string, footNote?: string }} opts
 */
export function emailShell({ preheader = '', heading, contentHtml, footNote }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light only">
  <title>DAFAGRAM</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f4;-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:#eef1f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef1f4">
    <tr>
      <td align="center" style="padding:28px 14px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden">

          <!-- Header -->
          <tr>
            <td bgcolor="${BRAND_DARK}" style="background:linear-gradient(135deg,${BRAND_DARK} 0%,${BRAND} 100%);padding:30px 36px">
              <span style="font-family:${FONT};font-size:26px;font-weight:800;letter-spacing:2px;color:#ffffff">DAFAGRAM</span>
              <div style="font-family:${FONT};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.72);margin-top:5px">Staff Travel Hub</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:34px 36px">
              ${heading ? `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:21px;line-height:1.3;font-weight:700;color:${INK}">${heading}</h1>` : ''}
              <div style="font-family:${FONT};font-size:15px;line-height:1.65;color:#334155">
                ${contentHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 36px;border-top:1px solid #eef1f4;background-color:#fafbfc">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED}">
                ${footNote || 'Sent by DAFAGRAM — the Dial a Flight staff travel hub.<br>This is an automated message; you don\'t need to reply.'}
              </p>
            </td>
          </tr>

        </table>
        <p style="font-family:${FONT};font-size:11px;color:#a5aeb8;margin:18px 0 0">&copy; Dial a Flight &middot; DAFAGRAM</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export const COLORS = { BRAND, BRAND_DARK, INK, MUTED, GREEN: '#16a34a', RED: '#dc2626' }
