import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text } = req.body ?? {}
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' })

  const prompt = `You are a travel writer. Paraphrase the following travel review text to make it more vivid, engaging and professional, while keeping the same facts, opinions and first-person voice. Return only the paraphrased text with no commentary.

Text to paraphrase:
${text}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    return res.status(502).json({ error: err })
  }

  const data = await response.json()
  const output = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  res.json({ result: output.trim() })
}
