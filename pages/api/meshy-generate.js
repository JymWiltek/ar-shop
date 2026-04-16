/**
 * Meshy 3D 生成 API
 *
 * POST /api/meshy-generate
 * body: { mode: 'text', prompt: '...' }
 *   or: { mode: 'image', imageUrl: 'https://...' }
 *
 * 流程: 提交任务 → 轮询状态 → 返回 GLB URL
 */

const MESHY_BASE = 'https://api.meshy.ai'
const KEY = process.env.MESHY_API_KEY

const headers = () => ({
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
})

// 提交任务
async function submitTask(mode, body) {
  const url = mode === 'image'
    ? `${MESHY_BASE}/openapi/v1/image-to-3d`
    : `${MESHY_BASE}/openapi/v2/text-to-3d`

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meshy submit failed (${res.status}): ${err}`)
  }
  return res.json() // { result: taskId }
}

// 查询任务状态（轮询，最多 5 分钟）
async function pollTask(taskId, mode) {
  const url = mode === 'image'
    ? `${MESHY_BASE}/openapi/v1/image-to-3d/${taskId}`
    : `${MESHY_BASE}/openapi/v2/text-to-3d/${taskId}`

  const maxAttempts = 60   // 60 × 5s = 5 min
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const res = await fetch(url, { headers: headers() })
    if (!res.ok) throw new Error(`Meshy poll failed (${res.status})`)
    const data = await res.json()

    if (data.status === 'SUCCEEDED') return data
    if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      throw new Error(`Meshy task ${data.status}: ${data.task_error?.message || ''}`)
    }
    // PENDING / IN_PROGRESS → 继续等
  }
  throw new Error('Meshy task timed out after 5 minutes')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!KEY) return res.status(500).json({ error: 'MESHY_API_KEY not set' })

  const { mode, prompt, imageUrl, style } = req.body

  try {
    let taskId, taskData

    if (mode === 'image') {
      // 图片转 3D
      if (!imageUrl) return res.status(400).json({ error: 'imageUrl required for image mode' })
      const { result } = await submitTask('image', {
        image_url: imageUrl,
        enable_pbr: true,
      })
      taskId = result
      taskData = await pollTask(taskId, 'image')

    } else {
      // 文字转 3D（两阶段：preview → refine）
      if (!prompt) return res.status(400).json({ error: 'prompt required for text mode' })

      // 阶段一：preview（快，约 1 min）
      const { result: previewId } = await submitTask('text', {
        mode: 'preview',
        prompt,
        art_style: style || 'realistic',
        negative_prompt: 'low quality, cartoon',
      })
      const preview = await pollTask(previewId, 'text')

      // 阶段二：refine（高精度贴图，约 2 min）
      const { result: refineId } = await submitTask('text', {
        mode: 'refine',
        preview_task_id: previewId,
      })
      taskData = await pollTask(refineId, 'text')
    }

    // 返回 GLB / thumbnail
    res.status(200).json({
      glbUrl:       taskData.model_urls?.glb,
      fbxUrl:       taskData.model_urls?.fbx,
      usdzUrl:      taskData.model_urls?.usdz,
      thumbnailUrl: taskData.thumbnail_url,
      taskId:       taskData.id,
    })

  } catch (err) {
    console.error('[meshy-generate]', err.message)
    res.status(500).json({ error: err.message })
  }
}

// 关掉 body 大小限制（图片 URL 传输）
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }
