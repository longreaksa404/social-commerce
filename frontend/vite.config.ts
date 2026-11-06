import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** The built index.html asks for the fonts every page draws first (Khmer,
 * Latin, the "Oak Order" name) at once, beside the JS. Otherwise they're
 * found only once the CSS has loaded and text is on screen, so the first
 * paint is in a system font and jumps when they arrive (2026-11-06: about
 * a second later on a slow phone). */
function preloadFonts(): Plugin {
  const FIRST = /(noto-sans-khmer-khmer-wght-normal|inter-latin-wght-normal|oak-wordmark)-[\w-]+\.woff2$/
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml(html, context) {
      const fonts = Object.keys(context.bundle ?? {}).filter((file) => FIRST.test(file))
      return {
        html,
        tags: fonts.map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' },
          injectTo: 'head' as const,
        })),
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts()],
  // Local dev uses the single .env at the repo root (see .env.example).
  envDir: '..',
  server: {
    // File-change events don't cross a Windows-drive mount into the
    // devcontainer, so poll instead (set in devcontainer.json).
    watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
  },
})
