import { useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const CATEGORIES = [
  { id: 'faucet', label: '水龙头' },
  { id: 'toilet', label: '马桶' },
  { id: 'bathtub', label: '浴缸' },
  { id: 'basin', label: '洗手盆' },
  { id: 'shower', label: '花洒' },
  { id: 'mirror', label: '镜子' },
  { id: 'accessory', label: '配件' },
]

export default function VendorPage() {
  const fileRef = useRef()

  const [originalPreview, setOriginalPreview] = useState(null)
  const [cleanedBlob, setCleanedBlob] = useState(null)      // File with bg removed
  const [cleanedPreview, setCleanedPreview] = useState(null) // object URL
  const [removingBg, setRemovingBg] = useState(false)
  const [bgDone, setBgDone] = useState(false)

  const [form, setForm] = useState({ name: '', brand: '', price: '', category: 'faucet', description: '' })
  const [showForm, setShowForm] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function pickFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setOriginalPreview(URL.createObjectURL(file))
    setCleanedBlob(null)
    setCleanedPreview(null)
    setBgDone(false)
    setShowForm(false)
    setResult(null)
    setError('')

    // Auto-start background removal
    setRemovingBg(true)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(file, {
        publicPath: '/_next/static/chunks/',
        output: { format: 'image/png', quality: 1.0 },
      })
      const cleanFile = new File([blob], 'product-clean.png', { type: 'image/png' })
      setCleanedBlob(cleanFile)
      setCleanedPreview(URL.createObjectURL(blob))
      setBgDone(true)
    } catch (err) {
      console.error('BG removal failed:', err)
      // Fallback: use original
      setCleanedBlob(file)
      setCleanedPreview(URL.createObjectURL(file))
      setBgDone(true)
    } finally {
      setRemovingBg(false)
    }
  }

  async function uploadToTemp(file) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('图片上传失败')
    const { data } = await res.json()
    return data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
  }

  async function generate() {
    if (!cleanedBlob || !form.name) return
    setGenerating(true)
    setError('')
    try {
      setStatus('上传去背图片...')
      const imageUrl = await uploadToTemp(cleanedBlob)

      setStatus('生成 3D 模型（约 1–2 分钟）...')
      const res = await fetch('/api/meshy-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'image', imageUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '3D 生成失败')

      setStatus('保存到产品库...')
      const saveRes = await fetch('/api/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, glbUrl: data.glbUrl, thumbnailUrl: data.thumbnailUrl }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || '保存失败')

      setResult({ ...data, savedPath: saveData.localPath, productId: saveData.id })
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
      setStatus('')
    }
  }

  function reset() {
    setOriginalPreview(null)
    setCleanedBlob(null)
    setCleanedPreview(null)
    setBgDone(false)
    setShowForm(false)
    setForm({ name: '', brand: '', price: '', category: 'faucet', description: '' })
    setResult(null)
    setError('')
  }

  return (
    <>
      <Head>
        <title>供应商管理 — AR 家居</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm">←</Link>
            <div>
              <h1 className="text-sm font-bold">供应商管理</h1>
              <p className="text-xs text-gray-400">上传产品图 → 自动去背 → 生成 3D</p>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

          {/* Upload area */}
          {!result && (
            <div
              onClick={() => !removingBg && fileRef.current.click()}
              className="bg-white rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:border-gray-400 transition-colors"
            >
              {!originalPreview ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-5xl">📷</span>
                  <p className="font-semibold text-gray-600">点击上传产品图片</p>
                  <p className="text-xs text-gray-400">建议白底或纯色背景，自动去背效果更佳</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {/* Before / After */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1 text-center">原图</p>
                      <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <img src={originalPreview} alt="original" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1 text-center">去背后</p>
                      <div className="aspect-square rounded-xl overflow-hidden bg-[repeating-conic-gradient(#e0e0e0_0%_25%,#f8f8f8_0%_50%)] bg-[length:16px_16px]">
                        {removingBg ? (
                          <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-gray-500">AI 去背中...</p>
                          </div>
                        ) : cleanedPreview ? (
                          <img src={cleanedPreview} alt="cleaned" className="w-full h-full object-contain" />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {bgDone && (
                    <button
                      onClick={e => { e.stopPropagation(); reset() }}
                      className="w-full text-xs text-gray-400 py-1"
                    >
                      重新选择图片
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

          {/* Product info form */}
          {bgDone && !result && (
            <div className="bg-white rounded-2xl p-4">
              <button
                onClick={() => setShowForm(f => !f)}
                className="w-full flex items-center justify-between"
              >
                <p className="text-sm font-semibold">填写产品信息</p>
                <span className="text-gray-400 text-sm">{showForm ? '▲' : '▼'}</span>
              </button>

              {showForm && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">产品名称 *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="例：304不锈钢水龙头 A8"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-500 block mb-1">品牌</label>
                      <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                        placeholder="VODA"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-500 block mb-1">价格</label>
                      <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="RM 389"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">类别</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                            ${form.category === c.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Generate button */}
          {bgDone && !result && !generating && (
            <button
              onClick={() => { setShowForm(true); if (form.name) generate() }}
              disabled={!form.name}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-sm disabled:bg-gray-200 disabled:text-gray-400"
            >
              {form.name ? '生成 3D 模型 →' : '请先填写产品名称'}
            </button>
          )}

          {/* Generating state */}
          {generating && (
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="font-semibold text-sm mb-1">{status}</p>
              <p className="text-xs text-gray-400">约需 1–3 分钟，请勿关闭页面</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div>
              <div className="text-center mb-4">
                <p className="text-2xl mb-1">✅</p>
                <p className="font-bold">生成成功，已保存到产品库</p>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4" style={{ height: 260 }}>
                {/* eslint-disable-next-line */}
                <model-viewer
                  src={result.glbUrl}
                  camera-controls auto-rotate auto-rotate-delay="1000"
                  shadow-intensity="1" environment-image="neutral"
                  style={{ width: '100%', height: '100%', background: '#f8f8f8' }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold">
                  继续上传
                </button>
                {result.productId && (
                  <Link href={`/product/${result.productId}`}
                    className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-center">
                    查看产品页
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
