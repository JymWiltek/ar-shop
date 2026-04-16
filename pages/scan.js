import { useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

const STYLES = [
  { id: 'minimalist', label: '极简现代', emoji: '⬜', desc: '白墙大砖，干净利落' },
  { id: 'nordic',     label: '北欧风',   emoji: '🌿', desc: '木色暖调，自然采光' },
  { id: 'industrial', label: '工业风',   emoji: '🔩', desc: '裸混凝土，哑光黑铁' },
  { id: 'luxury',     label: '奢华风',   emoji: '✨', desc: '大理石，金色配件' },
]

export default function ScanPage() {
  const router = useRouter()
  const fileRef = useRef()

  const [photo, setPhoto] = useState(null)       // { url, base64, type }
  const [style, setStyle] = useState('minimalist')
  const [step, setStep] = useState('upload')     // upload | generating | result

  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  const [resultImage, setResultImage] = useState(null)    // base64 data URL of redesigned image
  const [hotspots, setHotspots] = useState([])
  const [activeHotspot, setActiveHotspot] = useState(null)
  const [products, setProducts] = useState([])

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target.result
      setPhoto({ url: dataUrl, base64: dataUrl.split(',')[1], type: file.type })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  async function generate() {
    if (!photo) return
    setStep('generating')
    setError('')
    setHotspots([])
    setActiveHotspot(null)

    try {
      // Step 1: Redesign room with GPT Image 1
      setStatusMsg('AI 正在重新设计你的浴室...')
      const redesignRes = await fetch('/api/redesign-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo.base64, imageType: photo.type, style }),
      })
      const redesignData = await redesignRes.json()
      if (!redesignRes.ok) throw new Error(redesignData.error || '设计生成失败')

      const newImageUrl = redesignData.imageUrl
      setResultImage(newImageUrl)

      // Step 2: Identify products in the redesigned image
      setStatusMsg('识别设计图中的产品...')
      const b64 = newImageUrl.split(',')[1]
      const identifyRes = await fetch('/api/identify-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, imageType: 'image/png' }),
      })
      const identifyData = await identifyRes.json()
      if (!identifyRes.ok) throw new Error(identifyData.error || '产品识别失败')

      setHotspots(identifyData.hotspots || [])

      // Step 3: Load product details for matched hotspots
      const productRes = await fetch('/api/get-products')
      if (productRes.ok) {
        const { products: allProducts } = await productRes.json()
        setProducts(allProducts)
      }

      setStep('result')
    } catch (err) {
      setError(err.message)
      setStep('upload')
    }
  }

  function reset() {
    setStep('upload')
    setPhoto(null)
    setResultImage(null)
    setHotspots([])
    setActiveHotspot(null)
    setError('')
  }

  const activeHs = hotspots.find(h => h.id === activeHotspot)
  const activeProduct = activeHs?.productId ? products.find(p => p.id === activeHs.productId) : null

  return (
    <>
      <Head>
        <title>AI 室内设计 — AR 家居</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => step === 'result' ? reset() : router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-sm flex-shrink-0">
            ←
          </button>
          <div>
            <h1 className="font-bold text-sm">AI 室内设计</h1>
            <p className="text-xs text-gray-400">
              {step === 'upload' ? '上传你的浴室照片' : step === 'generating' ? statusMsg : '点击发光点查看产品'}
            </p>
          </div>
        </div>

        {/* ── UPLOAD + STYLE ── */}
        {step === 'upload' && (
          <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 pb-10">
            {/* Photo upload */}
            <div
              onClick={() => fileRef.current.click()}
              className="relative bg-white rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-gray-400 transition-colors"
              style={{ minHeight: 200 }}
            >
              {photo ? (
                <>
                  <img src={photo.url} alt="room" className="w-full object-cover" style={{ maxHeight: 280 }} />
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    重新选择
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-5xl">🛁</span>
                  <p className="font-semibold text-gray-600">上传浴室照片</p>
                  <p className="text-xs text-gray-400">AI 将根据照片重新设计</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />

            {/* Style picker */}
            <div className="bg-white rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">选择风格</p>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${style === s.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="text-xl mb-1">{s.emoji}</div>
                    <p className={`text-sm font-semibold ${style === s.id ? 'text-white' : 'text-gray-800'}`}>{s.label}</p>
                    <p className={`text-xs mt-0.5 ${style === s.id ? 'text-gray-300' : 'text-gray-400'}`}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button onClick={generate} disabled={!photo}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-sm disabled:bg-gray-200 disabled:text-gray-400">
              ✨ AI 生成设计方案
            </button>
          </div>
        )}

        {/* ── GENERATING ── */}
        {step === 'generating' && (
          <div className="max-w-lg mx-auto px-4 pt-10 text-center">
            {/* Before/after preview */}
            <div className="relative rounded-2xl overflow-hidden mb-6 bg-gray-200" style={{ height: 240 }}>
              <img src={photo.url} alt="original" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-white font-semibold text-sm">{statusMsg}</p>
                <p className="text-white/60 text-xs mt-1">约 20–40 秒</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">AI 正在重新设计你的浴室，请勿关闭页面</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === 'result' && resultImage && (
          <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 57px)' }}>
            {/* Before / After toggle strip */}
            <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-3 max-w-lg mx-auto w-full">
              <p className="text-xs text-gray-400 my-auto">{STYLES.find(s => s.id === style)?.emoji} {STYLES.find(s => s.id === style)?.label}</p>
              <div className="flex-1" />
              <button onClick={reset} className="text-xs text-gray-500 underline">重新上传</button>
            </div>

            {/* Redesigned image with hotspots */}
            <div
              className="relative bg-black flex-shrink-0"
              style={{ paddingBottom: '66%' }}
              onClick={() => setActiveHotspot(null)}
            >
              <img src={resultImage} alt="redesigned" className="absolute inset-0 w-full h-full object-cover" />

              {/* Hotspot dots */}
              {hotspots.map(h => (
                <button
                  key={h.id}
                  onClick={e => { e.stopPropagation(); setActiveHotspot(activeHotspot === h.id ? null : h.id) }}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <span className="absolute inset-0 rounded-full bg-white/60 animate-ping" />
                  <span className={`relative block w-5 h-5 rounded-full border-2 border-white shadow-lg transition-all ${activeHotspot === h.id ? 'bg-yellow-400 scale-125' : 'bg-white/90'}`} />
                </button>
              ))}

              {/* Tooltip */}
              {activeHs && (
                <div style={{ left: `${activeHs.x}%`, top: `${Math.max(activeHs.y - 12, 5)}%` }}
                  className="absolute -translate-x-1/2 -translate-y-full z-20 bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap pointer-events-none">
                  {activeHs.label}
                </div>
              )}

              {/* "AI 重新生成" hint */}
              {hotspots.length > 0 && (
                <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur">
                  ✨ AI 生成 · {hotspots.length} 件产品已识别
                </div>
              )}
            </div>

            {/* Product drawer */}
            <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-10 max-w-lg mx-auto w-full">
              {activeHs ? (
                /* Product detail */
                <div className="px-5 pt-5 pb-28">
                  <p className="text-xs text-gray-400 mb-1">{activeHs.category}</p>
                  {activeProduct ? (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold flex-1 pr-3">{activeProduct.name}</h3>
                        <p className="text-lg font-bold flex-shrink-0">{activeProduct.price}</p>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{activeProduct.description}</p>
                      {activeProduct.glbUrl && (
                        <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                          <span className="text-xl">📱</span>
                          <div>
                            <p className="text-sm font-semibold text-blue-800">支持 3D / AR 预览</p>
                            <p className="text-xs text-blue-600">用手机把这件产品放进你家</p>
                          </div>
                        </div>
                      )}
                      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3 max-w-lg mx-auto">
                        <Link href={`/product/${activeProduct.id}`}
                          className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3.5 rounded-2xl text-sm text-center">
                          {activeProduct.glbUrl ? '📱 AR 预览' : '查看产品'}
                        </Link>
                        <button className="flex-1 bg-gray-900 text-white font-semibold py-3.5 rounded-2xl text-sm">
                          立即购买
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-1">🚧 {activeHs.label} — 即将上架</p>
                      <p className="text-xs text-amber-700">我们正在为这个分类添加产品，敬请期待。</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Summary */
                <div className="px-5 pt-5 pb-8">
                  <h2 className="font-bold text-base mb-1">{STYLES.find(s => s.id === style)?.label}风格方案</h2>
                  <p className="text-xs text-gray-400 mb-4">点击图片上的发光点查看对应产品</p>

                  {hotspots.length > 0 ? (
                    <div className="space-y-2 mb-5">
                      {hotspots.map(h => {
                        const p = h.productId ? products.find(pr => pr.id === h.productId) : null
                        return (
                          <button key={h.id} onClick={() => setActiveHotspot(h.id)}
                            className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 active:bg-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                              <span className="text-sm font-medium">{h.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {p ? (
                                <span className="text-sm font-bold">{p.price}</span>
                              ) : (
                                <span className="text-xs text-gray-400">即将上架</span>
                              )}
                              <span className="text-gray-300">›</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-5">未识别到产品，请点击图片查看设计</p>
                  )}

                  <div className="bg-gray-900 rounded-2xl px-5 py-4 flex justify-between items-center">
                    <div>
                      <p className="text-white/60 text-xs">想要全屋报价？</p>
                      <p className="text-white font-bold">联系设计顾问</p>
                    </div>
                    <button className="bg-white text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm">获取报价</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
