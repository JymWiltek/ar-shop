import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'faucet', label: '水龙头' },
  { id: 'toilet', label: '马桶' },
  { id: 'bathtub', label: '浴缸' },
  { id: 'basin', label: '洗手盆' },
  { id: 'shower', label: '花洒' },
  { id: 'mirror', label: '镜子' },
]

export default function Home({ products }) {
  const [cat, setCat] = useState('all')
  const filtered = cat === 'all' ? products : products.filter(p => p.category === cat)

  return (
    <>
      <Head>
        <title>AR 家居选购</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Header */}
        <header className="bg-white sticky top-0 z-10 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold tracking-tight">AR 家居</h1>
              <p className="text-xs text-gray-400">选购 · 预览 · 设计</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">🛒</div>
          </div>
        </header>

        <div className="max-w-lg mx-auto">
          {/* Feature 2 Banner — Floor Plan Design */}
          <div className="mx-4 mt-4 bg-gray-900 text-white rounded-2xl overflow-hidden">
            <div className="p-5">
              <p className="text-xs text-yellow-400 font-medium mb-1">AI 室内设计</p>
              <h2 className="text-lg font-bold mb-1">上传平面图，生成你的家</h2>
              <p className="text-xs text-gray-400 mb-4">AI 根据你的房间尺寸，生成可互动的 3D 设计方案<br/>点击场景内任意产品即可更换</p>
              <div className="flex gap-2 flex-wrap">
              <Link
                href="/studio"
                className="inline-block bg-yellow-400 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                🛁 设计浴室 →
              </Link>
              <Link
                href="/scan"
                className="inline-block bg-white/10 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                上传房间照片
              </Link>
              </div>
            </div>
          </div>

          {/* AR Room Banner */}
          <div className="mx-4 mt-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl overflow-hidden">
            <div className="p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-blue-200 font-medium mb-1">多产品 AR 摆放</p>
                <h2 className="text-base font-bold mb-1">把产品放进你家</h2>
                <p className="text-xs text-blue-200">选好多件产品，逐一摆入真实空间</p>
              </div>
              <Link
                href="/ar-room"
                className="flex-shrink-0 bg-white text-blue-700 font-bold px-4 py-2.5 rounded-xl text-sm whitespace-nowrap"
              >
                📱 AR 摆放 →
              </Link>
            </div>
          </div>

          {/* Section header */}
          <div className="px-4 mt-7 mb-3 flex items-center justify-between">
            <h2 className="font-bold text-base">浴室产品</h2>
            <span className="text-xs text-gray-400">点击产品可 3D / AR 预览</span>
          </div>

          {/* Category filter */}
          <div className="px-4 mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                  ${cat === c.id ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {filtered.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform">
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    {/* 3D badge if GLB exists */}
                    {product.glbUrl && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        3D · AR
                      </div>
                    )}
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="text-xs text-gray-500 font-medium">暂时缺货</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{product.brand}</p>
                    <p className="text-sm font-semibold leading-tight mb-1">{product.name}</p>
                    <p className="text-sm font-bold">{product.price}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer — vendor link */}
        <div className="max-w-lg mx-auto px-4 mt-10 text-center">
          <Link href="/vendor" className="text-xs text-gray-400 underline">
            供应商入口 — 上传产品生成 3D
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}

export async function getServerSideProps() {
  const { getAllProducts } = await import('../data/getAllProducts')
  const products = getAllProducts()
  return { props: { products } }
}
