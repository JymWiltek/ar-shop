import fs from 'fs'
import path from 'path'
import staticProducts from './products'

export function getAllProducts() {
  const catalogPath = path.join(process.cwd(), 'data', 'products-catalog.json')
  let catalog = []
  if (fs.existsSync(catalogPath)) {
    try { catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) }
    catch {}
  }
  return [...staticProducts, ...catalog]
}
