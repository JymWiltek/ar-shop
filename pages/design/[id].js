import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import designs from '../../data/designs'
import products from '../../data/products'

export default function DesignPage() {
  const router = useRouter()
  const { id } = router.query
  const [activeHotspot, setActiveHotspot] = useState(null)

  const design = designs.find((d) => d.id === id)
  if (!design) return null

  const getProduct = (productId) => products.find((p) => p.id === productId)

  const hotspot = activeHotspot ? design.hotspots.find((h) => h.id === activeHotspot) : null
  const product = hotspot?.productId ? getProduct(hotspot.productId) : null

  return (
    <>
      <Head>
        <title>{design.name} — AR 家居</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-black flex flex-col">
        {/* Top nav */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur sticky top-0 z-20">
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white">
            ←
          </Link>
          <div className="text-center">
            <p className="text-white font-semibold text-sm">{design.name}</p>
            <p className="text-white/40 text-xs">{design.style} · 点击发光点查看产品</p>
          </div>
          <div className="w-9 h-9" />
        </div>

        {/* Design image with hotspots */}
        <div
          className="relative w-full flex-shrink-0"
          style={{ paddingBottom: '60%' }}
          onClick={() => setActiveHotspot(null)}
        >
          <img
            src={design.imageUrl}
            alt={design.name}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Hotspots */}
          {design.hotspots.map((h) => (
            <button
              key={h.id}
              onClick={(e) => {
                e.stopPropagation()
                setActiveHotspot(activeHotspot === h.id ? null : h.id)
              }}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            >
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-full bg-white/60 animate-ping" />
              {/* Dot */}
              <span
                className={`relative block w-5 h-5 rounded-full border-2 border-white shadow-lg transition-all ${
                  activeHotspot === h.id
                    ? 'bg-yellow-400 scale-125'
                    : 'bg-white/90'
                }`}
              />
            </button>
          ))}

          {/* Hotspot label tooltip */}
          {hotspot && (
            <div
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y - 10}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-full z-20 bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap"
            >
              {hotspot.label}
            </div>
          )}
        </div>

        {/* Product drawer */}
        <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10">
          {!hotspot ? (
            /* Default: show design summary */
            <div className="px-5 pt-6 pb-8">
              <p className="text-xs text-gray-400 mb-1">{design.style}风格</p>
              <h2 className="text-xl font-bold mb-2">{design.name}</h2>
              <p className="text-sm text-gray-500 mb-5">{design.description}</p>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                包含 {design.hotspots.length} 件产品
              </p>
              <div className="space-y-2">
                {design.hotspots.map((h) => {
                  const p = h.productId ? getProduct(h.productId) : null
                  return (
                    <button
                      key={h.id}
                      onClick={() => setActiveHotspot(h.id)}
                      className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 active:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <span className="text-sm font-medium">{h.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p ? (
                          <span className="text-sm font-bold">{p.price}</span>
                        ) : (
                          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                            即将上架
                          </span>
                        )}
                        <span className="text-gray-300">›</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Total estimate */}
              <div className="mt-5 bg-gray-900 rounded-2xl px-5 py-4 flex justify-between items-center">
                <div>
                  <p className="text-white/60 text-xs">预计总价</p>
                  <p className="text-white font-bold text-lg">RM 5,250 起</p>
                </div>
                <button className="bg-white text-gray-900 font-semibold px-5 py-2 rounded-xl text-sm">
                  获取报价
                </button>
              </div>
            </div>
          ) : product ? (
            /* Real product */
            <div className="px-5 pt-6 pb-28">
              <p className="text-xs text-gray-400 mb-1">{product.category}</p>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold flex-1 pr-4">{product.name}</h3>
                <p className="text-xl font-bold">{product.price}</p>
              </div>
              <p className="text-sm text-gray-500 mb-4">{product.description}</p>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap mb-5">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* 3D preview hint */}
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-sm font-semibold">支持 AR 预览</p>
                  <p className="text-xs text-gray-400">用手机把这件产品放进你家</p>
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
                <Link
                  href={`/product/${product.id}`}
                  className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3.5 rounded-2xl text-sm text-center"
                >
                  📱 AR 预览
                </Link>
                <button className="flex-1 bg-gray-900 text-white font-semibold py-3.5 rounded-2xl text-sm">
                  立即购买
                </button>
              </div>
            </div>
          ) : (
            /* Placeholder product */
            <div className="px-5 pt-6 pb-28">
              <p className="text-xs text-gray-400 mb-1">预计价格</p>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold flex-1 pr-4">{hotspot.placeholder?.name}</h3>
                <p className="text-xl font-bold text-gray-400">{hotspot.placeholder?.price}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">🚧 产品即将上架</p>
                <p className="text-xs text-amber-700">
                  我们正在为这个分类添加更多产品。登记后第一时间通知你。
                </p>
              </div>

              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4">
                <button className="w-full bg-gray-900 text-white font-semibold py-3.5 rounded-2xl text-sm">
                  🔔 上架时通知我
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
