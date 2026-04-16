// POST /api/redesign-room
// body: { imageBase64, imageType, style }
// Returns: { imageUrl: 'data:image/png;base64,...' }

const STYLE_PROMPTS = {
  minimalist: 'minimalist modern style, clean white walls, large format tiles, concealed fixtures, soft diffused lighting, hotel luxury quality',
  nordic:     'Nordic Scandinavian style, warm wood accents, white walls, cozy natural light, plants, minimal clutter',
  industrial: 'industrial loft style, exposed concrete walls, matte black metal fixtures, brick accents, moody dramatic lighting',
  modern:     'contemporary modern style, glossy surfaces, chrome fixtures, LED lighting strips, sleek geometric shapes',
  luxury:     'ultra luxury 5-star hotel bathroom, marble surfaces, gold fixtures, freestanding bathtub, dramatic lighting',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, imageType = 'image/jpeg', style = 'minimalist' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set' })

  const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimalist
  const prompt = `Completely redesign this bathroom interior in ${styleDesc}. ` +
    `Keep the same room structure, dimensions, and layout. ` +
    `Replace all surfaces, tiles, fixtures and decor to match the style. ` +
    `Photorealistic architectural render, 4K quality, no people, magazine quality photography.`

  try {
    // Convert base64 to Blob for FormData
    const binary = Buffer.from(imageBase64, 'base64')
    const ext = imageType.includes('png') ? 'png' : 'jpg'
    const mimeType = imageType || 'image/jpeg'

    const formData = new FormData()
    const blob = new Blob([binary], { type: mimeType })
    formData.append('image', blob, `room.${ext}`)
    formData.append('prompt', prompt)
    formData.append('model', 'gpt-image-1')
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('quality', 'medium')

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data.error))

    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('No image returned')

    res.status(200).json({ imageUrl: `data:image/png;base64,${b64}` })
  } catch (err) {
    console.error('[redesign-room]', err.message)
    res.status(500).json({ error: err.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }
