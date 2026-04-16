// API: 根据房间类型 + 产品列表 + 风格，选最匹配的设计图
// 如果有 OPENAI_API_KEY → 用 GPT Image 1 真正生成图片
// 如果没有 → 从 variants 里智能选一张最匹配的 Unsplash 图片（免费）
// POST /api/generate-design
// body: { roomType, style, products: [{name, category}], designTip, variants: [url] }

import { GoogleGenerativeAI } from '@google/generative-ai'

const BATHROOM_VARIANTS = {
  minimalist: [
    { url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=90', tags: ['basin', 'mirror', 'faucet'] },
    { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=90', tags: ['shower', 'toilet', 'full'] },
    { url: 'https://images.unsplash.com/photo-1564540574859-0dfb63985953?w=1200&q=90', tags: ['shower', 'glass'] },
    { url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=90', tags: ['bathtub', 'full'] },
  ],
  nordic: [
    { url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1200&q=90', tags: ['basin', 'mirror', 'warm'] },
    { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=90', tags: ['shower', 'wood', 'warm'] },
  ],
  industrial: [
    { url: 'https://images.unsplash.com/photo-1564540574859-0dfb63985953?w=1200&q=90', tags: ['dark', 'shower'] },
  ],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { roomType = 'bathroom', style = 'minimalist', products = [], designTip = '' } = req.body

  // ── Path A: Real AI image generation (needs OPENAI_API_KEY) ──────────────
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    const STYLE_PROMPTS = {
      minimalist: 'minimalist style, white walls, clean lines, no clutter, soft natural light',
      nordic: 'Nordic Scandinavian style, warm wood tones, white walls, cozy atmosphere',
      industrial: 'industrial style, exposed concrete, matte black metal fixtures, raw textures',
    }
    const productDesc = products.length > 0
      ? products.map(p => p.name).join(', ')
      : 'modern bathroom fixtures'
    const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimalist
    const prompt = `Photorealistic interior design render of a ${roomType}, ${styleDesc}. ` +
      `Features: ${productDesc}. ` +
      (designTip ? `${designTip}. ` : '') +
      `Architectural photography, soft lighting, 4K, no people, high-end magazine quality.`

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'medium' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Image generation failed')
      const imageB64 = data.data?.[0]?.b64_json
      return res.status(200).json({
        imageUrl: imageB64 ? `data:image/png;base64,${imageB64}` : data.data?.[0]?.url,
        source: 'ai-generated',
        prompt,
      })
    } catch (err) {
      console.error('OpenAI error:', err.message)
      // Fall through to smart variant selection
    }
  }

  // ── Path B: Smart variant selection using Gemini (free) ──────────────────
  const geminiKey = process.env.GEMINI_API_KEY
  const variants = BATHROOM_VARIANTS[style] || BATHROOM_VARIANTS.minimalist
  const productCategories = products.map(p => p.category)

  // Pick the variant whose tags best overlap with the detected products
  let bestVariant = variants[0]
  let bestScore = -1
  for (const v of variants) {
    const score = v.tags.filter(t => productCategories.includes(t) || t === 'full').length
    if (score > bestScore) { bestScore = score; bestVariant = v }
  }

  // If Gemini available, let it pick more intelligently
  if (geminiKey && variants.length > 1) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const prompt = `Given these bathroom products: ${productCategories.join(', ')}, and style: ${style}, ` +
        `which image variant index (0-${variants.length - 1}) best showcases these products? ` +
        `Variants by focus: ${variants.map((v, i) => `[${i}] ${v.tags.join('+')}`).join(', ')}. ` +
        `Reply with ONLY the number.`
      const result = await model.generateContent(prompt)
      const idx = parseInt(result.response.text().trim())
      if (!isNaN(idx) && idx >= 0 && idx < variants.length) {
        bestVariant = variants[idx]
      }
    } catch (e) {
      // Use score-based selection
    }
  }

  return res.status(200).json({
    imageUrl: bestVariant.url,
    source: 'curated',
    style,
  })
}
