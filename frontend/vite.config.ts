import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve paths in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

try {
  const rootDir = path.resolve(__dirname, '..')
  const srcIconPath = path.resolve(rootDir, 'cat1.png')
  const publicDir = path.resolve(__dirname, 'public')
  const destIconPath = path.resolve(publicDir, 'cat1.png')

  if (fs.existsSync(srcIconPath)) {
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }
    fs.copyFileSync(srcIconPath, destIconPath)
    console.log('[Vite Config] Successfully copied cat1.png to public/cat1.png')
  } else {
    console.warn('[Vite Config] Warning: cat1.png not found at', srcIconPath)
  }
} catch (err) {
  console.error('[Vite Config] Error copying cat1.png:', err)
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte({
    preprocess: vitePreprocess()
  })],
})
