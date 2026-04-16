// POST /api/identify-products
// body: { imageBase64 }
// Uses GPT-4o Vision to detect product positions in the redesigned image
// Returns: { hotspots: [{ id, label, category, x, y, productId }] }

import staticProducts from '../../data/products'
import fs from 'fs'
import path from 'path'

function getAllProducts() {
  const catalogPath = path.join(process.cwd(), 'data', 'products-catalog.json')
  let catalog = []
  if (fs.existsSync(catalogPath)) {
    try { catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) } catch {}
  }
  return [...staticProducts, ...catalog]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, imageType = 'image/png' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set' })

  const imageUrl = `data:${imageType};base64,${imageBase64}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            {
              type: 'text',
              text: `Analyze this bathroom interior image. Identify all visible bathroom fixtures and products.

For each item found, return its position as a percentage of image width (x) and height (y) from the top-left corner, pointing to the center of the item.

Return a JSON object with this exact structure:
{
  "hotspots": [
    { "id": "faucet-1", "label": "水龙头", "category": "faucet", "x": 45, "y": 60 },
    { "id": "toilet-1", "label": "马桶", "category": "toilet", "x": 20, "y": 70 }
  ]
}

Category must be one of: faucet, toilet, bathtub, basin, mirror, shower, accessory
Label must be in Chinese.
Only include clearly visible items. Maximum 6 hotspots. Do not include walls, floors, or structural elements.`
            }
          ]
        }]
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Vision API failed')

    let parsed
    try {
      parsed = JSON.parse(data.choices[0].message.content)
    } catch {
      throw new Error('Failed to parse Vision response')
    }

    const rawHotspots = parsed.hotspots || []
    const products = getAllProducts()

    // Match each hotspot category to best product in catalog
    const hotspots = rawHotspots.map(h => {
      const match = products.find(p => p.category === h.category && p.glbUrl)
        || products.find(p => p.category === h.category)
      return {
        ...h,
        productId: match?.id || null,
      }
    })

    res.status(200).json({ hotspots })
  } catch (err) {
    console.error('[identify-products]', err.message)
    res.status(500).json({ error: err.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }
