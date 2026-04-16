import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

// ── Room dimensions ─────────────────────────────────────────────────────────
const ROOM = { W: 3.4, D: 3.8, H: 2.7 }

// ── Product slots in the bathroom ───────────────────────────────────────────
const SLOTS = [
  {
    id: 'bathtub',
    label: '浴缸',
    category: 'bathtub',
    pos: [-ROOM.W/2 + 0.52, 0, -0.1],
    rot: [0, 0, 0],
    targetSize: 1.55,
    isolate: true,   // hide extra props baked into GLB
  },
  {
    id: 'toilet',
    label: '马桶',
    category: 'toilet',
    pos: [0.15, 0, -ROOM.D/2 + 0.38],
    rot: [0, 0, 0],
    targetSize: 0.68,
  },
  {
    id: 'faucet',
    label: '水龙头',
    category: 'faucet',
    pos: [ROOM.W/2 - 0.46, 0.96, -ROOM.D/2 + 0.20],
    rot: [0, Math.PI, 0],
    targetSize: 0.18,
    isolate: true,
  },
]

// ── Which product each slot shows per style ──────────────────────────────────
const STYLE_DEFAULTS = {
  luxury:     { bathtub: 'bathtub-gold',   toilet: 'toilet-wc890', faucet: 'faucet-31016' },
  minimalist: { bathtub: 'bathtub-guifei', toilet: 'toilet-wc890', faucet: 'faucet-gm88' },
  nordic:     { bathtub: 'bathtub-guifei', toilet: 'toilet-wc890', faucet: 'faucet-31016' },
  industrial: { bathtub: 'bathtub-guifei', toilet: 'toilet-wc890', faucet: 'faucet-gm88' },
}

// ── Room colors per style ───────────────────────────────────────────────────
const STYLE_ROOM = {
  luxury:     { wall: '#e5dcc8', floor: '#cec5ae', wallRoughness: 0.15, floorRoughness: 0.20 },
  minimalist: { wall: '#f2f0ec', floor: '#dddad4', wallRoughness: 0.45, floorRoughness: 0.50 },
  nordic:     { wall: '#ede9e0', floor: '#d6d0c4', wallRoughness: 0.35, floorRoughness: 0.40 },
  industrial: { wall: '#8a8178', floor: '#706860', wallRoughness: 0.70, floorRoughness: 0.75 },
}

const STYLES = [
  { id: 'luxury',     label: '奢华', emoji: '✨' },
  { id: 'minimalist', label: '极简', emoji: '⬜' },
  { id: 'nordic',     label: '北欧', emoji: '🌿' },
  { id: 'industrial', label: '工业', emoji: '🔩' },
]

// ── Static product catalog (same as data/products.js) ────────────────────────
async function fetchProducts() {
  const res = await fetch('/api/get-products')
  if (!res.ok) return []
  const { products } = await res.json()
  return products
}

export default function StudioPage() {
  const router = useRouter()
  const canvasRef = useRef()

  // Three.js engine refs (not state — no re-renders)
  const engineRef = useRef(null)           // { scene, camera, renderer, controls }
  const loadedGroupsRef = useRef(new Map()) // slotId → THREE.Group
  const meshToSlotRef = useRef(new Map())  // mesh uuid → slotId
  const wallMatsRef = useRef([])           // wall MeshStandardMaterials
  const floorMatRef = useRef(null)

  // React state
  const [style, setStyle] = useState('luxury')
  const [slotProducts, setSlotProducts] = useState(STYLE_DEFAULTS.luxury)
  const [products, setProducts] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)  // id of selected slot
  const [loadingSlot, setLoadingSlot] = useState(null)    // slot being loaded
  const [ready, setReady] = useState(false)

  // Load product catalog
  useEffect(() => {
    fetchProducts().then(setProducts)
  }, [])

  // ── Init Three.js (once) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return
    let mounted = true
    let animId

    async function init() {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

      if (!mounted) return

      const canvas = canvasRef.current
      const W = canvas.clientWidth
      const H = canvas.clientHeight

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(W, H)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.88

      // Scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#e8e4de')

      // Camera
      const camera = new THREE.PerspectiveCamera(62, W / H, 0.05, 30)
      camera.position.set(0.3, 1.5, ROOM.D / 2 - 0.1)
      camera.lookAt(-0.3, 0.7, -0.5)

      // Controls
      const controls = new OrbitControls(camera, canvas)
      controls.target.set(-0.3, 0.7, -0.5)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.minPolarAngle = 0.3
      controls.maxPolarAngle = Math.PI / 2 - 0.05
      controls.minAzimuthAngle = -Math.PI / 2
      controls.maxAzimuthAngle = Math.PI / 2
      controls.minDistance = 0.8
      controls.maxDistance = ROOM.D - 0.3

      // Lighting
      const ambient = new THREE.AmbientLight(0xfff8f2, 0.65)
      scene.add(ambient)
      const sun = new THREE.DirectionalLight(0xfffaf0, 1.1)
      sun.position.set(2, 5, 3)
      sun.castShadow = true
      sun.shadow.mapSize.set(1024, 1024)
      sun.shadow.camera.near = 0.5
      sun.shadow.camera.far = 15
      scene.add(sun)
      const fill = new THREE.DirectionalLight(0xf0f8ff, 0.35)
      fill.position.set(-2, 3, -2)
      scene.add(fill)
      // Soft ceiling light — no glare hotspot
      const ceilLight = new THREE.PointLight(0xfff5e8, 0.5, 6.0)
      ceilLight.position.set(0, ROOM.H - 0.1, 0)
      scene.add(ceilLight)

      // ── Tile texture helper ──────────────────────────────────────────────
      function makeTile(tileW, tileH, color, groutColor = '#c8c4bc', variation = 0) {
        const PX = 128
        const cvs = document.createElement('canvas')
        cvs.width = PX; cvs.height = PX
        const ctx = cvs.getContext('2d')
        ctx.fillStyle = color
        ctx.fillRect(0, 0, PX, PX)
        if (variation > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.03)'
          for (let i = 0; i < 6; i++) {
            const x = Math.random() * PX, y = Math.random() * PX
            ctx.fillRect(x, y, Math.random() * 20 + 5, Math.random() * 20 + 5)
          }
        }
        ctx.strokeStyle = groutColor
        ctx.lineWidth = 2.5
        ctx.strokeRect(1.5, 1.5, PX - 3, PX - 3)
        const tex = new THREE.CanvasTexture(cvs)
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(ROOM.W / tileW, ROOM.H / tileH)
        return tex
      }

      const roomColors = STYLE_ROOM[style] || STYLE_ROOM.minimalist

      // ── Room geometry ───────────────────────────────────────────────────
      // Floor
      const floorMat = new THREE.MeshStandardMaterial({
        map: makeTile(0.6, 0.6, roomColors.floor, '#b8b4ac', 1),
        roughness: roomColors.floorRoughness,
        metalness: 0.02,
      })
      floorMat.map.repeat.set(ROOM.W / 0.6, ROOM.D / 0.6)
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.W, ROOM.D), floorMat)
      floor.rotation.x = -Math.PI / 2
      floor.receiveShadow = true
      scene.add(floor)
      floorMatRef.current = floorMat

      // Ceiling
      const ceilMat = new THREE.MeshStandardMaterial({ color: '#f8f6f2', roughness: 0.9 })
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.W, ROOM.D), ceilMat)
      ceil.rotation.x = Math.PI / 2
      ceil.position.y = ROOM.H
      scene.add(ceil)

      // Walls
      const wallMat = () => new THREE.MeshStandardMaterial({
        map: makeTile(0.3, 0.6, roomColors.wall, '#ccc8c0', 0),
        roughness: roomColors.wallRoughness,
        metalness: 0.03,
      })
      const wallMats = []

      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.W, ROOM.H), wallMat())
      backWall.position.set(0, ROOM.H / 2, -ROOM.D / 2)
      backWall.receiveShadow = true
      scene.add(backWall)
      wallMats.push(backWall.material)

      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.D, ROOM.H), wallMat())
      leftWall.rotation.y = Math.PI / 2
      leftWall.position.set(-ROOM.W / 2, ROOM.H / 2, 0)
      leftWall.receiveShadow = true
      scene.add(leftWall)
      wallMats.push(leftWall.material)

      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.D, ROOM.H), wallMat())
      rightWall.rotation.y = -Math.PI / 2
      rightWall.position.set(ROOM.W / 2, ROOM.H / 2, 0)
      rightWall.receiveShadow = true
      scene.add(rightWall)
      wallMats.push(rightWall.material)

      wallMatsRef.current = wallMats

      // Vanity counter (back right)
      const counterMat = new THREE.MeshStandardMaterial({ color: '#e0dbd0', roughness: 0.3 })
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.48), counterMat)
      counter.position.set(ROOM.W / 2 - 0.52, 0.90, -ROOM.D / 2 + 0.25)
      counter.castShadow = true; counter.receiveShadow = true
      scene.add(counter)
      const counterBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.90, 0.48), counterMat)
      counterBase.position.set(ROOM.W / 2 - 0.52, 0.45, -ROOM.D / 2 + 0.25)
      counterBase.castShadow = true; counterBase.receiveShadow = true
      scene.add(counterBase)

      // Mirror placeholder above counter
      const mirrorMat = new THREE.MeshStandardMaterial({ color: '#d0d8de', metalness: 0.08, roughness: 0.30 })
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.03), mirrorMat)
      mirror.position.set(ROOM.W / 2 - 0.52, 1.55, -ROOM.D / 2 + 0.03)
      scene.add(mirror)

      // Window (frosted panel on left wall)
      const windowMat = new THREE.MeshStandardMaterial({ color: '#d8eeff', roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.55 })
      const window_ = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), windowMat)
      window_.rotation.y = Math.PI / 2
      window_.position.set(-ROOM.W / 2 + 0.01, 1.45, 0.6)
      scene.add(window_)

      // Store engine
      engineRef.current = { THREE, GLTFLoader, scene, camera, renderer, controls }

      // Resize handler
      function onResize() {
        const W2 = canvas.clientWidth, H2 = canvas.clientHeight
        renderer.setSize(W2, H2)
        camera.aspect = W2 / H2
        camera.updateProjectionMatrix()
      }
      window.addEventListener('resize', onResize)

      // Animation
      function animate() {
        if (!mounted) return
        animId = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      if (mounted) setReady(true)
    }

    init().catch(console.error)

    return () => {
      mounted = false
      if (animId) cancelAnimationFrame(animId)
      if (engineRef.current?.renderer) {
        engineRef.current.renderer.dispose()
        engineRef.current = null
      }
    }
  }, []) // only once

  // ── Update room colors when style changes ────────────────────────────────
  useEffect(() => {
    if (!engineRef.current) return
    const { THREE } = engineRef.current
    const rc = STYLE_ROOM[style] || STYLE_ROOM.minimalist

    // Update wall materials
    wallMatsRef.current.forEach(mat => {
      if (mat.map) { mat.map.needsUpdate = true }
      mat.roughness = rc.wallRoughness
      mat.color.set(rc.wall)
      mat.needsUpdate = true
    })
    // Update floor
    if (floorMatRef.current) {
      floorMatRef.current.roughness = rc.floorRoughness
      floorMatRef.current.color.set(rc.floor)
      floorMatRef.current.needsUpdate = true
    }
  }, [style])

  // ── Load a GLB model into a slot ─────────────────────────────────────────
  async function loadModel(slot, productId) {
    const eng = engineRef.current
    if (!eng) return
    const { THREE, GLTFLoader, scene } = eng

    // Find product
    const product = products.find(p => p.id === productId)
    if (!product?.glbUrl) return

    setLoadingSlot(slot.id)

    // Remove old group
    const oldGroup = loadedGroupsRef.current.get(slot.id)
    if (oldGroup) {
      scene.remove(oldGroup)
      oldGroup.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose()
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach(m => m?.dispose())
        }
      })
      // Remove from mesh→slot map
      oldGroup.traverse(child => {
        if (child.isMesh) meshToSlotRef.current.delete(child.uuid)
      })
    }

    try {
      const loader = new GLTFLoader()
      const gltf = await new Promise((res, rej) => loader.load(product.glbUrl, res, undefined, rej))
      const group = gltf.scene

      // If slot says isolate=true, hide all meshes except the largest one by volume
      if (slot.isolate) {
        let biggestMesh = null
        let biggestVol = -1
        group.traverse(child => {
          if (!child.isMesh) return
          const b = new THREE.Box3().setFromObject(child)
          const s = new THREE.Vector3(); b.getSize(s)
          const vol = s.x * s.y * s.z
          if (vol > biggestVol) { biggestVol = vol; biggestMesh = child }
        })
        group.traverse(child => {
          if (child.isMesh && child !== biggestMesh) child.visible = false
        })
      }

      // Apply rotation first so bounding box is correct for the final orientation
      group.rotation.set(...slot.rot)

      // Measure after rotation
      const box = new THREE.Box3().setFromObject(group)
      const size = new THREE.Vector3()
      box.getSize(size)

      // Scale so the longest horizontal dimension matches targetSize
      const horizDim = Math.max(size.x, size.z)
      const scaleFactor = slot.targetSize / (horizDim > 0.01 ? horizDim : Math.max(size.x, size.y, size.z))
      group.scale.setScalar(scaleFactor)

      // Re-measure after scaling, sit on floor
      const box2 = new THREE.Box3().setFromObject(group)
      const center = new THREE.Vector3()
      box2.getCenter(center)
      const minY = box2.min.y
      group.position.set(
        slot.pos[0] - center.x,
        slot.pos[1] - minY,
        slot.pos[2] - center.z
      )

      // Enable shadows + mark meshes for raycasting
      group.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          child.userData.slotId = slot.id
          meshToSlotRef.current.set(child.uuid, slot.id)
        }
      })

      scene.add(group)
      loadedGroupsRef.current.set(slot.id, group)
    } catch (err) {
      console.warn(`[studio] Failed to load ${product.glbUrl}:`, err.message)
    } finally {
      setLoadingSlot(null)
    }
  }

  // ── Load all products when ready or slotProducts changes ─────────────────
  useEffect(() => {
    if (!ready || products.length === 0) return
    SLOTS.forEach(slot => {
      const productId = slotProducts[slot.id]
      if (productId) loadModel(slot, productId)
    })
  }, [ready, products]) // initial load

  // ── Rotate model in scene by 90° around Y ────────────────────────────────
  function rotateSlot(slotId) {
    const group = loadedGroupsRef.current.get(slotId)
    if (group) group.rotation.y += Math.PI / 2
  }

  // ── Swap a single product ────────────────────────────────────────────────
  async function swapProduct(slotId, newProductId) {
    setSlotProducts(prev => ({ ...prev, [slotId]: newProductId }))
    const slot = SLOTS.find(s => s.id === slotId)
    if (slot) await loadModel(slot, newProductId)
    setSelectedSlot(null)
  }

  // ── Change style: update room colors + reload default products ───────────
  function changeStyle(newStyle) {
    setStyle(newStyle)
    const defaults = STYLE_DEFAULTS[newStyle] || {}
    setSlotProducts(defaults)
    if (ready && products.length > 0) {
      SLOTS.forEach(slot => {
        const productId = defaults[slot.id]
        if (productId) loadModel(slot, productId)
      })
    }
    setSelectedSlot(null)
  }

  // ── Click / tap detection on canvas ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let downPos = null

    function onPointerDown(e) {
      downPos = { x: e.clientX || e.touches?.[0]?.clientX, y: e.clientY || e.touches?.[0]?.clientY }
    }

    function onPointerUp(e) {
      if (!downPos || !engineRef.current) return
      const upX = e.clientX || e.changedTouches?.[0]?.clientX
      const upY = e.clientY || e.changedTouches?.[0]?.clientY
      const moved = Math.hypot(upX - downPos.x, upY - downPos.y)
      if (moved > 8) return // dragging, not tapping

      const { THREE, scene, camera } = engineRef.current
      const rect = canvas.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((upX - rect.left) / rect.width) * 2 - 1,
        -((upY - rect.top) / rect.height) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      // Only intersect loaded product meshes
      const meshes = []
      loadedGroupsRef.current.forEach(group => {
        group.traverse(child => { if (child.isMesh) meshes.push(child) })
      })
      const hits = raycaster.intersectObjects(meshes, false)

      if (hits.length > 0) {
        const slotId = meshToSlotRef.current.get(hits[0].object.uuid)
        if (slotId) setSelectedSlot(prev => prev === slotId ? null : slotId)
      } else {
        setSelectedSlot(null)
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  // ── Derived: alternatives for selected slot ───────────────────────────────
  const selectedSlotDef = SLOTS.find(s => s.id === selectedSlot)
  const alternatives = selectedSlotDef
    ? products.filter(p => p.category === selectedSlotDef.category)
    : []
  const currentProductId = selectedSlot ? slotProducts[selectedSlot] : null
  const currentProduct = products.find(p => p.id === currentProductId)

  return (
    <>
      <Head>
        <title>设计你的浴室 — AR 家居</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="flex flex-col bg-gray-900" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-900">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white text-sm">←</button>
          <p className="text-white font-semibold text-sm">设计你的浴室</p>
          <div className="w-8" />
        </div>

        {/* Style pills */}
        <div className="flex-shrink-0 flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar" style={{paddingTop:4}}>
          {STYLES.map(s => (
            <button key={s.id} onClick={() => changeStyle(s.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                ${style === s.id ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}>
              <span>{s.emoji}</span><span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Three.js canvas */}
        <div className="relative flex-shrink-0" style={{ height: '52vw', minHeight: 240, maxHeight: 360 }}>
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Loading overlay per slot */}
          {loadingSlot && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="bg-black/70 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2">
                <span className="animate-spin inline-block">⏳</span>
                加载中...
              </div>
            </div>
          )}

          {/* Tap hint */}
          {!selectedSlot && ready && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap backdrop-blur">
              点击产品可更换款式
            </div>
          )}
        </div>

        {/* Bottom panel */}
        <div className="flex-1 bg-white rounded-t-3xl overflow-y-auto">
          {selectedSlot && selectedSlotDef ? (
            /* ── Swap panel ── */
            <div className="px-4 pt-5 pb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">正在更换</p>
                  <h3 className="font-bold text-base">{selectedSlotDef.label}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => rotateSlot(selectedSlot)}
                    className="h-8 px-3 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-medium gap-1">
                    ↻ 旋转
                  </button>
                  <button onClick={() => setSelectedSlot(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm">✕</button>
                </div>
              </div>

              {alternatives.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {alternatives.map(p => {
                    const isCurrent = p.id === currentProductId
                    const hasModel = !!p.glbUrl
                    return (
                      <button key={p.id} onClick={() => hasModel && swapProduct(selectedSlot, p.id)}
                        disabled={!hasModel || loadingSlot === selectedSlot}
                        className={`relative rounded-2xl overflow-hidden border-2 text-left transition-all active:scale-95
                          ${isCurrent ? 'border-gray-900' : 'border-gray-100'}
                          ${!hasModel ? 'opacity-50' : ''}`}>
                        <div className="aspect-square bg-gray-100 relative">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                          {isCurrent && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                          {!hasModel && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                              <span className="text-xs text-gray-400">3D 即将上架</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-white">
                          <p className="text-xs text-gray-400">{p.brand}</p>
                          <p className="text-sm font-semibold leading-tight">{p.name}</p>
                          <p className="text-sm font-bold mt-1">{p.price}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">此分类暂无其他产品</p>
              )}

              {/* View in AR */}
              {currentProduct?.glbUrl && (
                <Link href={`/product/${currentProduct.id}`}
                  className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-700">
                  📱 在我家 AR 预览
                </Link>
              )}
            </div>
          ) : (
            /* ── Default: slot cards ── */
            <div className="px-4 pt-5 pb-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                当前产品 — 点击可更换
              </p>
              <div className="space-y-2">
                {SLOTS.map(slot => {
                  const p = products.find(pr => pr.id === slotProducts[slot.id])
                  return (
                    <button key={slot.id} onClick={() => setSelectedSlot(slot.id)}
                      className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl p-3 active:bg-gray-100 transition-colors">
                      <div className="w-14 h-14 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                        {p?.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs text-gray-400">{slot.label}</p>
                        <p className="text-sm font-semibold">{p?.name || '— 未配置 —'}</p>
                        <p className="text-xs font-bold text-gray-700">{p?.price || ''}</p>
                      </div>
                      <div className="text-gray-300 text-lg">›</div>
                    </button>
                  )
                })}
              </div>

              {/* Buy all CTA */}
              <div className="mt-5 bg-gray-900 rounded-2xl px-5 py-4 flex justify-between items-center">
                <div>
                  <p className="text-white/60 text-xs">全套选购</p>
                  <p className="text-white font-bold">
                    {products.filter(p => Object.values(slotProducts).includes(p.id)).length} 件产品
                  </p>
                </div>
                <button className="bg-white text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm">加入购物车</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}
