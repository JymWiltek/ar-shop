import fs from 'fs'
import path from 'path'

// Catalog file: data/products-catalog.json (dynamically added products)
const CATALOG_PATH = path.join(process.cwd(), 'data', 'products-catalog.json')
const MODELS_DIR = path.join(process.cwd(), 'public', 'models')

function loadCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) return []
  try { return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) }
  catch { return [] }
}

function saveCatalog(products) {
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(products, null, 2), 'utf8')
}

// Download a remote URL and save to local path
async function downloadFile(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destPath, buffer)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, brand, price, category, description, glbUrl, thumbnailUrl } = req.body
  if (!name || !glbUrl) return res.status(400).json({ error: 'name and glbUrl are required' })

  try {
    // Generate a slug-style ID
    const slug = name
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .substring(0, 40)
    const ts = Date.now().toString(36)
    const id = `${category || 'product'}-${slug}-${ts}`

    // Download GLB to /public/models/
    const filename = `${id}.glb`
    const localPath = path.join(MODELS_DIR, filename)
    await downloadFile(glbUrl, localPath)

    const product = {
      id,
      name,
      brand: brand || '',
      price: price || '',
      category: category || 'accessory',
      description: description || '',
      image: thumbnailUrl || '',
      glbUrl: `/models/${filename}`,
      usdzUrl: null,
      inStock: true,
      tags: [category, name].filter(Boolean),
      _source: 'vendor',
      _createdAt: new Date().toISOString(),
    }

    const catalog = loadCatalog()
    catalog.push(product)
    saveCatalog(catalog)

    res.status(200).json({ id, localPath: `/models/${filename}` })
  } catch (err) {
    console.error('[save-product]', err.message)
    res.status(500).json({ error: err.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }
