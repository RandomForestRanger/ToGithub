import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { existsSync, copyFileSync } from 'fs'

export default defineConfig({
  base: '/ToGithub/Endgame_Trainer/',
  plugins: [
    react(),
    {
      // Copy single-threaded stockfish.js from node_modules into public/ at build/dev time.
      // Alternative: run manually — cp node_modules/stockfish/src/stockfish.js public/
      // We use single-threaded (not multithreaded WASM) so Netlify needs no
      // Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy headers.
      name: 'copy-stockfish',
      buildStart() {
        const candidates = [
          resolve('node_modules/stockfish/src/stockfish.js'),
          resolve('node_modules/stockfish/stockfish.js'),
        ]
        const dest = resolve('public/stockfish.js')
        if (!existsSync(dest)) {
          for (const src of candidates) {
            if (existsSync(src)) {
              copyFileSync(src, dest)
              console.log('[copy-stockfish] Copied stockfish.js → public/')
              break
            }
          }
          if (!existsSync(dest)) {
            console.warn('[copy-stockfish] Could not find stockfish.js in node_modules. Run: cp node_modules/stockfish/src/stockfish.js public/')
          }
        }
      },
    },
  ],
})
