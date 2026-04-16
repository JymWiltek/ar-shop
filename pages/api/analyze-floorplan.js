import { GoogleGenerativeAI } from '@google/generative-ai'

const STYLE_DESC = {
  minimalist: '极简风格：白色基调，隐藏式收纳，干净线条，无多余装饰',
  nordic:     '北欧风格：木色元素，大量自然光，温暖色调，功能性家具',
  industrial: '工业风格：裸露砖墙，黑色铁件，皮革，做旧质感',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, imageType, style = 'minimalist' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' })

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `你是一位室内设计师助手。请分析这张平面图，识别所有房间，并为每个房间生成设计建议。

风格要求：${STYLE_DESC[style] || STYLE_DESC.minimalist}

请严格用以下 JSON 格式回答，不要有任何额外说明：
{
  "floors": [
    {
      "name": "Ground floor",
      "rooms": [
        {
          "id": "bathroom-1",
          "type": "bathroom",
          "name": "浴室",
          "size": "小型",
          "designTip": "一句话设计建议",
          "products": ["faucet", "shower", "basin"]
        }
      ]
    }
  ],
  "totalRooms": 5,
  "styleNote": "整体风格的一句话说明"
}

房间类型只能用：bathroom / kitchen / bedroom / living / dining / other
产品分类只能用以下英文词：faucet / shower / basin / mirror / toilet / bathtub / lighting / curtain / sofa / table / bed / wardrobe`

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: imageType || 'image/jpeg', data: imageBase64 } },
    ])

    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    res.status(200).json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Gemini error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
