export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return res.status(500).json({ error: 'Missing env vars' })
  }

  const response = await fetch(`${url}/rest/v1/settings?id=eq.1&select=id`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })

  res.status(200).json({ ok: response.ok, status: response.status, ts: new Date().toISOString() })
}
