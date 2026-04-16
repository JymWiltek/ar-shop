import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function ARRoomPage({ products }) {
  const router = useRouter()
  const canvasRef = useRef()
  const overlayRef = useRef()
  const engineRef = useRef(null)

  const [arSupported, setARSupported] = useState(null)
  const [phase, setPhase] = useState('select') // select | ar
  const [selected, setSelected] = useState(new Set())
  const [placingIdx, setPlacingIdx] = useState(0)   // which product we're placing next
  const [placedCount, setPlacedCount] = useState(0)
  const [reticleVisible, setReticleVisible] = useState(false)
  const [error, setError] = useState('')

  const glbProducts = products.filter(p => p.glbUrl)
  const selectedList = [...selected].map(id => glbProducts.find(p => p.id === id)).filter(Boolean)

  // Pre-select product from ?add= query param
  useEffect(() => {
    if (router.query.add) {
      const id = router.query.add
      if (glbProducts.find(p => p.id === id)) {
        setSelected(new Set([id]))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.add])

  // Check WebXR support
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar')
        .then(ok => setARSupported(ok))
        .catch(() => setARSupported(false))
    } else {
      setARSupported(false)
    }
  }, [])

  function toggleProduct(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Start WebXR AR session ─────────────────────────────────────────────────
  async function startAR() {
    if (!selectedList.length) return
    setPhase('ar')
    setPlacingIdx(0)
    setPlacedCount(0)
    setError('')

    try {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

      // ── Renderer ───────────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
      })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.xr.enabled = true
      renderer.shadowMap.enabled = true

      // ── Scene & camera ─────────────────────────────────────────────────────
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 1.0))
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight.position.set(1, 3, 2)
      scene.add(dirLight)

      // ── Reticle (placement ring) ───────────────────────────────────────────
      const reticleGeo = new THREE.RingGeometry(0.10, 0.13, 32).rotateX(-Math.PI / 2)
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      const reticle = new THREE.Mesh(reticleGeo, reticleMat)
      reticle.matrixAutoUpdate = false
      reticle.visible = false
      scene.add(reticle)

      // Inner dot
      const dotGeo = new THREE.CircleGeometry(0.04, 32).rotateX(-Math.PI / 2)
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true, side: THREE.DoubleSide })
      const dot = new THREE.Mesh(dotGeo, dotMat)
      reticle.add(dot)

      // ── XR Session ────────────────────────────────────────────────────────
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: overlayRef.current ? { root: overlayRef.current } : undefined,
      })

      await renderer.xr.setSession(session)

      const refSpace = await session.requestReferenceSpace('local')
      const viewerSpace = await session.requestReferenceSpace('viewer')
      const hitTestSource = await session.requestHitTestSource({ space: viewerSpace })

      // Track placed index in a ref so event handler always gets latest value
      let currentIdx = 0
      const loader = new GLTFLoader()
      const placedGroups = []

      // ── Place product on tap ───────────────────────────────────────────────
      session.addEventListener('select', async () => {
        if (!reticle.visible) return
        if (currentIdx >= selectedList.length) return

        const product = selectedList[currentIdx]

        try {
          const gltf = await new Promise((res, rej) => loader.load(product.glbUrl, res, undefined, rej))
          const group = gltf.scene

          // Scale to ~0.5m longest dim
          const box = new THREE.Box3().setFromObject(group)
          const size = new THREE.Vector3()
          box.getSize(size)
          const scale = 0.5 / Math.max(size.x, size.y, size.z)
          group.scale.setScalar(scale)

          // Sit on floor
          const box2 = new THREE.Box3().setFromObject(group)
          group.position.setFromMatrixPosition(reticle.matrix)
          group.position.y -= box2.min.y * scale

          group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
          scene.add(group)
          placedGroups.push(group)

          currentIdx++
          setPlacingIdx(currentIdx)
          setPlacedCount(currentIdx)

          if (currentIdx >= selectedList.length) {
            reticle.visible = false
            setReticleVisible(false)
          }
        } catch (e) {
          console.warn('Failed to load', product.glbUrl, e.message)
          currentIdx++ // skip broken model
          setPlacingIdx(currentIdx)
        }
      })

      // ── Render loop ────────────────────────────────────────────────────────
      renderer.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          const hits = frame.getHitTestResults(hitTestSource)
          if (hits.length > 0 && currentIdx < selectedList.length) {
            const pose = hits[0].getPose(refSpace)
            reticle.visible = true
            reticle.matrix.fromArray(pose.transform.matrix)
            if (!reticleVisible) setReticleVisible(true)
          } else if (currentIdx >= selectedList.length) {
            reticle.visible = false
          }
        }
        renderer.render(scene, camera)
      })

      // End session cleanup
      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null)
        hitTestSource.cancel()
        renderer.dispose()
        engineRef.current = null
        setPhase('select')
        setPlacingIdx(0)
        setPlacedCount(0)
        setReticleVisible(false)
      })

      engineRef.current = { renderer, session, scene }

    } catch (err) {
      console.error('[ar-room]', err)
      setError(err.message || 'AR 启动失败')
      setPhase('select')
    }
  }

  function exitAR() {
    engineRef.current?.session?.end()
  }

  return (
    <>
      <Head>
        <title>AR 布置房间 — AR 家居</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* ── AR canvas (always mounted, hidden during select phase) ── */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ display: phase === 'ar' ? 'block' : 'none', zIndex: 0 }}
      />

      {/* ── DOM overlay (shown during AR) ── */}
      <div
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none"
        style={{ display: phase === 'ar' ? 'flex' : 'none', flexDirection: 'column', zIndex: 10 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-safe pt-10 pointer-events-auto">
          <button
            onClick={exitAR}
            className="bg-black/60 text-white text-sm px-4 py-2 rounded-full backdrop-blur"
          >
            ✕ 退出
          </button>
          <div className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur">
            {placedCount}/{selectedList.length} 件已放置
          </div>
        </div>

        {/* Bottom instruction */}
        <div className="flex-1 flex flex-col items-center justify-end pb-16">
          {placingIdx < selectedList.length ? (
            <div className="bg-black/70 backdrop-blur rounded-2xl px-6 py-4 mx-4 text-center pointer-events-none">
              <p className="text-white/60 text-xs mb-1">点击地板放置</p>
              <p className="text-white font-bold text-base">
                {selectedList[placingIdx]?.name}
              </p>
              <p className="text-white/50 text-xs mt-1">
                {placingIdx + 1} / {selectedList.length}
              </p>
            </div>
          ) : (
            <div className="bg-black/70 backdrop-blur rounded-2xl px-6 py-4 mx-4 text-center pointer-events-none">
              <p className="text-white font-bold">✅ 全部放置完成</p>
              <p className="text-white/60 text-xs mt-1">移动手机查看效果</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Select phase ── */}
      {phase === 'select' && (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
              <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm">←</button>
              <div>
                <h1 className="text-sm font-bold">AR 布置房间</h1>
                <p className="text-xs text-gray-400">选择产品，同时放入真实空间</p>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto px-4 pt-4 pb-32 flex-1">
            {/* AR not supported */}
            {arSupported === false && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <p className="font-semibold text-amber-800 text-sm mb-1">⚠️ 此设备不支持 WebAR</p>
                <p className="text-xs text-amber-700">请用 Android 手机的 Chrome 浏览器，或 iPhone 单独查看每件产品的 AR 预览。</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Selection count */}
            {selected.size > 0 && (
              <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">已选 {selected.size} 件产品</p>
                <button onClick={() => setSelected(new Set())} className="text-xs text-white/50">清除</button>
              </div>
            )}

            {/* Product grid */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">选择要摆放的产品</p>
            <div className="grid grid-cols-2 gap-3">
              {glbProducts.map(p => {
                const isSelected = selected.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className={`relative rounded-2xl overflow-hidden border-2 text-left transition-all active:scale-95
                      ${isSelected ? 'border-gray-900' : 'border-transparent'}`}
                  >
                    <div className="aspect-square bg-gray-100 relative">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }} />
                      {isSelected && (
                        <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
                          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {[...selected].indexOf(p.id) + 1}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        3D·AR
                      </div>
                    </div>
                    <div className="p-3 bg-white">
                      <p className="text-xs text-gray-400">{p.brand}</p>
                      <p className="text-sm font-semibold leading-tight">{p.name}</p>
                      <p className="text-sm font-bold mt-0.5">{p.price}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 max-w-lg mx-auto">
            <button
              onClick={startAR}
              disabled={selected.size === 0 || arSupported === false}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-sm disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2"
            >
              {arSupported === false
                ? '此设备不支持多产品 AR'
                : selected.size === 0
                  ? '请先选择产品'
                  : `📱 开始 AR — 放置 ${selected.size} 件产品`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export async function getServerSideProps() {
  const { getAllProducts } = await import('../data/getAllProducts')
  const products = getAllProducts()
  return { props: { products } }
}
