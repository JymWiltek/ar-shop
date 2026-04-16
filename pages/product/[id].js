import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function ProductPage({ product }) {
  const router = useRouter()
  const [isARSupported, setIsARSupported] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    setIsARSupported(/android|iphone|ipad|ipod/i.test(ua))
  }, [])

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">产品不存在</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{product.name} — AR 家居</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-white flex flex-col">
        {/* Top nav */}
        <div className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10 border-b border-gray-100">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100">
            ←
          </button>
          <span className="text-sm font-medium text-gray-500">{product.category}</span>
          <div className="w-9" />
        </div>

        {/* 3D / AR Viewer */}
        <div className="relative bg-gray-50" style={{ height: '60vw', minHeight: 280, maxHeight: 400 }}>
          {product.glbUrl ? (
            /* eslint-disable-next-line */
            <model-viewer
              src={product.glbUrl}
              ios-src={product.usdzUrl || undefined}
              ar
              ar-modes="scene-viewer webxr quick-look"
              camera-controls
              auto-rotate
              auto-rotate-delay="2000"
              shadow-intensity="1"
              environment-image="neutral"
              style={{ width: '100%', height: '100%', background: '#f8f8f8' }}
            >
              {isARSupported && (
                <button slot="ar-button" style={{
                  position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                  background: '#111', color: '#fff', border: 'none', borderRadius: 20,
                  padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>
                  📱 在我家预览
                </button>
              )}
            </model-viewer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <img src={product.image} alt={product.name} className="max-h-48 object-contain" />
              <p className="text-xs text-gray-400">3D 模型生成中</p>
            </div>
          )}

          {product.glbUrl && !isARSupported && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-800/80 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
              用手机打开以体验 AR 预览
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 px-5 pt-5 pb-32">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">{product.brand}</p>
              <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-xl font-bold">{product.price}</p>
              <p className={`text-xs font-medium ${product.inStock ? 'text-green-600' : 'text-gray-400'}`}>
                {product.inStock ? '✓ 有货' : '暂时缺货'}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(product.tags || []).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>

          {/* AR tip */}
          {product.glbUrl && isARSupported && (
            <div className="mt-5 bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">📱 如何 AR 预览</p>
              <ol className="text-xs text-blue-700 space-y-1">
                <li>1. 点击下方「在我家预览 AR」</li>
                <li>2. 将手机对准地板或桌面</li>
                <li>3. 点击放置产品，拖动调整位置</li>
              </ol>
            </div>
          )}

          {/* Multi-product AR */}
          {product.glbUrl && (
            <Link href={`/ar-room?add=${product.id}`} className="mt-4 flex items-center gap-3 bg-indigo-50 rounded-xl p-4">
              <span className="text-2xl">🏠</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-800">多产品 AR 摆放</p>
                <p className="text-xs text-indigo-600">把多件产品同时放入你的真实空间</p>
              </div>
              <span className="text-indigo-400 text-lg">›</span>
            </Link>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          {product.glbUrl && isARSupported ? (
            <button
              onClick={() => { const mv = document.querySelector('model-viewer'); if (mv) mv.activateAR() }}
              className="flex-1 bg-gray-900 text-white font-semibold py-3.5 rounded-2xl text-sm"
            >
              📱 在我家预览 AR
            </button>
          ) : product.glbUrl ? (
            <button disabled className="flex-1 bg-gray-100 text-gray-400 font-semibold py-3.5 rounded-2xl text-sm">
              手机端可体验 AR
            </button>
          ) : null}
          <button
            disabled={!product.inStock}
            className="flex-1 bg-black text-white font-semibold py-3.5 rounded-2xl text-sm disabled:bg-gray-200 disabled:text-gray-400"
          >
            {product.inStock ? '立即购买' : '暂时缺货'}
          </button>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ params }) {
  const { getAllProducts } = await import('../../data/getAllProducts')
  const products = getAllProducts()
  const product = products.find(p => p.id === params.id) || null
  return { props: { product } }
}
